# OpenClaw Agent Registry — openclaw-seo

> This file registers all agents in the openclaw-seo workspace.
> The OpenClaw Pi runtime reads this file to understand which specialized personas exist and how to route tasks to them.
> Each agent is a composable system prompt (persona file) injected at task dispatch time.

---

## Universal Protocol (Injected Into Every Agent)

The following file is **always injected** into every agent at task dispatch, regardless of task type. It governs skill selection, fallback order, attempt limits, and graceful termination.

```yaml
universal_inject:
  - skills/skill-execution-protocol
```

Every agent must read and follow `skills/skill-execution-protocol` before using any other skill. It defines: how to pick the right skill, what to try when a skill fails, how many attempts to make, and when to stop and write what you have.

---

## Primary Agent (Heartbeat Orchestrator)

```yaml
name: seo-orchestrator
description: "Strategic planner and quality enforcer. Runs on every heartbeat. Manages the task queue, validation-retry loop, delta-driven planning, and agent routing."
persona: agents/seo-orchestrator.md
soul: SOUL.md
model: claude-opus-4-6
heartbeat: true
heartbeat_interval: 30m
active_hours: "00:00-23:59"
skills:
  - skills/skill-execution-protocol
  - skills/auth-manager
  - skills/snapshot-generator
  - skills/sheet-validator
  - skills/backup-sweeper
  - skills/content-gate
  - skills/meta-generator
```

---

## Specialized Agents (Task-Routed)

These agents are invoked on-demand when the orchestrator routes a task to them. They do not run on heartbeat — they are invoked for a single task turn by the orchestrator.

```yaml
name: research-analyst
description: "Produces the 14-sheet Markdown strategy report. Reads company context, SERP data, and snapshot data. Writes all sheets to the dated report folder. Runs self-validation before submitting. Use for FULL-DEPTH reports — agent-driven, deeply researched, industry-calibrated."
persona: agents/research-analyst.md
model: claude-opus-4-6
task_types:
  - generate-report        # Use research-analyst (full-depth, agent-driven)
  - sheet-fix              # Use research-analyst (regenerate specific sheet)
skills:
  - skills/skill-execution-protocol
  - skills/serper-miner
  - skills/sheet-validator
  - skills/schema-auditor
  - skills/meta-generator
  - references/sheet-metrics.md
  # NOTE: gsc-fetch, ga4-fetch, rank-track, crawl-firecrawl are [STUB] skills.
  # When these credentials are absent, skip them entirely and use browser fallbacks
  # (WebFetch, WebSearch) for the same data. See: references/task-statuses.md
```

**Report Generation: Two Modes**

| Mode | When to Use | Agent/Script |
|---|---|---|
| Full-depth (research-analyst) | Weekly/monthly strategy reports — deep research, industry calibration, 50-200 keyword rows, real competitor data | `research-analyst` agent |
| Quick-fill (report-generator.js) | Rapid scaffolding, no-API-key environments, fresh company onboarding, smoke tests | `report-generator` skill |

The `research-analyst` agent is the primary report generator. It produces the full-depth reports described in `agents/research-analyst.md`. The `report-generator.js` skill (`skills/report-generator/scripts/report-generator.js`) is a faster, template-based alternative for when deep research is not needed or API credentials are unavailable. Both write the same sheet files and `.meta.json` schemas.

```yaml
name: data-intelligence
description: "Silent daily data collector. Reads GSC, GA4, and rank tracking APIs. Writes current-snapshot.md and appends anomalies to anomalies-log.md. Never generates strategy content."
persona: agents/data-intelligence.md
model: claude-sonnet-4-6
task_types:
  - daily-snapshot
  - anomaly-check
skills:
  - skills/skill-execution-protocol
  - skills/snapshot-generator
  # NOTE: gsc-fetch, ga4-fetch, rank-track are [STUB] skills.
  # Always prefer browser tools (WebSearch, WebFetch) as primary data collection.
  # Only treat stub skills as last resort when browser tools are exhausted.
  # Annotate all stub-derived values: [Source: simulated — verify with live API]
  # See: references/task-statuses.md
```

```yaml
name: excel-porter
description: "Translates validated Markdown sheet files into a formatted Excel workbook. Only runs after sheet-validator returns overall_pass: true. Handles 14 sheets → 17 Excel tabs."
persona: agents/excel-porter.md
model: claude-haiku-4-5-20251001
task_types:
  - excel-generation
skills:
  - skills/skill-execution-protocol
  - skills/excel-porter
  - skills/sheet-validator
```

