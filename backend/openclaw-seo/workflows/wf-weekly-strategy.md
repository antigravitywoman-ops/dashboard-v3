---
name: wf-weekly-strategy
description: "SOP for generating the full 14-sheet SEO strategy report for a company. Injected as skill context when seo-orchestrator processes a generate-report task. Produces dated report folder with all Markdown sheets and Excel deliverable."
workflow_type: generate-report
injected_by: seo-orchestrator
---

# Workflow SOP: Full Strategy Report Generation

> **How this file is used**: This is NOT a trigger-based automation script. It is a structured SOP (Standard Operating Procedure) injected as skill context by the `seo-orchestrator` when it processes a `generate-report` task. The orchestrator reads this file and follows the steps below across multiple heartbeat cycles. Each step that involves a separate agent creates a new task in the queue and waits for the next heartbeat to route it.

---

## Report Cadence

This workflow runs on a monthly or quarterly schedule per company (defined in `runtime/companies.json` under `report_cadence`). It may also be triggered manually via a `generate-report` task with `force: true`.

Typical run: **monthly**, producing a snapshot of SEO posture, competitive landscape, and 12-week forward plan.

---

## Output: Dated Report Folder

Every execution of this workflow creates a unique, permanent dated folder. Nothing is overwritten.

```
companies/<slug>/reports/<YYYY-WNN>/
├── sheets/
│   ├── 00-digital-presence-baseline.md
│   ├── 01-executive-summary.md
│   ├── 02-gap-analysis.md
│   ├── 03-competitor-analysis.md
│   ├── 04-twelve-week-plan.md
│   ├── 05-keyword-research.md
│   ├── 06-location-pages.md
│   ├── 07-citations-backlinks.md
│   ├── 08-youtube-strategy.md
│   ├── 09-reddit-quora.md
│   ├── 10-review-strategy.md
│   ├── 11-schema-markup.md
│   ├── 12-weekly-tasks.md
│   └── 13-kpis-metrics.md
├── validation/
│   ├── attempt-1-<timestamp>.json
│   ├── attempt-2-<timestamp>.json     (if needed)
│   └── attempt-3-<timestamp>.json     (if needed)
└── SEO_Strategy_<slug>_<YYYY-WNN>.xlsx
```

**Folder naming convention**:
- `<YYYY-WNN>` = ISO year + week number (e.g., `2026-W12`)
- For monthly cadence, use `<YYYY-MM>` (e.g., `2026-03`)
- The folder is created in Step 2 and is never deleted, even if the report fails validation

After a successful Excel generation, `companies/<slug>/reports/latest` is updated to point to the newest completed report folder (as a text file containing the folder name, not a symlink, for portability).

---

## Task State Machine

This workflow spans multiple heartbeat cycles. The orchestrator creates tasks, routes them to agents, and waits for completion before advancing. Each step below maps to one or more task queue entries.

```
[Heartbeat N]   seo-orchestrator wakes → checks report schedule → creates task: generate-report (pending)
[Heartbeat N+1] orchestrator picks up generate-report → runs Steps 0–4 directly → creates task: sheet-generation (pending) for research-analyst
[Heartbeat N+2] orchestrator routes sheet-generation to research-analyst → agent runs Steps 5–6 → marks task completed
[Heartbeat N+3] orchestrator sees sheet-generation completed → runs Step 7 (structural validation) → creates task: sheet-fix if failed, or semantic-audit if passed
[Heartbeat N+4] orchestrator routes semantic-audit to semantic-auditor → agent runs Step 8 (semantic validation)
[Heartbeat N+5] semantic-auditor completes → orchestrator creates task: sheet-repair if failed, or excel-generation if passed
[Heartbeat N+6] orchestrator routes to excel-porter or research-analyst depending on semantic result
[Heartbeat N+7] excel-porter completes → orchestrator runs Step 10 (housekeeping) → marks cycle complete
```

---

## Step 0 — Load Company Registry

**Executor**: `seo-orchestrator`
**Reads**: `runtime/companies.json`

Extract `active` array. All subsequent steps execute once per company slug. Never hardcode a company slug.

If a specific `company` field exists in the task context, run only for that company. Otherwise, run for all active companies sequentially.

---

## Step 1 — Auth Preflight

**Executor**: `seo-orchestrator`
**Skill**: `auth-manager` → `check-all`

For each company, verify credential health against `companies/<slug>/.env`.

