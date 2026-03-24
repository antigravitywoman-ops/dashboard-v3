---
name: wf-build-weekly-plan
description: "Builds the active weekly action plan every Sunday evening by reading WoW performance deltas, reviewing checklist statuses, and prioritizing high-ROI tasks within the correct 12-week phase. Output feeds the orchestrator queue on Monday morning."
trigger: cron(0 22 * * 0)
---

# Workflow: Build Weekly Plan

Generates `companies/<slug>/plans/weekly/<YYYY-WNN>.md` by synthesizing past week performance data, outstanding checklist items, and the current 12-week phase. Tasks outside the current phase boundary are deferred, not queued.

---

## Step 0 --- Establish Phase Context (MANDATORY FIRST)

**Agent**: `seo-orchestrator`

Phase is not just a calendar number. It is determined by reconciling multiple signals. A company in operational week 5 that has not resolved critical technical issues is still functionally in Foundation — the calendar does not override reality.

### 0-A: Load Signals

Load these sources in order (each is a distinct signal, not a fallback):

| Signal | Source | What to extract |
|---|---|---|
| Calendar signal | `memory/sheets/04-twelve-week-plan.md` | Phase and week label for the current operational week |
| Health digest | `memory/context-digest.md` | Technical health, checklist completion %, open gap count (fastest path — load this first) |
| Technical health | `memory/sheets/00-digital-presence-baseline.md` (section 00-E) | Count of rows with Status = FAIL |
| Gap resolution | `memory/sheets/02-gap-analysis.md` | Count Foundation-tagged gaps still unresolved |
| KPI health | `memory/sheets/13-kpis-metrics.md` | LCP, crawl errors, schema coverage — current vs. target |
| Credential state | `companies/<slug>/about/missing-dependencies.md` | Which credential groups are still missing |
| Checklist state | `memory/sheets/00-digital-presence-baseline.md` (section 00-E — Technical Health) | Count rows with Status = FAIL; for HIGH priority items check completion against the [HIGH] tagged rows |
| On-page checklist | `memory/sheets/02-gap-analysis.md` — on-page tagged rows | Count HIGH priority on-page gaps still unresolved |
| Operational week | `memory/episodic.md` (ONBOARDING COMPLETE timestamp) | `floor((now - onboarding_date) / 7) + 1` |

If `memory/context-digest.md` exists, read it first — it summarizes most of the above in ~150 lines. Still spot-check the full sheets for signals not in the digest.

### 0-B: Compute Effective Phase

Start with the calendar phase from Sheet 04. Then apply downgrade conditions. Work top-down — apply the first matching downgrade.

**Foundation downgrade conditions** (any one = stay in Foundation):
- Technical checklist [HIGH] completion < 40%
- Crawl errors (from Sheet 13 KPI "Crawl Errors Count") still at FAIL with Current > 5
- No crawl audit file exists in `technical/audits/` (Step 0B handles this — treat as FAIL signal)
- LCP still FAIL (> 2.5s) AND no speed optimization task is in-progress or completed
- Missing H1 on homepage (from Sheet 00-E) still unresolved

**Growth downgrade conditions** (any one = stay in Growth, do not advance to Scale):
- On-page checklist [HIGH] completion < 40%
- More than 8 Foundation-phase Gap IDs still open in Sheet 02
- WordPress credentials still missing (no on-page publishing path exists)

**Scale unlock conditions** (ALL must be true before Scale tasks are queued):
- Operational week >= 7
- On-page checklist [HIGH] completion >= 60%
- At least one piece of content published live (not just drafted)

**Phase definitions and allowed task categories**:

| Phase | Allowed | Hard Locked |
|---|---|---|
| Foundation | Technical fixes, on-page drafts (crawl-verified URLs only), GBP profile updates, NAP citation verification | Link building outreach, guest post pitches, Reddit/Quora seeding, LinkedIn posts, content distribution |
| Growth | All Foundation + new blog posts, product page expansions, location pages, directory submissions | Link building outreach, guest post pitches, Reddit/Quora seeding, LinkedIn posts |
| Scale | All Growth + link building, Reddit/Quora, LinkedIn, Medium (ONLY if Scale unlock conditions met) | If unlock conditions not met: treat as Growth |
| Optimization | All channels. A/B testing, content refresh, schema expansion, performance review. | Nothing |

### 0-C: Write Phase Header