```yaml
name: content-writer
description: "The Brain. Researches, plans, and writes SEO content (new posts and content refreshes). Reads from plans/active/ and writes completed drafts to companies/<slug>/content/pending-publish/. Has NO access to CMS, social APIs, or any publication mechanism. Its only output is a Markdown draft file. The content-gate skill validates its output before the content-publisher is ever invoked."
persona: agents/content-writer.md
model: claude-sonnet-4-6
task_types:
  - content-draft
  - content-refresh-draft
skills:
  - skills/skill-execution-protocol
  - skills/blog-generate
  - skills/blog-update
  - skills/meta-optimizer
  - skills/serper-miner
  - skills/meta-generator
  # NOTE: crawl-firecrawl and content-curator are [STUB] skills and are excluded.
  # blog-generate handles its own web research internally.
  # See: references/task-statuses.md
```

```yaml
name: content-publisher
description: "The Hands. A pure execution agent that picks up gate-approved drafts from pending-publish and publishes them to the CMS and social platforms. Never generates, rewrites, or evaluates content. Credentials for CMS and social APIs are scoped to this agent only — the content-writer has no access to these."
persona: agents/content-publisher.md
model: claude-haiku-4-5-20251001
task_types:
  - content-publish
  - content-refresh-publish
  - distribute-content
skills:
  - skills/skill-execution-protocol
  - skills/cms-wordpress
  - skills/wp-technical
  - skills/cms-editor-generic
  - skills/wpcli-manager
  - skills/post-reddit
  - skills/post-quora
  - skills/post-linkedin
  - skills/post-medium
  - skills/auth-manager
```

```yaml
name: verification-agent
description: "Dual-pass quality control auditor. Verifies all published content against technical and semantic standards before marking tasks complete. Triggers rollback if either pass fails. Never generates or edits content. Runs after content-publisher sets a task to pending-verification."
persona: agents/verification-agent.md
model: claude-sonnet-4-6
task_types:
  - verify-publish
skills:
  - skills/skill-execution-protocol
  - skills/crawl-browser
  - skills/schema-auditor
  # NOTE: crawl-firecrawl is [STUB] — excluded. verification uses crawl-browser for live URL checks.
  # NOTE: wp-technical excluded — verification reads only, never edits.
  # See: references/task-statuses.md
```

---

## Platform Development Agents

These agents operate on the platform itself, not on company workspaces.

```yaml
name: code-review
description: "Architecture review agent. Validates platform code for consistency, catches regressions, and ensures system invariants hold. Invoked via /code-review slash or heartbeat-dispatched code-review task."
persona: agents/code-review.md
model: claude-sonnet-4-6
task_types:
  - code-review
skills:
  - skills/skill-execution-protocol
```

```yaml
name: platform-dev
description: "Internal developer agent. Reads and modifies any platform file to implement features, fix bugs, and improve architecture. Invoked ONLY via /platform-dev slash command — not heartbeat-dispatched. Never modifies company workspace files."
persona: agents/platform-dev.md
slash_only: true
skills:
  - skills/platform-dev
```

---

## Session Routing

In OpenClaw multi-agent setups, the primary orchestrator communicates with specialized agents via `sessions_send`. The session target for each agent corresponds to the workspace name + agent name. Until multi-agent sessions are configured, routing is handled through the per-company task queues (`companies/<slug>/memory/tasks/queue.json`) read by `runtime/heartbeat.js`. The global queue (`memory/task-queue.json`) is maintained as a mirror for cross-company orchestration.

---

## Workflow SOPs (Injected as Skills at Runtime)

Workflows are structured SOP documents injected as skills when the orchestrator is executing a specific task type. The orchestrator reads the relevant workflow file as additional context before acting on a task.

| Task Type | Workflow SOP Injected |
| :--- | :--- |
| `generate-report` | `workflows/wf-weekly-strategy.md` |
| `daily-snapshot` | `workflows/wf-daily-intelligence.md` |
| `technical-audit` | `workflows/wf-technical-audit.md` |
| `content-draft` | `workflows/wf-content-pipeline.md` + `workflows/wf-onpage-weekly.md` |
| `content-refresh-draft` | `workflows/wf-content-pipeline.md` + `workflows/wf-onpage-weekly.md` |
| `content-gate` | `workflows/wf-content-pipeline.md` |
| `content-publish` | `workflows/wf-content-pipeline.md` |
| `content-refresh-publish` | `workflows/wf-content-pipeline.md` |
| `distribute-content` | `workflows/wf-offpage-distribute.md` |
| `verify-publish` | `workflows/wf-content-pipeline.md` |
| `build-plan` | `workflows/wf-build-weekly-plan.md` |
| `company-onboard` | `workflows/wf-company-onboarding.md` |
| `on-page-fix` | `workflows/wf-technical-audit.md` |
| `schema-inject` | `workflows/wf-technical-audit.md` |
| `metadata-audit` | `agents/meta-audit.md` |