| Credential State | Action |
| :--- | :--- |
| All credentials valid | Proceed with full data pull |
| Google (GA4/GSC) missing | Proceed; annotate context with `missing_credentials: ["ga4", "gsc"]` so analyst uses `[Data Missing]` annotations |
| Serper missing | Proceed; annotate context with `missing_credentials: ["serper"]` |
| Credentials expired but refreshable | Run `auth-manager` with `refresh: google` first |
| All credentials missing | Proceed; report will be fully annotated with inferred data |

Log credential status to `companies/<slug>/memory/episodic.md`.

---

## Step 2 — Create Dated Report Folder

**Executor**: `seo-orchestrator`
**Action**: Direct file system operation (no skill needed)

Determine the report period key:
- Read `companies/<slug>/memory/episodic.md` to find the most recent report folder
- Generate the new period key: `<YYYY-WNN>` for weekly cadence, `<YYYY-MM>` for monthly, `<YYYY-QN>` for quarterly
- Create the folder structure:

```
companies/<slug>/reports/<period-key>/
companies/<slug>/reports/<period-key>/sheets/
companies/<slug>/reports/<period-key>/validation/
```

Write a `manifest.json` to the report folder:
```json
{
  "company": "<slug>",
  "period": "<period-key>",
  "started_at": "<ISO timestamp>",
  "status": "in-progress",
  "sheets_expected": 14,
  "sheets_completed": 0,
  "validation_attempts": 0,
  "excel_path": null,
  "completed_at": null
}
```

The `manifest.json` is the single source of truth for report status. All agents read and update it as the report progresses.

---

## Step 3 — Performance Snapshot

**Executor**: `seo-orchestrator`
**Skill**: `snapshot-generator`

Pull the latest performance data. Output written to TWO locations:
1. `companies/<slug>/technical/current-snapshot.md` (always-overwritten live view)
2. `companies/<slug>/technical/snapshots/<period-key>-snapshot.json` (permanent archive)

If the snapshot already exists for this period key (re-run scenario), skip and use the existing snapshot.

| Scenario | Action |
| :--- | :--- |
| GA4/GSC credentials present | Pull live data; write real numbers |
| GA4/GSC credentials missing | Write snapshot with `[Data Missing]` annotations; continue |
| Snapshot write fails entirely | Log to episodic.md; abort this company's cycle for now; try next cycle |

---

## Step 4 — Competitor Intelligence Mining

**Executor**: `seo-orchestrator`
**Skill**: `serper-miner`

Read tracked keywords from `companies/<slug>/about/keywords.md`. Run serper-miner for the **top 5 primary tracked keywords**.

Output: `companies/<slug>/memory/competitors/serp-<keyword-slug>-<period-key>.json` (one file per keyword)

If `SERPER_API_KEY` is missing: skip this step; pass `missing_credentials: ["serper"]` in the context for the research-analyst.

---

## Step 5 — Sheet Generation (Delegated to Research Analyst)

**Executor**: `research-analyst` (routed via task queue)
**Persona**: `agents/research-analyst.md`
**Skills injected**: `serper-miner`, `sheet-validator`, `references/sheet-metrics.md`

> Note: `gsc-fetch` and `ga4-fetch` are stub skills — they return hardcoded data. Do not inject them here. The research-analyst reads GSC/GA4 data from `technical/current-snapshot.md` (populated by data-intelligence). If snapshot data is absent, use `[Data Missing: No GSC Key]` / `[Data Missing: No GA4 Key]` annotations. See `references/task-statuses.md` for the stub skill policy.

**Task context passed to research-analyst**:
```json
{
  "company": "<slug>",
  "report_period": "<period-key>",
  "report_folder": "companies/<slug>/reports/<period-key>/",
  "sheets_output_path": "companies/<slug>/reports/<period-key>/sheets/",
  "snapshot_path": "companies/<slug>/technical/snapshots/<period-key>-snapshot.json",
  "serp_data_path": "companies/<slug>/memory/competitors/",
  "missing_credentials": ["ga4"],
  "is_initial_report": false
}
```

**Research analyst executes**:

1. **Read all context sources**:
   - `companies/<slug>/about/profile.md`
   - `companies/<slug>/about/goals.md`
   - `companies/<slug>/about/keywords.md`
   - `companies/<slug>/about/competitors.md`
   - `companies/<slug>/memory/business-goals.md`
   - The snapshot JSON at `context.snapshot_path`
   - All SERP JSON files in `context.serp_data_path`
   - `references/sheet-metrics.md` (full read — this is the column definition source of truth)

