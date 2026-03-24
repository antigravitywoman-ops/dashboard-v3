---
name: pagespeed-fetch
description: "Fetches Core Web Vitals (LCP, CLS, INP) and performance scores for a given URL using the Google PageSpeed Insights API. Returns both lab data and field data (CrUX) where available. Use when: (1) wf-technical-audit runs the CWV check step, (2) validating that a recently updated page passes Core Web Vitals thresholds. NOT for: bulk crawling (use crawl-firecrawl), schema validation (use schema-auditor), keyword data (use gsc-fetch)."
metadata:
  {
    "openclaw": {
      "emoji": "⚡",
      "requires": { "bins": ["node"] }
    }
  }
---

# PAGESPEED FETCH Skill

Fetches Core Web Vitals and PageSpeed scores via the Google PageSpeed Insights API.

## Quick Start

```bash
cd scripts/ && node pagespeed-fetch.js <url> <company-slug> [--strategy=mobile|desktop]
```

## When NOT to Use

- Bulk crawling → use `crawl-firecrawl`
- Schema validation → use `schema-auditor`
- Traffic/keyword data → use `gsc-fetch` or `ga4-fetch`

## Output

Returns a JSON object saved to `memory/cwv-<timestamp>.json`:

```json
{
  "url": "<url>",
  "strategy": "mobile",
  "lcp": { "value": 2.4, "unit": "s", "rating": "good" },
  "cls": { "value": 0.08, "unit": "", "rating": "good" },
  "inp": { "value": 180, "unit": "ms", "rating": "good" },
  "performance_score": 82,
  "field_data_available": true,
  "source": "crux"
}
```

## Thresholds

| Metric | GOOD | NEEDS IMPROVEMENT | POOR |
|---|---|---|---|
| LCP | < 2.5s | 2.5s – 4.0s | > 4.0s |
| CLS | < 0.1 | 0.1 – 0.25 | > 0.25 |
| INP | < 200ms | 200ms – 500ms | > 500ms |
| Performance Score | > 90 | 50 – 90 | < 50 |

## Setup Requirements

- `PAGESPEED_API_KEY` in company `.env` (optional — API works without key but rate-limited)
- No other credentials required

## Rules

- Default strategy: `mobile` (Google uses mobile-first indexing)
- Always run mobile AND desktop for pages identified as POOR performers
- Flag any POOR rating as a CRITICAL issue in the technical audit report
- If API returns no field data (CrUX unavailable for low-traffic pages), note "lab data only" in output