Write the resolved phase into the plan file header with full reasoning:

```yaml
phase: Foundation  # calendar says Growth (week 5) but downgraded: technical [HIGH] completion only 22%
operational_week: 5
calendar_phase: Growth
effective_phase: Foundation
downgrade_reason: "Technical checklist [HIGH] at 22% (threshold: 40%). 3 active FAIL signals in Sheet 13."
onpage_high_completion: 22%  # 4/18 HIGH items checked
technical_high_completion: 22%  # 2/9 HIGH items checked
open_foundation_gaps: 11  # of 20 Foundation-tagged gaps in Sheet 02
scale_unlock_status: "NOT MET — on-page completion 22% < 60%"
```


**Phase Advancement Detection**:

After writing the phase header, check whether this plan's `effective_phase` has advanced from the prior week:

1. List files in `companies/<slug>/plans/weekly/` sorted by name — take the most recent prior-week file
2. Read its `effective_phase` from frontmatter
3. If `this_week_effective_phase` is higher than `prior_week_effective_phase` (Foundation→Growth OR Growth→Scale):
   - Log to `memory/episodic.md`: `[PHASE-ADVANCE] <slug>: <old_phase> → <new_phase> as of <YYYY-WNN>. Newly eligible: <unlocked_categories>`
   - Create a `human-review` task (priority: normal):
     ```json
     {
       "type": "human-review",
       "priority": "normal",
       "title": "Phase advancement: <old_phase> → <new_phase> for <slug>",
       "context": {
         "reason": "All unlock conditions met. New phase tasks now eligible.",
         "newly_eligible": ["<list of newly allowed task categories>"],
         "action_required": "Acknowledge to allow Growth/Scale tasks in next weekly plan cycle."
       }
     }
     ```
   - Do NOT automatically queue Growth/Scale-only tasks until operator acknowledges the human-review task

4. If `effective_phase` is the same as or lower than the prior week: no advancement notification needed

> If no prior weekly plan file exists (first plan ever for this company), skip this check.

If effective phase differs from calendar phase, also log to `memory/episodic.md`:
`[WF-BUILD-WEEKLY-PLAN] Phase downgrade: calendar=Growth, effective=Foundation. Reason: <reason>`

---

## Step 0B --- Crawl Verification Gate

**Agent**: `seo-orchestrator`

### Gate Check

Before scheduling any on-page task that references a specific URL, run this gate:

1. List all files in `companies/<slug>/technical/audits/`
2. Find the most recent crawl file (JSON or MD, filename containing "crawl" or "audit")
3. Determine its age in days from the file's creation date

**Freshness tiers**:

| Age | Status | Action |
|---|---|---|
| < 7 days | FRESH | Full confidence. Schedule URL-specific tasks normally. |
| 7-30 days | STALE | Usable but add warning. Schedule tasks with `[CRAWL STALE - X days]` label. Queue a re-crawl task (low priority). |
| > 30 days | EXPIRED | Treat as no crawl. Do not schedule URL-specific tasks. Force re-crawl as first task. |
| No file found | MISSING | Same as EXPIRED. |

### Crawl File Validity Checks

Even if a crawl file exists and is fresh, validate it before trusting it:

- **Minimum URL count**: The crawl must contain at least 3 URLs total — count `HTTP_200` + `JS_ROUTE_ONLY` combined. A crawl with 1-2 entries captured only the homepage — treat as MISSING.
- **Status code presence**: Crawl file must include HTTP status codes per URL. If absent, treat as MISSING.
- **Domain match**: All URLs in the crawl must belong to the company's domain (from `about/profile.md`). Off-domain crawl files are corrupted — treat as MISSING.
- **File size**: A crawl file < 500 bytes is likely empty or errored — treat as MISSING.

### SPA Detection in Crawl Output

The `crawl-browser` skill automatically detects React/Vue/Angular SPAs where the server lacks a catch-all rewrite rule.
Check `crawl_meta` in the crawl JSON before scheduling any tasks:

```json
{
  "crawl_meta": {
    "spa_detected": true,
    "server_routing_broken": true,
    "summary": { "http_200": 1, "js_route_only": 7, "dead_route": 0 }
  },
  "critical_issues": [
    { "type": "SERVER_ROUTING_BROKEN", "severity": "CRITICAL", "priority": "critical",
      "message": "7 pages return HTTP 404 from server but render content via JS navigation.",
      "fix": "Netlify: _redirects → /* /index.html 200. Nginx: try_files $uri /index.html." }
  ]
}
```