2. **Generate all 14 sheets in dependency order** (see `agents/research-analyst.md` for the exact generation sequence):
   - Write each sheet to `context.sheets_output_path` (the dated report folder, NOT `memory/sheets/`)
   - Update `manifest.json` `sheets_completed` counter after each sheet

3. **Self-validate**: Run `sheet-validator` against the dated sheets folder
   - If CRITICAL findings: self-correct up to 3 times
   - Preserve passing sheets; regenerate only failing sheets

4. **Report back**: Update the task status with the validation result:
   - `status: "completed"`, `result: "validation-passed"` → orchestrator proceeds to Step 7
   - `status: "completed"`, `result: "validation-failed"`, `findings_path: "..."` → orchestrator runs retry loop

---

## Step 6 — Snapshot Archive

**Executor**: `seo-orchestrator` (runs concurrently after Step 3, before Step 7)

Archive the snapshot for trend analysis:
- `companies/<slug>/technical/monthly-snapshots/` → copy if monthly cadence
- `companies/<slug>/technical/quarterly-snapshots/` → copy if quarterly cadence

This ensures historical performance data is available for delta comparisons in future report cycles.

---

## Step 7 — Orchestrator Validation Gate

**Executor**: `seo-orchestrator`
**Skill**: `sheet-validator`

Run independently from the analyst's self-check. The orchestrator is the **final quality gate**.

**Validation target**: `companies/<slug>/reports/<period-key>/sheets/`

**Retry Protocol** (see also `agents/seo-orchestrator.md`):

```
Attempt 1:
  → Run sheet-validator
  → If PASS: proceed to Step 8
  → If FAIL: create sheet-fix task for research-analyst with findings
  → Write: companies/<slug>/reports/<period-key>/validation/attempt-1-<timestamp>.json
  → Update manifest.json: validation_attempts: 1

Attempt 2 (if Attempt 1 failed):
  → Wait for sheet-fix task to complete (next heartbeat cycle)
  → Run sheet-validator again
  → If PASS: proceed to Step 8
  → If FAIL: create sheet-fix task one final time
  → Write: companies/<slug>/reports/<period-key>/validation/attempt-2-<timestamp>.json
  → Update manifest.json: validation_attempts: 2

Attempt 3 (if Attempt 2 failed):
  → Wait for sheet-fix task to complete
  → Run sheet-validator final time
  → If PASS: proceed to Step 8
  → If FAIL: ESCALATE — do NOT generate Excel
  → Write: companies/<slug>/reports/<period-key>/validation/attempt-3-<timestamp>.json
  → Update manifest.json: status: "blocked-validation-failed"
  → Create human-review task with full findings and report path
  → Append to companies/<slug>/memory/episodic.md: blocked status, timestamp, report path
```

**Sheet-fix task context** (passed back to research-analyst):
```json
{
  "company": "<slug>",
  "report_folder": "companies/<slug>/reports/<period-key>/",
  "sheets_output_path": "companies/<slug>/reports/<period-key>/sheets/",
  "validation_findings": { "...full JSON from sheet-validator..." },
  "failing_sheets": ["03-competitor-analysis.md", "05-keyword-research.md"],
  "instruction": "Fix ONLY the failing sheets listed above. Do NOT just patch the structural errors programmatically. You must deepen the semantic quality of the research, engaging in raw analytical reasoning before generating the final fixed table. Preserve all passing sheets exactly.",
  "iteration": 2
}
```

---

## Step 8 — Semantic Auditor Gate

**Executor**: `semantic-auditor` (routed via task queue)
**Trigger condition**: `sheet-validator` (Step 7) returned `overall_pass: true`

**Task context passed to semantic-auditor**:
```json
{
  "company": "<slug>",
  "report_folder": "companies/<slug>/reports/<period-key>/",
  "sheets_input_path": "companies/<slug>/reports/<period-key>/sheets/"
}
```

The `semantic-auditor` reads the 14 sheets and checks for logical coherence, feasibility, and alignment with `business-goals.md`.

**Output**:
- If PASS: update `manifest.json` with `semantic_pass: true`, proceed to Step 9 (Excel Generation).
- If FAIL: update `manifest.json` with `semantic_pass: false` and create `sheet-repair` task for `research-analyst` containing the `semantic_feedback` paragraph. Escalate to human review if failing 3 consecutive semantic audits.

---

## Step 9 — Excel Generation

**Executor**: `excel-porter` (routed via task queue)
**Trigger condition**: `semantic-auditor` returned `semantic_pass: true`

