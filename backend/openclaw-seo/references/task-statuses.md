---
name: task-statuses
description: "Canonical reference for all task status values used in the openclaw-seo system. All agents must use only these status values. Add new values here first — never invent a status without adding it to this file first."
---

# Task Status Registry

Every task in `companies/<slug>/memory/tasks/queue.json` uses one of these statuses.
This file is the **single source of truth** for task lifecycle states.

---

## Status Values

| Status | Who Sets It | Meaning | Valid Next States |
|---|---|---|---|
| `pending` | Orchestrator, agents | Queued, awaiting execution | `in-progress`, `deferred`, `cancelled` |
| `in-progress` | Assigned agent | Actively being worked | `pending`, `pending-gate`, `pending-verification`, `completed`, `blocked`, `cancelled` |
| `deferred` | Orchestrator (phase gate) | Blocked by phase boundary or crawl gate | `pending` (auto-reset when condition clears) |
| `pending-gate` | content-writer | Draft written, awaiting content-gate quality check | `in-progress` (gate re-run), `blocked` (gate failed), `pending` (re-draft needed) |
| `blocked` | Any agent | Cannot proceed — prerequisite missing, auth failed, or gate failed | `pending` (unblocked), `cancelled` |
| `pending-verification` | content-publisher | Published to CMS, awaiting verification-agent audit | `completed`, `rolling-back` |
| `rolling-back` | verification-agent | Live change failed validation — initiating CMS reversion | `pending` (remediation queued), `blocked` |
| `completed` | Any agent | Task finished successfully | — (terminal state) |
| `cancelled` | Orchestrator, operator | Task cancelled by human or deduplication logic | — (terminal state) |

---

## Deferred Reasons

When a task is `deferred`, the `deferred_reason` field must be set:

| deferred_reason | Triggered By | Unblock Condition |
|---|---|---|
| `phase-locked` | Phase gate (SOUL.md Step 2) | `effective_phase` advances past the blocked task type's minimum phase |
| `routing-fix-required` | SPA routing broken (wf-build-weekly-plan.md Step 0B) | The `website-edit` task for server catch-all routing is marked `completed` |
| `crawl-stale` | Crawl > 30 days old | New crawl file written to `technical/audits/` |
| `auth-missing` | Required credential absent | Credential added to `.env` and synced to `missing-dependencies.md` |
| `deferred-count-exceeded` | Same task deferred 2+ consecutive heartbeats | Create `human-review` task and stop deferring |

---

## Task Status Flow

```
Orchestrator creates task:
  pending → (agent picks up) → in-progress

Agent completes work:
  in-progress → pending-gate (content-writer only)
  in-progress → pending-verification (content-publisher after CMS publish)
  in-progress → completed

Agent encounters blocker:
  in-progress → blocked

Phase gate or crawl gate blocks:
  pending → deferred (with deferred_reason)

Verification passes:
  pending-verification → completed

Verification fails:
  pending-verification → rolling-back → (remediation task created) → pending
```

---

## Rule

- Never use a status not listed above
- Never use a `deferred_reason` not listed above
- Add new statuses or deferred reasons to this file **before** using them in any agent, workflow, or SOUL.md
- In case of conflict between this file and any agent/workflow file, this file takes precedence

---

## Stub Skill Policy

Some skills in `skills/` are marked `[STUB]` — they document the intended capability
and interface but return simulated/hardcoded data until the real API integration is implemented.

**Current stub skills**: gsc-fetch, ga4-fetch, rank-track, serp-monitor, content-curator, crawl-firecrawl

**Policy**:
- Stub skills may appear in `AGENTS.md` skill lists as documentation of intent
- Agents must **never** call a stub skill when real credentials are available for the same capability
- Stub skills do **not** count as a successful Tier 1 API call in the skill-execution-protocol
- When data from a stub skill is used, annotate: `[Source: simulated — implement real API]`
- Stub skills are **never** a reason to skip Tier 2 (browser) fallback