**When `crawl_meta.server_routing_broken: true`**:

1. **Create a CRITICAL priority task immediately — before any other task is queued this cycle**:
   ```json
   { "type": "website-edit", "priority": "critical", "assigned_to": "HUMAN",
     "title": "Fix server-side catch-all routing — all sub-pages return HTTP 404 to Google",
     "context": { "fix_instructions": "<copy fix field from critical_issues>" } }
   ```
2. **JS_ROUTE_ONLY pages are content-valid**: their word counts, H1s, and page content were extracted via SPA simulation. Treat them as real pages for content analysis, meta description drafting, schema planning, and keyword mapping.
3. **JS_ROUTE_ONLY pages are publish-blocked**: any task that requires CMS publishing, meta injection, or schema injection on these URLs must be queued with `"status": "deferred"` and `"deferred_reason": "routing-fix-required"`. These pages cannot be indexed until the server catch-all is live.
4. **Auto-unblock rule**: when the routing-fix task is marked `completed`, scan for all tasks with `deferred_reason: routing-fix-required` for this company and reset them to `pending`.

### URL Hallucination Protection

Every on-page task that names a specific URL must pass all of these checks before entering the task queue:

1. **Crawl membership**: The URL must appear in the crawl file `pages[]` array. If not found: BLOCK the task. Add to Deferred section with note `[URL NOT IN CRAWL — verify page exists before scheduling]`.
2. **Domain ownership**: The URL's domain must match the company's primary domain in `about/profile.md`. External URLs are not on-page tasks.
3. **url_type check** (replaces the old "Status 200" rule — supports SPA sites):
   - `url_type: HTTP_200` → schedule content tasks normally
   - `url_type: JS_ROUTE_ONLY` → content analysis, meta drafting, schema planning OK; any CMS-publish task must be deferred with `deferred_reason: routing-fix-required`
   - `url_type: DEAD_ROUTE` → no content tasks; create a technical investigation task
   - `url_type: HTTP_3xx` → add a redirect audit task; do not schedule content tasks on the old URL
   - `url_type: ERROR` or absent → skip URL; log as unresolved technical issue
   - Legacy crawl files (no `url_type` field): fall back to HTTP status code — 200 = OK, 4xx/5xx = blocked
4. **Source citation required**: Every task object in `companies/<slug>/memory/tasks/queue.json` that targets a URL must include `"url_source": "crawl_audit"` (or `"sitemap"` or `"operator_provided"`). Tasks missing this field are rejected.
5. **Page identity consistency**: If two tasks in the same weekly plan target the same URL, their page descriptions must be consistent. Contradictory descriptions of the same URL indicate hallucination — flag for human review.
6. **No construction from patterns**: The URL must come from the crawl file as-is. Agents must not construct URLs by combining domain + keyword slug patterns (e.g., inferring `/hydraulic-press-tonnage-guide.html` because the keyword exists). Only URLs actually returned by the crawler are valid.

### Sitemap Cross-Check (if sitemap available)

After the crawl gate, optionally fetch `<site_url>/sitemap.xml` and compare:
- URLs in sitemap but not in crawl: flag as `[IN SITEMAP BUT NOT CRAWLED — possible crawl block or error]` — add a technical investigation task
- URLs in crawl but not in sitemap: flag as `[ORPHAN CANDIDATE — not in sitemap]` — note in technical checklist

### Write Crawl Gate Result to Plan Header

```yaml
crawl_verified: true
crawl_file: technical/audits/2026-03-14-onboarding-crawl.json
crawl_age_days: 2
crawl_status: FRESH
crawl_url_count: 9
crawl_validity: PASS  # or: FAIL - <reason>
sitemap_cross_check: 3 in sitemap not crawled, 1 orphan candidate
```

---

## Step 1 --- Load Monthly Report & Snapshot Data

**Agent**: `seo-orchestrator`
**Sources**:
- `companies/<slug>/reports/latest.txt` (to resolve `<latest-period-key>`)
- `companies/<slug>/memory/sheets/02-gap-analysis.md` — ranked gap priorities with Gap IDs
- `companies/<slug>/memory/sheets/05-keyword-research.md` — keyword universe with Standing, Priority, and Target Week columns
- `companies/<slug>/technical/current-snapshot.md` — WoW deltas and anomalies

