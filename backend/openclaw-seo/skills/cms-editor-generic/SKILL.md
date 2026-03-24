---
name: cms-editor-generic
description: "Edits, creates, or deletes published web content on a non-WordPress CMS via its REST API (Webflow, Contentful, Sanity, Ghost, etc.). Use when: (1) the company's site runs a non-WordPress CMS, (2) a blog draft is ready to be published to the live site. NOT for: WordPress sites (use cms-wordpress or wpcli-manager), generating content (use blog-generate), bulk operations (use wpcli-manager)."
metadata:
  {
    "openclaw": {
      "emoji": "📝",
      "requires": { "bins": ["node"] }
    }
  }
---

# CMS EDITOR GENERIC Skill

Publishes or edits content on non-WordPress CMS platforms via REST API.

## Quick Start
```bash
cd scripts/ && node cms-editor-generic.js <company-slug> --action=publish|update|delete --draft=<path>
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Site is WordPress → use `cms-wordpress` or `wpcli-manager`
- Content hasn't been drafted yet → use `blog-generate` first

## Output
Returns `{ postId, liveUrl, status: "published"|"updated"|"deleted" }`.

## Rules
- Load CMS API credentials (`CMS_API_KEY`, `CMS_ENDPOINT`) from company `.env`.
- Always verify the draft exists at the given path before attempting publish.
- Log the live URL to `memory/episodic.md` after each successful publish.
- Always backup the current item state before applying any update.

## Patch Policy — Minimal Footprint

**Default behavior is surgical patching of content fields only.**

When updating an existing item:
1. Fetch current item state from the CMS first
2. Patch only the specific content fields from the draft (title, body, meta)
3. Leave design tokens, component configs, and layout fields untouched

### Fields that must NEVER be patched without explicit operator instruction:
- Design tokens / style overrides (colors, fonts, spacing)
- Component or section templates
- Navigation structure
- Brand imagery or logo references
- Global site settings

### Human review required before patching:
- Adding or removing a top-level collection item that affects site navigation
- Changing content type schema or component structure
- Deleting any published item (always requires explicit approval)
- Any update that touches design or layout fields

Write proposed changes to `reviews/<slug>-cms-review.md` and set task status to `waiting-human` for these cases.
