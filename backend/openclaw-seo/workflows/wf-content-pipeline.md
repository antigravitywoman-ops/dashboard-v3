---
name: wf-content-pipeline
description: "The canonical end-to-end content pipeline for the Brain/Hands architecture. Governs all content from brief to live URL, enforcing the separation between the content-writer (Brain) and content-publisher (Hands) via an automated content-gate checkpoint."
trigger: invoked_by_orchestrator
---

# Workflow: Content Pipeline (Brain to Gate to Hands to Verify)

This workflow is the shared SOP injected any time the orchestrator creates a content-draft or content-publish task. Both wf-onpage-weekly and wf-offpage-distribute delegate their content execution steps to this pipeline.

**Why this architecture exists**: A single agent with both writing skills and CMS credentials is a security liability. A hallucination during content generation should never have the blast radius to affect a live website. This pipeline enforces hard separation at the task queue level.

---

## Pipeline Stages at a Glance

- Stage 1: BRIEF      - Orchestrator creates content-draft task
- Stage 2: BRAIN      - content-writer generates draft, saves to pending-publish/
- Stage 3: GATE       - seo-orchestrator runs content-gate skill, pass/fail
- Stage 4: HANDS      - content-publisher picks up approved draft, publishes to CMS
- Stage 5: DISTRIBUTE - content-publisher posts to social channels
- Stage 6: VERIFY     - verification-agent audits the live URL, marks completed

Each stage maps to exactly one task type in `companies/<slug>/memory/tasks/queue.json` (per-company queue — source of truth).

---

## Dashboard Manual Publish Trigger

Content can also be published manually from the SEO Dashboard Content tab (frontend).

**Flow**: User clicks "Publish" on an approved item → POST /api/companies/:slug/content/:filename/publish → content-publish task created → pipeline executes → file moved to published/

**IMPORTANT — Broken Pattern (DO NOT USE)**:
- The Content tab previously had `STATUS_FLOW['approved'] = 'published'`
- This caused the "Publish" button to directly move the file: approved/ → published/ via PATCH /status
- This bypassed the entire pipeline: no CMS push, no verification, no audit trail
- This has been **removed**. The "Publish" button now creates a `content-publish` task.

**Endpoint**: `POST /api/companies/:slug/content/:filename/publish`
**Backend handler**: `backend/seo-dashboard-api/src/routes/content.js`
**Required role**: ADMIN or EDITOR

**Request body**: None (file slug extracted from URL params)

**Response**:
```json
{
  "success": true,
  "task": { /* full task object */ },
  "message": "Publish task created. The content-publisher agent will now push..."
}
```

**Error cases**:
- File not in approved/ folder → 400
- Publish task already exists (pending/in-progress) → 409 with existing task ID
- Missing CMS credentials → content-publisher marks task blocked

**Duplicate prevention**: The backend checks for an existing `content-publish` task for the same file with status `pending`, `in-progress`, or `pending-verification`. If found, returns 409 instead of creating a duplicate.

---

## Stage 1 — Brief (Orchestrator)

**Agent**: seo-orchestrator
**Task type**: content-draft

The orchestrator creates a content-draft task. Required context fields:
- type: content-draft
- assigned_to: content-writer
- context.brief_source: companies/SLUG/plans/active/YYYY-WNN-weekly-plan.md
- context.target_keyword: primary keyword
- context.post_type: new | refresh
- context.intent: informational | commercial
- context.word_count_target: 1800
- context.distribution_channels: [reddit, linkedin]
- context.cms_type: wordpress
- context.publish_live: false

For content refreshes, use type: content-refresh-draft with post_type: refresh and original_url in context.

---

## Stage 2 — Brain (content-writer)

**Agent**: content-writer
**Task type**: content-draft or content-refresh-draft
**Skills**: blog-generate (new posts), blog-update (refreshes), meta-optimizer, serper-miner

> Note: `crawl-firecrawl` is a stub skill — do NOT inject it here. For content refreshes, use `crawl-browser` (primary, no API key needed) to fetch live content. If `FIRECRAWL_API_KEY` is configured AND site is static, `crawl-firecrawl` [STUB] may be used as supplementary. See `references/task-statuses.md`.

The content-writer executes these steps and NOTHING ELSE:

0. **Read `effective_phase`** from `companies/SLUG/plans/active/<current-week>.md` frontmatter. This governs whether distribution angle fields are populated or deferred (see frontmatter spec below).
1. Read the brief from context.brief_source (the active weekly plan)
2. Pull keyword data from companies/SLUG/memory/sheets/05-keyword-research.md
3. Pull company context from about/profile.md, about/brand-voice.md, memory/business-goals.md
4. For refreshes: fetch live content via `crawl-browser` (primary, headless, no API key). Pull GSC data from `technical/current-snapshot.md`.
5. Run blog-generate (new) or blog-update (refresh)
6. Run meta-optimizer to produce optimized title and meta description
7. Write output to: companies/SLUG/content/pending-publish/TASKID.md