Note: Read from `memory/sheets/` (the live copy), not from `reports/<period>/sheets/` (the archive). If `memory/context-digest.md` was already loaded in Step 0, use the digest's gap summary and keyword targets as a starting point — only load the full sheets if you need deeper rows.

Read the gap analysis to identify the top unresolved gaps. Cross-reference with keyword research for Quick Win and HIGH priority items. Extract WoW deltas from the snapshot to detect any CRITICAL anomalies that must preempt planned work.

---

## Step 2 --- Review Outstanding Checklist Items (Phase-Filtered)

**Agent**: `seo-orchestrator`
**Sources**: `memory/sheets/00-digital-presence-baseline.md` (section 00-E for technical health),
`memory/sheets/02-gap-analysis.md` (for on-page and off-page gap items tagged by phase)

The checklist state lives in the sheets, not separate checklist files. Read each sheet
to identify outstanding items tagged by priority and phase.

**Phase filter rules** (apply strictly before selecting any item):

1. **Always eligible** (all phases): unchecked `[HIGH]` items from Sheet 00-E (Technical Health section)
2. **Always eligible** (all phases): unchecked `[HIGH]` on-page items from Sheet 02 — but only for URLs that passed the crawl gate (Step 0B)
3. **Foundation+**: GBP profile updates, NAP citation verification/claiming from Sheet 02 off-page section
4. **Growth+**: directory submissions from Sheet 02 off-page section
5. **Scale+ only**: link building outreach, guest post pitches from Sheet 02 off-page section
6. **Scale+ only**: Reddit seeding, Quora answers, LinkedIn posts, Medium syndication from Sheet 02 off-page section
7. 
**Quick Win Content Exception (Foundation and Growth phases)**:

An informational `content-draft` task (writing to disk only, never publishing) MAY be scheduled in Foundation or Growth if ALL of the following are true:

- Task type is `content-draft` — NOT `content-publish` (drafts to disk only)
- Target keyword KD ≤ 20 AND search volume ≥ 200
- Keyword intent is `informational`
- Task context includes `publish_live: false`
- Task context includes `phase_exception: quick-win`

This exception exists because writing a draft has zero deployment risk and prevents empty pipeline gaps when credentials are later configured. The draft sits in `pending-publish/` until CMS credentials are available and phase/gate conditions are met. Mark the Deferred section note: `"Content drafted — awaiting CMS credentials and phase advancement to publish."`

Do NOT apply this exception to commercial-intent content, product pages, or location pages — those require Growth phase minimum.

**Scale unlock gate**: Before selecting any Scale-only item, confirm all three Scale unlock conditions from Step 0-B are met. If not: move those items to the Deferred section.

**Selection**: Pick top unchecked items ranked by:
1. Priority label (`[HIGH]` > `[MEDIUM]` > `[LOW]`)
2. Dependency: items that unblock other items first
3. Alignment with top Gap IDs from Sheet 02

---

## Step 3 --- Deep Research & Process Formulation

**Agent**: `seo-orchestrator`

For every technical change, content refresh, or blog post planned for the week:
- Do NOT just output a superficial task string
- Cross-reference Sheet 05 keywords and Sheet 02 gap tactics to formulate exactly how the step should be executed
- Detail the specific OpenClaw Skills and Workflows required
- Set explicit Verification conditions: what must the `verification-agent` check before marking complete?
- Prioritize tasks by ROI (Effort vs. Impact from Sheet 02)

Every website change must mandate the use of `wf-website-execution` to capture pre-edit state. Outline the exact H2/H3 architecture if content is being written.

---

## Step 4 --- Build the Weekly Plan File

**Agent**: `seo-orchestrator`
**Output**: `companies/<slug>/plans/active/<YYYY-WNN>.md`

Plan file frontmatter must include all fields from Steps 0 and 0B:

```yaml
week: <YYYY-WNN>
date_range: <Mon YYYY-MM-DD> to <Sun YYYY-MM-DD>
calendar_phase: <Growth>
effective_phase: <Foundation>
downgrade_reason: "<reason or 'none — calendar phase confirmed'>
operational_week: <N>
onpage_high_completion: <X>% (<checked>/<total>)
technical_high_completion: <X>% (<checked>/<total>)
open_foundation_gaps: <N>
scale_unlock_status: <MET|NOT MET — reason>
crawl_verified: <true|false>
crawl_file: <path or 'none'>
crawl_age_days: <N>
crawl_status: <FRESH|STALE|EXPIRED|MISSING>
crawl_url_count: <N>
crawl_validity: <PASS|FAIL — reason>
generated_by: seo-orchestrator
generated_at: <ISO timestamp>
credential_status: ALL_MISSING | PARTIAL | OK
```