---

## Content Pipeline Architecture (Brain / Hands Split)

The content system is intentionally split into two agents with distinct, non-overlapping capabilities:

```
content-writer (Brain)         content-publisher (Hands)
──────────────────────         ─────────────────────────
blog-generate                  cms-wordpress
blog-update                    cms-editor-generic
meta-optimizer                 wpcli-manager
serper-miner                   post-reddit
meta-generator                  post-quora
                               post-linkedin
                               post-medium
                               auth-manager

Output: pending-publish/       Input: pending-publish/
Status: pending-gate           Requires: gate_status: passed

Note: crawl-firecrawl and content-curator are [STUB] skills — excluded from
content-writer's skill set. blog-generate handles its own web research internally.
See: references/task-statuses.md
```

The `content-gate` skill (run by seo-orchestrator) sits between them and validates every draft before the content-publisher is invoked. A draft that fails gate is returned to content-writer with specific findings. After 3 failures, a `human-review` task is created.

See `workflows/wf-content-pipeline.md` for the full pipeline SOP.

---

## Agent Routing Table (Canonical — Source of Truth)

This table is the authoritative routing registry. All other files (`SOUL.md`, workflows, agent files)
reference this table. If any other file's routing conflicts with this table, this table takes precedence.

| Task Type | Assigned Agent | Skills Injected | Notes |
| :--- | :--- | :--- | :--- |
| `generate-report` | research-analyst | skill-execution-protocol, serper-miner, sheet-validator, schema-auditor, meta-generator | Full-depth strategy report. Browser fallbacks used when gsc-fetch/ga4-fetch/rank-track credentials absent (those are [STUB]). |
| `generate-report` (quick-fill) | seo-orchestrator | — | Standalone script path: `skills/report-generator/scripts/report-generator.js` |
| `sheet-fix` | research-analyst | skill-execution-protocol, sheet-validator | Fix failing sheets only |
| `validate-sheets` | seo-orchestrator | skill-execution-protocol, sheet-validator | Self-validation gate |
| `excel-generation` | excel-porter | skill-execution-protocol, excel-porter | Run only after validate-sheets passes |
| `daily-snapshot` | data-intelligence | skill-execution-protocol, snapshot-generator | Browser-first data collection. gsc-fetch/ga4-fetch/rank-track are [STUB] — see data-intelligence.md. |
| `technical-audit` | seo-orchestrator | skill-execution-protocol, crawl-browser, schema-auditor, pagespeed-fetch | Self-executed crawl + enrichment. crawl-browser (no API key) is primary. |
| `build-plan` | seo-orchestrator | skill-execution-protocol, wf-build-weekly-plan | Phase-aware weekly plan from performance data |
| `content-draft` | content-writer | skill-execution-protocol, blog-generate, meta-optimizer, serper-miner, meta-generator | Brain generates draft from plan brief |
| `content-refresh-draft` | content-writer | skill-execution-protocol, blog-update, meta-optimizer | Update existing published post |
| `content-gate` | seo-orchestrator | skill-execution-protocol, content-gate | Quality gate before publish |
| `content-publish` | content-publisher | skill-execution-protocol, cms-wordpress, cms-editor-generic, auth-manager | Push approved draft to CMS |
| `content-refresh-publish` | content-publisher | skill-execution-protocol, cms-wordpress, wpcli-manager, auth-manager | Update live page in CMS |
| `distribute-content` | content-publisher | skill-execution-protocol, post-reddit, post-quora, post-linkedin, post-medium, auth-manager | Social distribution |
| `verify-publish` | verification-agent | skill-execution-protocol, crawl-browser, schema-auditor | Dual-pass audit of live URL |
| `on-page-fix` | content-publisher | skill-execution-protocol, wp-technical, cms-wordpress | Inline CMS meta/H1 edits |
| `schema-inject` | content-publisher | skill-execution-protocol, wp-technical, cms-wordpress | Schema markup injection |
| `metadata-audit` | meta-audit | skill-execution-protocol, meta-generator | Frontmatter and meta field audit |
| `process-human-review` | seo-orchestrator | — | Process operator responses to pending reviews |
| `process-review-decision` | seo-orchestrator | — | Route dashboard review decisions (approved/rejected) |
| `human-review` | HUMAN | — | Operator decision required |
| `update-deps` | seo-orchestrator | — | Refresh credential dependency file |
| `code-review` | code-review | skill-execution-protocol | Scheduled or on-demand platform code review |
| `platform-dev` | (slash-only) | — | Internal platform development via `/platform-dev` slash command |
