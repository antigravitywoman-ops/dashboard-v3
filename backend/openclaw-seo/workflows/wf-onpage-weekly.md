---
name: wf-onpage-weekly
description: "Weekly on-page SEO execution workflow. Publishes one new blog post, updates up to 5 underperforming existing posts, and ensures schema coverage on recently published pages. Runs every Monday after the technical audit. Content generation and publishing are separated into distinct pipeline stages — see wf-content-pipeline.md for the full Brain/Gate/Hands/Verify flow."
trigger: cron(0 11 * * 1)
---

# Workflow: Weekly On-Page Execution

Executes the on-page content tasks defined in the active weekly plan. Focuses on CTR improvement, E-E-A-T signals, and schema coverage.

**Content pipeline architecture**: This workflow creates the content-draft and content-refresh-draft tasks. The actual writing is done by `content-writer` (Brain), validated by `content-gate`, published by `content-publisher` (Hands), and verified by `verification-agent`. See `wf-content-pipeline.md` for the full pipeline SOP.

---

## Step 1 — Read Active Weekly Plan

**Agent**: `seo-orchestrator`
**Source**: `companies/<slug>/plans/active/<YYYY-WNN>-weekly-plan.md`

If no active weekly plan exists for the current week:
- Fall back to `companies/<slug>/plans/content-calendar.md`
- If content calendar is also empty: log to episodic and stop; create a `build-plan` task so the orchestrator runs `wf-build-weekly-plan` first

Extract from the plan:
- The ONE new blog post topic and target keyword for this week
- Up to 5 URLs flagged for content refresh
- Any schema implementation tasks pending

---

## Step 2 — Create content-draft Task (New Blog Post)

**Agent**: `seo-orchestrator` (creates task)
**Downstream agent**: `content-writer` (Brain)
**Skill chain**: `blog-generate` → `meta-optimizer`

The orchestrator creates a `content-draft` task with full context:

```json
{
  "type": "content-draft",
  "assigned_to": "content-writer",
  "priority": "normal",
  "context": {
    "brief_source": "companies/<slug>/plans/active/<YYYY-WNN>-weekly-plan.md",
    "target_keyword": "<from weekly plan>",
    "secondary_keywords": "<from 05-keyword-research.md>",
    "post_type": "new",
    "intent": "<informational|commercial — from Sheet 05>",
    "word_count_target": 1800,
    "cms_type": "<from about/profile.md CMS Adapters field>",
    "distribution_channels": "<from about/profile.md Distribution Platforms field>",
    "publish_live": false
  }
}
```

**What content-writer produces** (the Brain's deliverable):
- Draft saved to `companies/<slug>/content/pending-publish/<task-id>.md`
- Frontmatter includes: `task_id`, `company`, `target_keyword`, `meta_title`, `meta_description`, `gate_status: pending`

**Quality requirements the content-gate will enforce**:
- Word count: 1,200 minimum (informational), 1,800 minimum (commercial intent)
- H2 structure: minimum 3 H2s covering semantic sub-topics
- Internal links: 2–4 relevant links to existing site pages
- CTA: specific and conversion-aligned ("Contact us" alone is not sufficient)
- Meta title: 10–60 characters, keyword in first 30

The orchestrator does NOT create a `content-publish` task at this step. That task is created automatically by the orchestrator when the content-gate passes (Stage 3 of wf-content-pipeline).

---

## Step 3 — Create content-refresh-draft Tasks (Existing Content)

**Agent**: `seo-orchestrator` (creates tasks)
**Downstream agent**: `content-writer` (Brain)
**Skill chain**: `crawl-browser` (primary — fetch live content, no API key) → `blog-update` → `meta-optimizer`

> Note: `crawl-firecrawl` is a [STUB] skill — do NOT use it as primary. Use `crawl-browser` for all content refreshes. See `references/task-statuses.md`.

For each URL flagged for refresh in the weekly plan (max 5), the orchestrator creates a `content-refresh-draft` task:

```json
{
  "type": "content-refresh-draft",
  "assigned_to": "content-writer",
  "priority": "normal",
  "context": {
    "original_url": "<flagged URL from weekly plan>",
    "refresh_reason": "<from weekly plan — CTR drop, rank drop, stale content>",
    "post_type": "refresh",
    "cms_type": "<from about/profile.md>",
    "distribute_immediately": false
  }
}
```

**Refresh priority logic** (content-writer reads this from the task context when executing):
- If CTR < 2% for impressions > 500: title/meta optimization is priority (run `meta-optimizer` first)
- If avg position 11–20: content depth and internal links are priority (expand shallowest H2 sections)
- If avg position 21+: full rewrite candidate (run `blog-update` with full rewrite flag)

---

## Step 4 — Gate Evaluation (Orchestrator Self)

**Agent**: `seo-orchestrator` (self)
**Skill**: `content-gate`
**Trigger**: On next heartbeat after content-writer sets task to `pending-gate`

The orchestrator runs `content-gate` for each draft in `pending-gate` state. See `wf-content-pipeline.md` Stage 3 for the full gate logic.

**Pass**: Orchestrator creates `content-publish` or `content-refresh-publish` task for `content-publisher`.
**Fail**: Orchestrator sends gate_findings back to content-writer (up to 3 retries before human-review).

---

## Step 5 — CMS Publish (content-publisher, The Hands)

**Agent**: `content-publisher`
**Skills**: `cms-wordpress` (WordPress sites) OR `cms-editor-generic` (other CMS)
**Trigger**: content-publisher picks up `content-publish` or `content-refresh-publish` tasks from queue

The content-publisher reads `cms_type` from the draft frontmatter and selects the appropriate skill.

**Publish settings**:
- Status: draft (not live) unless the weekly plan or task context explicitly sets `publish_live: true`
- Set Yoast/RankMath/SEOPress meta title and description from the draft frontmatter
- Set featured image if provided in the draft

After CMS publish, content-publisher sets task `status: pending-verification` and writes the live URL to the task result. It does NOT mark the task `completed`.

---

## Step 6 — Verification (verification-agent)

**Agent**: `verification-agent`
**Trigger**: Orchestrator sees `content-publish` task with `status: pending-verification`

The orchestrator creates a `verify-publish` task. `verification-agent` runs dual-pass audit:
- **Pass 1 (Technical)**: No broken HTML, no 404 links, schema present where expected, page renders
- **Pass 2 (Semantic)**: Content matches the brief intent, H2 structure present, no generic filler, CTA is specific

If both passes succeed → task marked `completed`. If either fails → `rolling-back` and the live post is reverted to draft.

---

## Step 7 — Schema Coverage Check

**Agent**: `seo-orchestrator` (self)
**Skill**: `schema-auditor`

Run `schema-auditor` on all pages published or updated this week (URLs from completed `content-publish` tasks).

For each page missing schema:
- Homepage missing Organization schema → flag as CRITICAL
- Blog post missing Article/BlogPosting schema → create `website-edit` task for `content-publisher` to inject via CMS
- FAQ sections without FAQPage schema → create `website-edit` task
- Product/service pages missing schema → flag for developer (JSON-LD injection required)

---

## Step 8 — Log and Report

**Agent**: `seo-orchestrator`

After all content tasks for the week reach `completed` or `blocked` status:
- Append a summary to `companies/<slug>/memory/episodic.md`:
  - New blog post: title, target keyword, draft path or live URL, gate iteration count
  - Updated posts: list of URLs refreshed and the specific change made
  - Schema: list of schemas added or flagged
- Any `blocked` tasks: log reason and create `human-review` task