### Markdown Formatting for Plan Body

Write the plan body using **this exact structure** — no additional sections, no deviation. The structure below is enforced by the dashboard parser. **Do not add additional sections not listed below.**

> **CRITICAL — Structure Compliance**: The dashboard reads `## This Week's Focus` to extract `executive_summary` for `active-plan.json`. If this section is missing or renamed, the dashboard summary card will not display. The orchestrator also derives `executive_summary` from this section during plan generation.

```markdown
## This Week's Focus

<2-3 sentence summary of the week's top priorities and why. Reference specific anomalies or opportunities from the snapshot.>

## Tasks

| # | Priority | Task | Owner | Est. Hours |
|---|---|---|---|---|
| 1 | **[HIGH]** | <brief task title — 1 sentence max> | <agent or HUMAN> | <N>h |
| 2 | **[MEDIUM]** | <brief task title — 1 sentence max> | <agent> | <N>h |
| 3 | **[CRITICAL]** | <brief task title — 1 sentence max> | HUMAN | — |

### Task Details

#### 1. [HIGH] <Task Title>

**Why**: <1-2 sentences explaining the ROI or gap this addresses. Reference Sheet 02 gap ID or Sheet 05 keyword if applicable.>

**How**: <Specific steps, skills to invoke, or changes to make. Include verification conditions.>

**Verification**: <What the verification-agent checks before marking complete.>

---

#### 2. [MEDIUM] <Task Title>

**Why**: ...
**How**: ...
**Verification**: ...

---
```

**Rules for plan body markdown:**
- **Structure compliance is mandatory** — output MUST match this exact format. Do not add sections beyond those listed above.
- Use `## This Week's Focus` for the summary section — this feeds `executive_summary` in `active-plan.json`.
- Use `## Tasks` for the task table. **Table descriptions must be 1 sentence max** — no elaboration in the table cell.
- All task depth and details go in `### Task Details` → `#### N. [PRIORITY] <Title>`.
- Separate task detail blocks with `---` (horizontal rule) for clean rendering.
- Use `**Bold**` for emphasis and `[CRITICAL]` / `[HIGH]` / `[MEDIUM]` / `[LOW]` priority labels.
- Do NOT use ASCII art, emoji, or decorative elements in the plan body.
- Do NOT add extra sections like "Gap Coverage Matrix", "Competitor Context", "Budget & Resources", "Social Distribution", etc. — those belong in the monthly strategy report, not the weekly plan.

Plan body must end with a Deferred section listing every blocked task with the specific reason:

```markdown
## Deferred Tasks (Phase, Crawl, or Threshold Boundary)
> Tasks below are valid but cannot be scheduled this week. Reason noted per item.
- [task] — Reason: Phase Scale required (effective: Foundation). Eligible when technical [HIGH] >= 40%.
- [task] — Reason: URL /foo.html not in crawl. Verify page exists.
- [task] — Reason: Scale unlock not met — on-page [HIGH] at 22% (threshold: 60%).
```

### Step 4c --- Missed Items / Next Week's Plan

Add this section after the Deferred Tasks section. It captures the state of previously-blocked tasks and the plan for addressing them. This section is parsed by the dashboard API and surfaced in the plan detail view.

```markdown
## Missed Items / Next Week's Plan

> **Completed from last week**: <list of tasks that were completed last week — cross-reference prior week's .meta.json completed_tasks>
> **Carried over (still blocked)**: <list of previously blocked tasks still unresolved — from prior week's deferred list>
> **Resolution plan**: <2-3 sentence note on how the operator will address carried-over items. This field is editable in the dashboard and feeds back into the orchestrator's next cycle.>
```

- **Completed from last week**: Read `companies/<slug>/plans/active/<prior-week>.meta.json` — list tasks completed since the last plan cycle.
- **Carried over (still blocked)**: Read the prior week's plan markdown — list items from its `## Deferred Tasks` section that remain `status: blocked` in the current queue.
- **Resolution plan**: Explicitly state how carried-over items will be handled (e.g., "Deferred task X will be unblocked once the crawl file is refreshed; operator will re-run crawl audit on Monday if not completed this week."). This note is surfaced in the dashboard and signals to the operator what action is needed.

