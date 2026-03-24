---
name: crawl-firecrawl
description: "Crawls static or mostly-static websites rapidly via the Firecrawl API to extract text content, sitemaps, and internal link structure. Use when: (1) bulk crawling a domain to extract all page metadata, (2) extracting sitemap URLs, (3) performing a full technical content audit. NOT for: JS-rendered SPAs where content is not in source HTML (use crawl-browser), single-URL deep inspection."
metadata:
  {
    "openclaw": {
      "emoji": "🔥",
      "requires": { "bins": ["node"] }
    }
  }
---

# CRAWL FIRECRAWL Skill

Fast, bulk crawling via Firecrawl API. Best for static and mostly-static sites.

## Quick Start
```bash
cd scripts/ && node crawl-firecrawl.js <company-slug> --url=<site-url> [--limit=100]
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Site relies heavily on JS rendering → use `crawl-browser`
- You only need a single page's rendered content

## Output
Returns an array of page objects: `{ url, title, metaDesc, h1, wordCount, internalLinks[] }`.

## Rules
- Load `FIRECRAWL_API_KEY` from company `.env`.
- Default page limit: 100. Increase for large sites.
- Results saved to `memory/crawl-<timestamp>.json`.