Output file must include these frontmatter fields:

```yaml
task_id: TASKID
company: SLUG
type: new | refresh
target_keyword: keyword
cms_type: wordpress | webflow | contentful | ghost
original_url: url           # refreshes only
original_post_id: id        # refreshes only, if known
distribution_channels: [reddit, linkedin]
publish_live: false
meta_title: optimized title max 60 chars
meta_description: optimized meta max 160 chars
word_count_target: 1800
intent: informational | commercial
distribute_immediately: false
created_at: ISO timestamp
gate_status: pending
# Distribution briefs — populated based on effective_phase (read in step 0 above)
# If effective_phase = Scale or Optimization: write real angle briefs
# If effective_phase = Foundation or Growth: write deferred markers — content-publisher skips those channels
distribution_reddit_angle: "deferred — phase=Foundation, eligible at Scale"  # OR: one-sentence community angle
distribution_linkedin_angle: "deferred — phase=Foundation, eligible at Scale"  # OR: business-outcome angle
distribution_quora_target: "deferred — phase=Foundation, eligible at Scale"  # OR: Quora question URL from Sheet 09
distribution_medium_intro: "deferred — phase=Foundation, eligible at Scale"  # OR: 1-2 sentence hook
```

**Distribution angle rules by phase**:
- `Scale` or `Optimization`: populate all `distribution_*` fields as genuine, platform-native angle briefs
- `Foundation` or `Growth`: set all `distribution_*` fields to `"deferred — phase=<phase>, eligible at Scale"`

The `content-publisher` reads these fields at Stage 5. If any field contains `"deferred"`, it skips that platform and logs: `[DISTRIBUTE] Skipped <platform> — distribution_<platform>_angle is deferred (phase=<phase>)`. This prevents premature distribution without requiring a separate phase check in Stage 5.

8. After writing the file, update the task:
   - status: pending-gate
   - result_path: companies/SLUG/content/pending-publish/TASKID.md
   - updated_at: now

**The content-writer does NOT**:
- Call cms-wordpress, cms-editor-generic, or any post-* skill
- Mark the task completed
- Attempt to publish the draft in any way

---

## Stage 3 — Gate (seo-orchestrator, self)

**Agent**: seo-orchestrator (self)
**Trigger**: Orchestrator sees a task with status: pending-gate on heartbeat
**Skill**: content-gate

Steps:

1. Run skills/content-gate for the company slug and task ID
2. Read gate result from companies/SLUG/content/gate-results/TASKID-gate.json
3. Log gate result summary to memory/episodic-log.txt

**If pass: true**:
- Update content-draft task: gate_status: passed in context
- Create new content-publish task (Stage 4)
- Mark original content-draft task status: completed

**If pass: false**:
- Increment content-draft task iteration counter
- If iteration < 3: reset task status to pending with gate_findings in context — content-writer fixes and re-saves
- If iteration >= 3: create human-review task. Log: BLOCKED content-gate failed 3 times for task TASKID

Gate findings are passed back to content-writer in gate_findings array so the writer fixes only the failing rules.

---

## Stage 4 — Hands: CMS Publish (content-publisher)

**Agent**: content-publisher
**Task type**: content-publish or content-refresh-publish
**Skills**: cms-wordpress, cms-editor-generic, wpcli-manager, auth-manager

Task created by orchestrator after gate passes. Required context fields:
- draft_path: companies/SLUG/content/approved/DRAFT-TASK-ID.md (dashboard manual) OR companies/SLUG/content/pending-publish/DRAFT-TASK-ID.md (automated pipeline)
- gate_status: passed | pending | failed
- gate_result_path: companies/SLUG/content/gate-results/DRAFT-TASK-ID-gate.json (if gate was run)
- source_task_id: the draft task ID

**Important — Gate Check**: content-publisher runs content-gate inline if gate_status is `pending` or `gate_result_path` is null (see content-publisher.md Step 1). This handles dashboard manual publish cases where gate may not have been run yet.

### PRE-PUBLISH CHECKLIST (MANDATORY)
Before pushing to CMS, verify:
1. **Parent page exists** — e.g., /books/ must exist before /books/the-answers-within/
2. **Navigation includes link** — menu must link to the new page
3. **URL resolves correctly** — fetch the URL, confirm it shows the page NOT homepage

If any check fails:
- Mark task BLOCKED
- Create sub-task for the missing structural element
- Do NOT publish until structural prerequisites met

### POST-PUBLISH VERIFICATION (MANDATORY)
After CMS publish:
1. Fetch the live_url
2. Confirm page content matches draft (not homepage or 404)
3. Confirm navigation menu includes the link
4. Only then set status: pending-verification

After CMS publish, content-publisher sets:
- status: pending-verification
- result.live_url: the published URL
- result.url_verified: true/false

---

## Stage 5 — Hands: Social Distribution (content-publisher)

**Agent**: content-publisher
**Task type**: distribute-content
**Skills**: post-reddit, post-quora, post-linkedin, post-medium, auth-manager