> **Critical — Dashboard Integration**: The dashboard parses this section to populate the plan detail's "Missed Items / Notes" panel. If this section is missing, the panel shows only the editable textarea without a pre-filled note. The orchestrator's note gives the operator immediate context on what needs attention.


### 4b --- Update .meta.json

**Agent**: `seo-orchestrator`
**Output**: `companies/<slug>/plans/active/<YYYY-WNN>.meta.json`

After writing the plan markdown, count the tasks in the plan body and update the `.meta.json`:

1. **Count tasks from plan body**: Walk through the plan markdown and count:
   - `total_tasks` = all task items (including deferred)
   - `blocked_tasks` = tasks with a `deferred_reason` (from Deferred section) or marked blocked
   - `pending_tasks` = `total_tasks - blocked_tasks`
   - `completed_tasks = 0`, `in_progress_tasks = 0`, `progress_percent = 0`

2. **Write/update the meta file** at `companies/<slug>/plans/active/<YYYY-WNN>.meta.json`:

```json
{
  "week": "<YYYY-WNN>",
  "week_start": "<ISO date>",
  "week_end": "<ISO date>",
  "status": "active",
  "total_tasks": <count>,
  "completed_tasks": 0,
  "pending_tasks": <count>,
  "blocked_tasks": <count>,
  "in_progress_tasks": 0,
  "progress_percent": 0,
  "focus_areas": ["<area1>"],
  "gaps_addressed": ["<gap-id>"],
  "priority_tasks": ["<task-id>"],
  "summary": "<One-sentence summary (max 150 chars) of this week's main objective. Extract from ## This Week's Focus — use the first sentence.>",
  "highlights": ["<Key milestone 1 (max 80 chars)>", "<Key milestone 2>", "<Key milestone 3>"],
  "notes": null,
  "created_at": "<ISO timestamp>",
  "updated_at": "<ISO timestamp>",
  "last_heartbeat_at": null
}
```

   - **`summary`**: Read `## This Week's Focus` from the plan body. Copy the first sentence (max 150 chars) — this is what the dashboard displays in the plans card.
   - **`highlights`**: Pick 3-5 key tasks or milestones from the plan body. Format each as a short phrase (max 80 chars) — these appear as badges on the dashboard card.

---

### 4d --- Write success_metrics to active-plan.json

**Agent**: `seo-orchestrator`
**Output**: `companies/<slug>/plans/active/active-plan.json` — `success_metrics` field

After writing the `.meta.json`, synthesize `success_metrics` for `active-plan.json` by counting task types and priorities in the weekly plan. Each metric tracks whether the week's key targets were hit.

**Derive metrics from plan content** — count tasks by type and priority:

| What to count | Metric key to write |
|---|---|
| Tasks with `type: technical-fix` or `type: technical-audit` | `technical_issues_fixed` |
| Tasks with `type: content-publish` | `content_published` |
| Tasks with `type: schema-inject` | `schema_implemented` |
| Tasks with `[CRITICAL]` priority | `critical_tasks_blocked` |
| Tasks blocked by credentials | `credential_gaps_blocking` |
| Any other distinctive task type appearing ≥2 times | synthesize a descriptive key |

For each metric, write a structured object:

```json
"success_metrics": {
  "<metric_key>": {
    "target": "<N or percentage — from the plan task count or stated goal>",
    "current": "—",
    "done": false
  }
}
```

- **`target`**: the number of such tasks in the plan (e.g., `"3"` if the plan has 3 schema-inject tasks), or `"—" `if no count is derivable
- **`current`**: always `"—"` at plan creation time — this is updated by the dashboard toggle or by heartbeat sync
- **`done`**: always `false` at plan creation time — the orchestrator does not pre-mark targets as complete

Do NOT write flat numbers (`"schema_implemented": 1`). The dashboard requires object format — writing flat values will break the interactive toggle UI.

**When to include `done: true`**: only if the orchestrator can verify with absolute certainty that a metric is already met at plan-generation time (e.g., a task was completed and the verification-agent confirmed it in the same cycle). In all other cases, default to `false`.

---

## Step 5 --- Populate Company Task Queue

