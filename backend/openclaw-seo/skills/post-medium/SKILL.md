---
name: post-medium
description: "Syndicates a gate-approved blog article to Medium.com with canonical URL preservation, adapted introduction for cold readers, platform-appropriate formatting, and relevant tags. Targets Medium publications in the niche when available. Use when: wf-offpage-distribute includes medium as a channel for an 800+ word post with broad audience appeal. NOT for: short posts (under 800 words), hyper-local B2B topics with no Medium readership, re-syndicating a URL already on Medium."
metadata:
  {
    "openclaw": {
      "emoji": "📰",
      "requires": { "bins": ["node"] }
    }
  }
---

# POST MEDIUM Skill

Syndicates a blog article to Medium with an adapted introduction for cold readers, correct canonical URL, and platform-specific formatting. Medium content must be substantially the same as the original to preserve canonical protection — only the introduction paragraph is adapted.

## Quick Start
```bash
cd scripts/ && node post-medium.js <company-slug> \
  --draft=<path-to-md> \
  --canonical=<original-live-url>
```

## When NOT to Use

❌ Don't use when:
- Post is under 800 words → insufficient syndication value
- Topic is hyper-local or niche B2B with no Medium readership (e.g., technical structural engineering specs for a local firm)
- This canonical URL already appears in `distribution-log.md` with platform `medium` → never re-syndicate the same canonical
- Medium API cannot set canonicalUrl → abort entirely, do not publish without it

---

## Role of This Skill

This skill **validates canonical URL, selects tags, and executes the API call**. It does not generate content. The content-publisher has already replaced the opening paragraphs with the cold-reader-adapted intro (from `distribution_medium_intro`) and appended the "Originally published at" line. The body is verbatim from the master draft. This skill receives the adapted full article text, confirms canonical URL is set, looks up tag follower counts, and submits via the Medium API.

## Structural Rules (used by content-publisher during adaptation)

The content-publisher applies these rules when preparing the article before calling this skill.

### Step 1 — Read all inputs
- Full master draft from `result_path`
- `distribution_medium_intro` from frontmatter — Brain's hook written for cold Medium readers who don't know the brand (e.g., "Most luxury resort guests don't realize that eco-certification directly correlates with price stability — here's the data.")
- `companies/<slug>/about/brand-voice.md` → Medium tone (usually: polished, informational, thought-leadership; strip local/brand-specific framing)
- `companies/<slug>/about/profile.md` → author bio, any listed Medium publications
- Live URL from task `result.live_url` — this MUST exist before Medium syndication runs

### Step 2 — Deduplication check
Read `companies/<slug>/content/distribution-log.md`:
- If the same canonical URL appears in the log with platform `medium` → STOP, log `already-syndicated`, do not proceed
- This check is absolute — Medium will flag duplicate canonical content and the company loses canonical protection on the original post

### Step 3 — Introduction adaptation (REQUIRED)

The blog post introduction often assumes the reader knows the brand, the local market, or the company's context. Medium readers are cold — they arrived from a tag feed or a publication, not from the company website.

**Replace only the first 2–3 paragraphs** with a Medium-native introduction. Keep all H2 sections and body content verbatim.

**Medium intro structure:**
```
UNIVERSAL HOOK (1–2 sentences):
  A truth, tension, or surprising insight about the topic that ANY reader in the niche cares about.
  Use the distribution_medium_intro from frontmatter as the starting material.
  Do NOT start with: company name, location-specific context, "In this article we will...", "We are a..."

CONTEXT BRIDGE (1–2 sentences):
  Why this matters right now — frame it for Medium's audience (typically: curious professionals, generalist readers, or niche practitioners depending on the publication)

WHAT THIS DELIVERS (1 sentence):
  "By the end of this piece, you'll understand X, Y, and Z."
  This is a Medium best practice — readers decide in 10 seconds whether to continue.

[REST OF ARTICLE BODY — verbatim from blog draft, H2 onward]

CLOSING LINE (append at end of article):
  "Originally published at [company domain URL]"
  This is Medium convention and reinforces the canonical relationship.
```

### Step 4 — Tag selection (3–5 tags required)

Medium tags determine which feed the article appears in. Select carefully:
- Tag 1: Primary industry (e.g., "Hospitality", "Civil Engineering", "Marketing")
- Tag 2: Topic cluster matching `target_keyword` (e.g., "SEO", "Sustainability", "Project Management")
- Tag 3: Audience-type (e.g., "Small Business", "Startups", "Entrepreneurs", "Design")
- Tag 4–5 (optional): From `companies/<slug>/memory/sheets/05-keyword-research.md` related clusters

Use the script's Medium tag lookup to verify each tag exists and has > 500 followers. Replace tags with < 500 followers with the next best option from the keyword clusters.

### Step 5 — Publication targeting (optional, high-value)
If `companies/<slug>/about/profile.md` lists Medium publication names:
- The script checks if the company has an active submission relationship with those publications
- If yes: submit as a draft to the publication (higher reach, curated audience, but requires editor approval)
- Log status as `pending-publication-review` instead of `published` — manual follow-up needed
- If no publication: publish to author feed directly

### Step 6 — Canonical URL enforcement

This step is non-negotiable:
- `canonicalUrl` in the Medium API call MUST be set to `result.live_url` from the task context
- If the API call returns an error on the canonical field → ABORT, do not publish
- Log: `medium-canonical-not-settable` → mark the medium distribution step as `blocked-canonical` (this blocks Medium only, not other channels)
- Never publish to Medium without canonical protection — it would create a duplicate content penalty against the company's own domain

---

## Output
Returns `{ postId, mediumUrl, canonicalSet: true|false, publicationSubmitted: true|false, tagsUsed, wordCount }`.

## Rules
- Load `MEDIUM_INTEGRATION_TOKEN` from company `.env`
- ALWAYS set canonical URL — never skip or work around this
- CMS publish (Stage 4) MUST complete before Medium syndication — `result.live_url` must exist
- Log result immediately to `companies/<slug>/content/distribution-log.md`:
  `| <ISO> | medium | <mediumUrl> | <contentUrl> | <canonical> | <tagsUsed> | published |`
- After publishing: confirm `canonicalSet: true` in the API response before logging as `published`
