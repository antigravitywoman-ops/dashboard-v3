---
name: wf-offpage-distribute
description: "Trigger-based off-page distribution workflow. Activated after verification-agent confirms a new blog post is live. Distributes content across Reddit, Quora, LinkedIn, and Medium using platform-specific rules. Executed by content-publisher (Hands) — the content-writer (Brain) has no access to social APIs."
trigger: event(content-published)
---

# Workflow: Off-Page Distribution

Distributes newly published content across community and social platforms to build off-page signals, referral traffic, and brand entity strength.

**Persona**: Off-Page Distribution Lead — conversational on Reddit, expert on Quora, professional on LinkedIn, polished on Medium.

**Important**: This workflow is executed exclusively by `content-publisher`. The `content-writer` agent has no access to social platform APIs and is never invoked in this workflow.

**Critical reference**: Read `system-memory/platform-rules.md` before distributing on any platform.

---

## Trigger Conditions

This workflow activates when:
1. A `verify-publish` task completes with both passes succeeding AND `distribute_on_verify: true` is set in the context
2. OR a `distribute-content` task appears in the queue (created by seo-orchestrator)

**Never** activate before verification passes — distributing a post that later rolls back creates broken external links.

**Input required** (from task context):
- `content_url`: the live URL of the published post
- `target_keyword`: the primary keyword the post targets
- `company_slug`: the company this content belongs to
- `channels`: list of distribution channels from `companies/<slug>/about/profile.md` (Distribution Platforms field) or derived from `memory/sheets/09-reddit-quora.md`

---

## Step 0 — Phase Gate

**Agent**: 
**Source**: 

Before distributing to any platform, verify the effective phase for this company.

1. Find the current active plan in  (filename matching current ISO week )
2. Extract  from the plan frontmatter
3. Apply phase rules:

| Platform | Foundation | Growth | Scale |
|---|---|---|---|
| Reddit () | BLOCKED | BLOCKED | ALLOWED |
| Quora () | BLOCKED | BLOCKED | ALLOWED |
| LinkedIn () | BLOCKED | BLOCKED | ALLOWED |
| Medium () | BLOCKED | BLOCKED | ALLOWED |
| GBP posts / directory submissions | ALLOWED | ALLOWED | ALLOWED |

**If  is  or **:
- Abort this workflow for all social channels (Reddit, Quora, LinkedIn, Medium)
- Log to : 
- Update the task: , 
- Do NOT retry automatically — this task is re-evaluated when the next weekly plan advances phase

**If  is  or **: proceed to Step 1.

> If no active plan exists for the current week, treat as Foundation (safe default) and abort.

---

## Step 1 — Read Distribution Plan

**Agent**: `content-publisher`
**Source**: Sheet 09 (Reddit & Quora) from `memory/sheets/09-reddit-quora.md` AND `companies/<slug>/about/profile.md` for platform activation flags (linkedin_active, etc.)

From the checklist, identify:
- Which subreddits are approved for this topic
- Which Quora questions match the content's target keyword
- Whether LinkedIn and Medium are active distribution channels for this company
- Rate limit status: check `companies/<slug>/memory/distribution-log.md` to avoid posting to the same subreddit within 7 days

---

## Step 2 — Canonical Index Check

**Agent**: `content-publisher`
**Skill**: `index-checker`

**Condition**: Before distributing to platforms that require canonical links (Medium, LinkedIn articles), you must verify the original CMS content is indexed by Google.
- Run `index-checker` on `content_url`.
- If `status: indexed`: proceed to social distribution.
- If `status: not-indexed`: abort the entire workflow for this URL. Reschedule task for 48 hours later. DO NOT syndicate to Medium or LinkedIn until indexation is confirmed, to prevent canonical theft.

---

## Step 3 — Reddit Distribution

**Agent**: `content-publisher`
**Skill**: `post-reddit`
**Rules** (from `system-memory/platform-rules.md`):
- Value-first tone — never start with a link or a product pitch
- No direct company link in the first 2 paragraphs
- Post only in subreddits where the account has karma history or where link posts are explicitly allowed
- Rate limit: 1 post per subreddit per 7 rolling days (check `distribution-log.md`)

**Content angle**:
- Read Sheet 09 for the pre-planned "Content Angle" for this subreddit
- Write a post that addresses a real community pain point; the blog post is the supporting resource
- Do NOT repost the same content to multiple subreddits — each post must be unique

**Critic check** before posting:
- Does the post provide genuine value without the link?
- Would a moderator remove this as promotional?
- Is the subreddit still relevant to the keyword?

---

## Step 4 — Quora Distribution

**Agent**: `content-publisher`
**Skill**: `post-quora`
**Rules** (from `system-memory/platform-rules.md`):
- Answer the question directly and fully in the first 150 words before any link
- Use data or specifics to demonstrate expertise (E-E-A-T)
- Max 3 Quora answers per day across all companies

**Source**: Sheet 09 lists pre-identified Quora questions matching the target keyword.

**Critic check** before posting:
- Is this answer genuinely the best answer to the question, independent of the link?
- Does the link add value without being promotional?

---

## Step 5 — LinkedIn Distribution

**Agent**: `content-publisher`
**Skill**: `post-linkedin`
**Condition**: Only distribute on LinkedIn if `linkedin_active: true` in `about/profile.md`
**Rules** (from `system-memory/platform-rules.md`):
- Hook in the first line (no fluff)
- Paragraphs max 2 lines (LinkedIn formatting)
- 3-5 relevant hashtags at the end
- Link in post or first comment (per brand voice settings in `about/brand-voice.md`)
- Max post length: 3,000 characters

**Content angle**: Adapt the blog post angle for a professional audience. Emphasize business outcomes, not technical details.

---

## Step 6 — Medium Syndication

**Agent**: `content-publisher`
**Skill**: `post-medium`
**Condition**: Only syndicate to Medium if the post is 800+ words AND the topic has a general audience (not niche B2B with no Medium readership)
**Rules** (from `system-memory/platform-rules.md`):
- ALWAYS set `canonicalUrl` to the original company domain URL — this is not optional
- Tags: 3-5 Medium tags matching the article topic
- Do not rephrase or rewrite the content — syndicate the original

---

## Step 7 — Distribution Log

**Agent**: `content-publisher`
**Target file**: `companies/<slug>/content/distribution-log.md`

After each successful distribution action, append:

```markdown
| <ISO timestamp> | <platform> | <post URL or "draft"> | <content URL> | <status: published/failed> |
```

This log is read in Step 1 of the next distribution cycle to enforce rate limits.

---

## Error Handling

| Scenario | Response |
|---|---|
| Reddit API auth fails | Mark task blocked; log to episodic; do not retry automatically |
| Subreddit rate limit hit | Skip this subreddit; log to distribution-log; move to next channel |
| Quora session token expired | Mark task blocked; run `auth-manager` for Quora refresh |
| LinkedIn token expired | Mark task blocked; run `auth-manager` for LinkedIn refresh |
| Medium canonical not settable | Abort Medium syndication; do not publish without canonical link |
| Content not indexed yet | Abort workflow; reschedule for +48 hours |
| Content is too thin for distribution | Skip all channels; log to episodic; flag for content-writer to expand |
