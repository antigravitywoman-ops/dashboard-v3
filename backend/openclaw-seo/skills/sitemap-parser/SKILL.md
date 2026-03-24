---
name: sitemap-parser
description: "Fetches and parses an XML sitemap (or sitemap index) from a given URL. Returns all URLs found, their lastmod dates, priority, and changefreq values. Compares sitemap URLs against crawled URLs to find orphans or missing pages. Use when: (1) validating sitemap coverage during technical audit, (2) seeding the crawl-firecrawl URL list for large sites. NOT for: checking live HTTP status of URLs (use crawl-firecrawl), keyword data (use gsc-fetch)."
metadata:
  {
    "openclaw": {
      "emoji": "🗺️",
      "requires": { "bins": ["node"] }
    }
  }
---

# SITEMAP PARSER Skill

Parses XML sitemaps and sitemap indexes to extract and validate URL coverage.

## Quick Start

```bash
cd scripts/ && node sitemap-parser.js <company-slug> --sitemap-url=<https://example.com/sitemap.xml>
```

If sitemap URL is not provided, the skill will attempt `<site_url>/sitemap.xml` and `<site_url>/sitemap_index.xml` from the company `.env`.

## When NOT to Use

- Checking HTTP status of crawled pages → use `crawl-firecrawl`
- Keyword or ranking data → use `gsc-fetch`

## Output

Returns a JSON object saved to `memory/sitemap-<timestamp>.json`:

```json
{
  "sitemap_url": "<url>",
  "total_urls": 142,
  "url_count_by_type": { "page": 45, "post": 89, "product": 8 },
  "urls": [
    { "loc": "<url>", "lastmod": "<date>", "priority": "0.8", "changefreq": "weekly" }
  ],
  "issues": [
    { "type": "missing_lastmod", "urls": ["<url1>", "<url2>"] },
    { "type": "priority_all_same", "note": "All URLs have priority 0.5 — likely auto-generated" }
  ]
}
```

## Rules

- Supports sitemap indexes (follows child sitemaps automatically)
- Flag any sitemap returning a non-200 HTTP status as CRITICAL
- Flag if total URL count differs from last audit by >10% (possible mass deindex or sitemap error)
- If no sitemap found at standard locations: flag as CRITICAL in the technical audit report
- Saves last known URL count for WoW comparison on next run
