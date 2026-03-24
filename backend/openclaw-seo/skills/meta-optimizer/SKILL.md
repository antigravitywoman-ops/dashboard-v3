---
name: meta-optimizer
description: "Rewrites or improves a page's title tag and meta description based on GSC CTR data, target keyword, and SERP competition. Outputs optimized meta values as a structured object for the CMS skill to inject. Use when: (1) a page has >500 impressions but <2% CTR in GSC data, (2) the weekly on-page workflow schedules a meta refresh. NOT for: generating full blog content (use blog-generate), publishing to CMS (chain with cms-wordpress or cms-editor-generic)."
metadata:
  {
    "openclaw": {
      "emoji": "🎯",
      "requires": { "bins": ["node"] }
    }
  }
---

# META OPTIMIZER Skill

Generates optimized title tags and meta descriptions for underperforming pages based on CTR data and SERP analysis.

## Quick Start

```bash
cd scripts/ && node meta-optimizer.js <company-slug> --url=<page-url> --keyword=<target-keyword>
```

## When NOT to Use

- Writing full article content → use `blog-generate`
- Publishing meta changes directly → chain this skill's output with `cms-wordpress` or `cms-editor-generic`
- Schema markup → write JSON-LD directly or use `schema-auditor` to identify gaps

## Input

The skill reads:
- GSC data for the URL (from `technical/current-snapshot.md` or by calling `gsc-fetch`)
- Current title and meta from the live page (via `crawl-firecrawl`)
- SERP competitor titles for the target keyword (from stored `memory/competitors/serp-*.json`)
- Brand voice guidelines from `about/brand-voice.md`

## Output

Returns a JSON object:

```json
{
  "url": "<url>",
  "keyword": "<keyword>",
  "current": {
    "title": "<current title>",
    "meta_description": "<current meta>"
  },
  "optimized": {
    "title": "<new title — max 60 chars>",
    "meta_description": "<new meta — max 160 chars>",
    "reasoning": "<why this is better: includes keyword in first 30 chars, adds power word, matches searcher intent>"
  },
  "gsc_context": {
    "impressions": 1240,
    "ctr": 0.014,
    "avg_position": 12.4
  }
}
```

## Title Optimization Rules

- Include the primary keyword in the first 30 characters where natural
- Max 60 characters (will be truncated in SERP if longer)
- Include a differentiator (number, year, power word, or unique value prop)
- Avoid clickbait — the meta must accurately reflect the page content
- Match the dominant search intent for the keyword

## Meta Description Rules

- Max 160 characters
- Include the primary keyword naturally
- Include a clear value proposition or benefit
- Include a soft CTA (e.g., "See specs", "Learn how", "Compare options")
- Do not duplicate the title — the meta adds information the title doesn't convey

## Chain With

After generating optimized meta, pass the output to:
- `cms-wordpress` to inject title and description into Yoast/RankMath fields
- `cms-editor-generic` for non-WordPress CMS meta fields
