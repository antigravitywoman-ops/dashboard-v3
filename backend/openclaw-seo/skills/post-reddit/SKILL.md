---
name: post-reddit
description: "Transforms a gate-approved blog draft into a Reddit-native post or comment using brand voice guidelines, community research, and deduplication checks. Submits to the target subreddit with the correct tone and format for that community. Use when: off-page workflow routes a distribute-content task with reddit as a channel. NOT for: Quora answers (post-quora), LinkedIn posts (post-linkedin), other forums (forum-commenter)."
metadata:
  {
    "openclaw": {
      "emoji": "🤖",
      "requires": { "bins": ["node"] }
    }
  }
---

# POST REDDIT Skill

Transforms a gate-approved blog draft into Reddit-native content using community research, brand voice guidelines, and deduplication logic. This skill does NOT copy the blog post — it extracts the core insight and rewrites it for the specific subreddit's culture.

## Quick Start
```bash
cd scripts/ && node post-reddit.js <company-slug> \
  --subreddit=<r/name> \
  --draft=<path-to-md> \
  --angle="<distribution_reddit_angle from frontmatter>"
```

## When NOT to Use

❌ Don't use when:
- Question-answer format → use `post-quora`
- B2B professional audience and no matching subreddit → use `post-linkedin`
- Non-Reddit forums → use `forum-commenter`
- The same subreddit was posted to within 7 rolling days (check distribution-log.md first)

---

## Role of This Skill

This skill **validates structure and executes the API call**. It does not generate content. The content-publisher (invoker) has already extracted the relevant section from the master draft and reformatted it using the angle brief and the structural rules below. This skill receives pre-prepared text via `--text-file` and handles subreddit rules checks, karma mode, and the Reddit API submission.

## Structural Rules (used by content-publisher during extraction + reformatting)

The content-publisher applies these rules when preparing the post text before calling this skill.

### Step 1 — Read all inputs
- Master draft: path from task `result_path` (the pending-publish .md file)
- `distribution_reddit_angle` from the draft's frontmatter — this is the Brain's pre-planned angle hint (e.g., "frame as a cost-comparison question for first-time resort guests")
- `companies/<slug>/about/brand-voice.md` → extract Reddit tone descriptor. Strip all corporate language, slogans, and sales framing regardless of brand voice level
- `companies/<slug>/about/profile.md` → industry, geography, service type — needed for domain-specific language
- `companies/<slug>/memory/sheets/09-reddit-quora.md` → pre-identified subreddits, karma status, approved angles per subreddit

### Step 2 — Subreddit context check
- Use `crawl-firecrawl` to scrape the subreddit's rules page and top 10 hot posts
- Determine: link posts allowed? text posts only? comments on existing threads preferred?
- Identify what content format earns upvotes in this community (story, question, resource share, how-to)
- If subreddit rules prohibit promotional posts entirely and the company has < 100 karma there → mark `reddit-skip-no-karma-rights`, log, move to next channel

### Step 3 — Deduplication and overlap check
Read `companies/<slug>/content/distribution-log.md`:
- If this subreddit appears in the last 7 rolling days → SKIP, log `rate-limit-skip`, move to next subreddit
- If a similar topic/angle was posted to ANY subreddit in the last 30 days → the angle MUST be distinct. Same insight from a different angle is acceptable; near-identical content across subreddits is not
- Check if the target URL already exists as a Reddit post using the script's Reddit search API call — if found, switch to comment mode on the existing thread rather than a new post

### Step 4 — Write the Reddit post (runtime generation)

The content-publisher generates the post text at runtime — this is NOT a static template. The script accepts pre-written post text as stdin or `--text-file` argument.

**Post structure for text posts:**

```
HOOK (line 1, required):
  One sentence that names the exact problem the community faces.
  Community-peer framing: "I spent 3 months comparing X and Y — here's what actually matters."
  OR observation: "Most [domain] advice skips the [specific part] entirely."
  NEVER start with: company name, "We published", "Check out", "Our article"

CORE VALUE BLOCK (2–4 sentences):
  Genuine useful information from the blog draft that stands alone WITHOUT the link.
  Use specific numbers, comparisons, and domain-specific observations from the draft.
  This section must be valuable enough that someone would upvote it even if the link disappeared.
  Do NOT copy blog paragraphs verbatim — extract the key insight in plain Reddit prose.

COMMUNITY QUESTION (optional but recommended):
  Ask the community something related to the insight.
  "Has anyone else run into this? What worked for you?"
  Signals genuine participation, increases engagement, and reduces mod-removal risk.

LINK (conditional):
  If link posts allowed: the post URL is the link — no link in body
  If text post only: "Full comparison here: [url]" as the last line — no "check out our site"
  If comment mode: DO NOT include link in body — post link in the first reply comment

NEVER include:
  - Company taglines or slogans
  - CTAs like "Book now", "Contact us", "Visit our website"
  - Multiple links
  - Disclosure that this is marketing content
```

**Tone calibration from brand-voice.md:**
- Professional brand voice → shift to knowledgeable peer tone (not executive, not salesperson)
- Conversational brand voice → use directly
- Prohibited words regardless of brand voice: "excited", "thrilled", "comprehensive", "world-class", "cutting-edge", "innovative", "seamless"
- If post reads like marketing copy → rewrite until it doesn't

**Length:**
- Text post body: 150–400 words
- Comment contribution: 80–200 words

### Step 5 — Karma and account standing check
The script reads account karma for this subreddit from the Reddit API response before posting:
- If account karma in this subreddit < 10 AND subreddit has > 100k members → use text-post format, link goes in the first comment (not body), log as `low-karma-mode`
- If account is new to subreddit AND subreddit has 'no self-promotion' rule → skip link entirely on first post, build karma first

---

## Output
Returns `{ postId, redditUrl, upvotes: 0, type: "post"|"comment", subreddit, angleUsed, karmaMode }`.

## Rules
- Load `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_REFRESH_TOKEN` from company `.env`
- Each subreddit gets exactly one post per 7 rolling days — no exceptions
- Never cross-post near-identical content to multiple subreddits — each must have a unique angle from `distribution_reddit_angle` or a derivative
- Read subreddit rules on every run — rules change and stale rule knowledge causes bans
- Log result immediately to `companies/<slug>/content/distribution-log.md`:
  `| <ISO> | reddit | <redditUrl> | <contentUrl> | <subreddit> | <angleUsed> | published |`
