---
name: blog-generate
description: "Generates a new SEO-optimized long-form blog post from a topic brief, primary keyword, secondary keywords, and entity list. Outputs a Markdown draft with title, meta description, heading structure, and internal link placeholders. Use when: (1) content-writer is tasked to produce a new article, (2) the 12-week plan includes a new content piece. NOT for: refreshing existing content (use blog-update), social short-form posts (use post-* skills)."
metadata:
  {
    "openclaw": {
      "emoji": "✍️",
      "requires": { "bins": ["node"] }
    }
  }
---

# BLOG GENERATE Skill

Produces a full-length SEO blog draft in Markdown format.

## Quick Start
```bash
cd scripts/ && node blog-generate.js <company-slug> --keyword="<primary kw>" --topic="<brief>"
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Updating an existing post → use `blog-update`
- Creating social content → use `post-linkedin`, `post-reddit`, etc.
- Drafting outreach emails → use `outreach-drafter`

## Output
Writes a `.md` file to `companies/<slug>/drafts/<slug-title>-draft.md`.
Includes: title, meta description, H2/H3 structure, body content, CTA, internal link suggestions.

## Rules
- Always read `memory/business-goals.md` before generating to align tone and entities.
- Target word count: 1,200–2,500 words unless brief specifies otherwise.
- Do not fabricate statistics — use `[CITE]` placeholder instead.