**Agent**: `seo-orchestrator`

Translate the plan into specific queue items in `companies/<slug>/memory/tasks/queue.json`. Every task that targets a URL must include `url_source: "crawl_audit"` in its context object.

> **Deferred tasks**: Tasks listed in the plan's Deferred section get `status: "blocked"` with `result: "<deferred_reason>"` in the queue — they exist in the queue for visibility but are not executed until the blocker is resolved.

### 5a: Ensure directory structure exists

```
companies/<slug>/memory/tasks/
├── queue.json                    # Current queue (create or append)
└── history/
    └── <YYYY-MM>/
        └── all.json             # Monthly archive (append completed tasks)
```

If `memory/tasks/` doesn't exist, create it before writing `queue.json`.

### 5b: Build queue entries from plan

Read `companies/<slug>/plans/active/<YYYY-WNN>.md`, extract task items from the plan body. For each task:

```json
{
  "id": "task-<slug>-<type>-<timestamp>",
  "type": "<type>",
  "company": "<slug>",
  "report_period": "<YYYY-WNN>",
  "priority": "critical | high | normal | low",
  "status": "pending | blocked",
  "assigned_to": "<agent>",
  "context": {
    "week_from_plan": "<YYYY-WNN>",
    "plan_source": "companies/<slug>/plans/active/<YYYY-WNN>.md",
    "task_description": "<from plan>",
    "url_source": "crawl_audit | sitemap | operator_provided"
  },
  "created_at": "<ISO timestamp>",
  "updated_at": "<ISO timestamp>",
  "iteration": 0,
  "result": "<deferred_reason if blocked, else null>",
  "result_path": null
}
```

### 5c: Write to company queue

1. Read existing `companies/<slug>/memory/tasks/queue.json` (may be empty or contain in-progress tasks from prior week)
2. **Preserve**: tasks with `status: "in-progress"` (they're running, don't reset)
3. **Remove**: completed tasks from the current week (they'll go to history)
4. **Add**: new tasks from this week's plan (skip if identical `id` already exists)
5. Write the merged array back to `companies/<slug>/memory/tasks/queue.json`
6. **Mirror**: append the same merged array to `memory/task-queue.json` (global mirror, maintained for cross-company orchestration)

### 5d: Sync meta.json

After writing the queue, update `companies/<slug>/plans/active/<YYYY-WNN>.meta.json`:
```
meta.total_tasks     = queue.length
meta.completed_tasks = queue.filter(status==='completed').length
meta.pending_tasks   = queue.filter(status==='pending').length
meta.blocked_tasks   = queue.filter(status==='blocked').length
meta.progress_percent = total > 0 ? round(completed/total * 100) : 0
meta.last_heartbeat_at = now()
meta.updated_at = now()
```

### 5e: Task type mapping

| Plan task category | Queue `type` | `assigned_to` |
|---|---|---|
| Website edits (meta, H1, schema) | `website-edit` | `content-publisher` |
| New blog posts | `content-draft` | `content-writer` |
| Content refresh | `content-refresh-draft` | `content-writer` |
| Technical fixes | `technical-fix` | `seo-orchestrator` |
| Crawl / re-crawl | `technical-audit` | `seo-orchestrator` |
| Report generation | `generate-report` | `research-analyst` |
| GBP / NAP updates | `website-edit` | `content-publisher` |

---

## Edge Cases

| Scenario | Response |
|---|---|
| No crawl audit or EXPIRED/MISSING | Force `wf-technical-audit` as first task; block all URL-specific tasks |
| Crawl has < 3 URLs | Treat as MISSING — force re-crawl |
| Operational week undetermined | Default to Foundation; log warning to episodic.md |
| No context-digest.md | Load full sheets for Step 0 signals; after planning, flag that digest should be generated |
| Effective phase < calendar phase | Log downgrade to episodic.md; deferred tasks note when they'll be eligible |
| All checklists fully checked | Pick 3 Quick Win keywords from Sheet 05; schedule phase-eligible content-draft tasks |
| Anomaly log shows CRITICAL signal | Add priority investigation task before any content tasks, regardless of phase |
| Scale phase reached but unlock conditions not met | Lock all off-page outreach; add to Deferred; escalate to human-review if persists 2+ consecutive weeks |
| Two tasks target same URL with contradictory page descriptions | Flag both tasks for human review before queuing |