**Triggered AFTER verification passes** — never distribute content that failed technical verification.

Distribution task requires in context:
- content_url: the verified live URL
- target_keyword: keyword
- distribution_channels: array of platforms
- draft_path: path to draft file in source folder — approved/ or pending-publish/ (frontmatter contains distribution_* angle briefs)

**Content transformation is required before each platform call**: content-publisher reads `distribution_*` frontmatter fields and generates platform-native content at runtime. It does NOT copy the blog post to social media. See `skills/post-reddit/SKILL.md`, `skills/post-linkedin/SKILL.md`, `skills/post-quora/SKILL.md`, `skills/post-medium/SKILL.md` for per-platform transformation protocols.

Deduplication: before each platform call, check `companies/<slug>/content/distribution-log.md` for recent posts on the same topic or to the same target (subreddit/question URL). Skip if rate limit hit.

Refer to wf-offpage-distribute.md for full per-platform execution SOP.

---

## Stage 6 — Verify (verification-agent)

**Agent**: verification-agent
**Task type**: verify-publish
**Trigger**: Orchestrator sees content-publish task with status: pending-verification on heartbeat

Orchestrator creates a verify-publish task with context:
- live_url: the published URL
- source_task_id: publish task ID
- company: slug
- verification_checks: [technical, semantic]

verification-agent runs dual-pass audit (technical + semantic) as defined in agents/verification-agent.md.

**If both passes succeed**:
- Mark content-publish task status: completed
- If distribute_on_verify: true in context, create distribute-content task
- Log to companies/SLUG/memory/episodic.md: title, live URL, keyword, publish date
- **Move the draft file** from its source folder (approved/ or pending-publish/) to companies/SLUG/content/published/TASKID.md
- Move the corresponding `.meta.json` to the published folder

**If either pass fails**:
- Mark content-publish task status: rolling-back
- Orchestrator handles CMS reversion (set post back to draft)
- New content-draft task created with failure context

### Dashboard UX Note — Status Display During Publish

The dashboard tracks publishing progress via a `publishing_status` field in the content `.meta.json` file. While a content-publish task is in-flight, the file remains in its source folder (approved/ or pending-publish/). The Content tab updates `publishing_status` in real time so users see progress without folder changes.

**`publishing_status` state machine** (tracked in `.meta.json`):

| State | When Set | Cleared By |
|---|---|---|
| `null` | Default — no publish in flight | — |
| `gate-checking` | Backend creates publish task; content-publisher runs gate inline | content-publisher (on gate pass/fail) |
| `publishing` | content-publisher calls CMS skill | content-publisher (on CMS complete) |
| `verifying` | content-publisher hands off to verification | verification-agent (on success or failure) |
| `done` | verification-agent — verification passed, file moved to published/ | Never cleared (permanent) |
| `failed` | Any blocked/error state | Backend on retry or manual intervention |

**Related meta fields**:
- `publishing_task_id` — the task ID of the in-flight publish task (set when publish starts, cleared to `null` on done/failed)
- `publishing_error` — 1-line error summary when status is `failed`, otherwise `null`

**Dashboard behavior**:
- The Publish button is hidden when `publishing_status` is set (prevents duplicate publish)
- A badge shows the current state: "Gate Checking" / "Publishing" / "Verifying" / "Published" / "Publish Failed"
- On `failed`, an error message is shown inline
- The file stays in its source folder throughout — no folder move until verification passes

The orchestrator clears `publishing_status` and `publishing_task_id` in the meta.json after completing a CMS reversion during rollback.

---

## Full Task Sequence in Queue

```
content-draft         pending → in-progress → pending-gate
                      [gate runs — orchestrator self on next heartbeat]
content-draft         completed (pass) | pending retry | human-review (3 fails)
content-publish       pending → in-progress → pending-verification
verify-publish        pending → in-progress → completed
content-publish       pending-verification → completed
distribute-content    pending → in-progress → completed
```

---

## Handoff File as Audit Trail

companies/SLUG/content/pending-publish/TASKID.md is the permanent record:
- Created by content-writer with gate_status: pending in frontmatter
- Gate result written to companies/SLUG/content/gate-results/TASKID-gate.json
- Read-only by content-publisher at publish time
- Moved to companies/SLUG/content/published/TASKID.md after verification
- Never deleted — immutable record of what was written and when

---

## Error Recovery Paths

| Failure Point | Recovery |
|---|---|
| content-writer blocked | Orchestrator creates human-review task |
| content-gate failed x3 | human-review task. Draft sits in pending-publish for manual inspection |
| content-publisher CMS auth failed | Mark blocked. Run auth-manager refresh. Re-queue publish task |
| verification technical fail | Rollback. Post set back to draft. New content-publish task after fix |
| verification semantic fail | Rollback. New content-draft task with semantic failure context |
| distribution auth expired | Distribution task blocked for platform. CMS publish unaffected |