**Task context passed to excel-porter**:
```json
{
  "company": "<slug>",
  "report_folder": "companies/<slug>/reports/<period-key>/",
  "sheets_input_path": "companies/<slug>/reports/<period-key>/sheets/",
  "excel_output_path": "companies/<slug>/reports/<period-key>/SEO_Strategy_<slug>_<period-key>.xlsx",
  "tab_mapping": {
    "00-digital-presence-baseline.md": "00 Baseline",
    "01-executive-summary.md": "01 Exec Summary",
    "02-gap-analysis.md": ["02A Internal Gaps", "02B Competitor Matrix"],
    "03-competitor-analysis.md": "03 Competitors",
    "04-twelve-week-plan.md": "04 12-Week Plan",
    "05-keyword-research.md": "05 Keywords",
    "06-location-pages.md": "06 Location Pages",
    "07-citations-backlinks.md": ["07A Citations", "07B Backlink Pipeline", "07C Assets"],
    "08-youtube-strategy.md": "08 YouTube",
    "09-reddit-quora.md": "09 Reddit Quora",
    "10-review-strategy.md": "10 Reviews",
    "11-schema-markup.md": "11 Schema",
    "12-weekly-tasks.md": "12 Weekly Tasks",
    "13-kpis-metrics.md": "13 KPIs"
  }
}
```

excel-porter reads from `sheets_input_path`, writes to `excel_output_path`, then marks the task completed.

After Excel is written, update `manifest.json`:
```json
{
  "status": "completed",
  "excel_path": "companies/<slug>/reports/<period-key>/SEO_Strategy_<slug>_<period-key>.xlsx",
  "completed_at": "<ISO timestamp>"
}
```

---

## Step 10 — Housekeeping and Notification

**Executor**: `seo-orchestrator`

1. **Update latest pointer**: Write `companies/<slug>/reports/latest.txt` with content `<period-key>` so any agent can quickly find the most recent completed report.

2. **Log to episodic**: Append to `companies/<slug>/memory/episodic.md`:
   ```
   [<ISO timestamp>] Report cycle completed: <period-key>
   - Excel: reports/<period-key>/SEO_Strategy_<slug>_<period-key>.xlsx
   - Sheets: 14 generated, validation passed on attempt <N>
   - Duration: <heartbeat count> cycles
   ```

3. **Archive old snapshots**: Run `backup-sweeper` on `companies/<slug>/technical/snapshots/` to compress files older than 90 days.

4. **Check for blocked companies**: If any company in this run was blocked (validation failure after 3 attempts), verify the `human-review` task exists in the queue with the report folder path.

5. **Update task queue**: Mark the original `generate-report` task as `status: "completed"`.

---

## Full Error Handling Reference

| Scenario | Which Step | Response |
| :--- | :--- | :--- |
| `companies.json` not found | Step 0 | Log error. Abort entire run. |
| Company has no `business-goals.md` | Step 5 | Halt report for that company. Create `company-onboard` task. Continue with next company. |
| Snapshot write fails | Step 3 | Log to episodic. Skip company this cycle. Try again next heartbeat. |
| Serper unavailable | Step 4 | Continue. Pass `missing_credentials: ["serper"]` to analyst. |
| Sheet generation stalls (in-progress >2 hours) | Step 5 | Orchestrator recovers it on next heartbeat. Resets to pending. |
| Validation PASS on Attempt 1 | Step 7 | No retry needed. Proceed directly to semantic-auditor. |
| Validation FAIL after 3 attempts | Step 7 | Escalate to human-review. No Excel generated. Report folder preserved with all validation logs. |
| Semantic Validation FAIL | Step 8 | Routes back to research-analyst with specific semantic feedback. Escalate to human-review if failing 3 attempts. |
| Excel porter fails (full workbook) | Step 9 | Retry one sheet at a time using `--sheet` flag. If still failing, log traceback to manifest.json and escalate. |
| Re-run for same period key | Any | Check if `manifest.json` exists for the period. If `status: completed`, skip (unless `force: true` in task context). |

---

## Reading This Workflow (Agent Instruction)

If you are the `seo-orchestrator` and you have loaded this workflow as skill context:

1. Identify your current position in the state machine by reading `manifest.json` in the target report folder
2. Execute only the next step that hasn't been completed yet
3. Do not re-execute completed steps
4. After completing your step, update `manifest.json` and return. The next heartbeat cycle will continue from where you left off.
5. If no `manifest.json` exists yet, you are at Step 0 — begin from the top.
