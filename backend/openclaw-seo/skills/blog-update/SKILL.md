---
name: blog-update
description: "Updates and refreshes an existing published blog post with improved keyword density, new information, additional entities, or schema additions based on a content audit. Use when: (1) a post is flagged as stale or underperforming in GSC/GA4 data, (2) the 12-week plan schedules a content refresh. NOT for: writing new posts from scratch (use blog-generate), making CMS edits directly (use cms-wordpress)."
metadata:
  {
    "openclaw": {
      "emoji": "🔄",
      "requires": { "bins": ["node"] }
    }
  }
---

# BLOG UPDATE Skill

Refreshes an existing post draft or published live article with SEO improvements.

## Quick Start
```bash
cd scripts/ && node blog-update.js <company-slug> --url=<post-url> --reason="<audit finding>"
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Post doesn't exist yet → use `blog-generate`
- You need to push edits directly to WordPress → chain with `cms-wordpress`

## Output
Produces an updated `.md` file at `companies/<slug>/drafts/<slug>-updated.md` with a diff summary of changes made.

## Rules
- Always retrieve the current live content via `crawl-firecrawl` before editing.
- Preserve existing heading IDs to avoid breaking anchor links.
- Add `<!-- updated: <date> -->` comment to the draft.

## Update Classification & Approval Gates

### MINOR updates (auto-approved, no human review needed)
Apply inline, within the existing content structure:
- Updating statistics, dates, or factual figures in existing sentences
- Adding or editing 1-2 sentences within an existing section
- Fixing broken links or updating URLs
- Adding/removing keywords within existing paragraphs
- Appending a new FAQ item to an existing FAQ section
- Updating meta description or title tag (SEO fields only)

**Constraint**: Do NOT restructure headings, reorder sections, or change page layout for minor updates.

### MAJOR updates (require human review before publishing)
A change is MAJOR if it involves any of the following — write the proposed update to `reviews/<slug>-update-review.md` and set task status to `waiting-human`:
- Adding, removing, or reordering H2/H3 sections
- Changing the post's primary keyword or topic angle
- Replacing >30% of the body content
- Adding a new page-level schema type (e.g., adding HowTo or VideoObject)
- Restructuring the page template or layout

**Even in MAJOR updates — the following must NEVER be changed without explicit operator instruction:**
- Brand colors (CSS variables, inline styles, hex/rgb values)
- Logo, favicon, or brand imagery
- Font families
- Navigation structure or header/footer content
- CTA button text or placement
- Brand voice/tone guidelines defined in `about/brand.md`

If a MAJOR update would require touching any of the above to be effective, stop, annotate the blocker, and write: `[BLOCKED: major structural change requires brand/design approval — flag to operator]`.
