---
name: gsc-fetch
description: "Fetches keyword-level query data (clicks, impressions, CTR, average position) from the Google Search Console Search Analytics API. Use when: (1) snapshot-generator needs query performance deltas, (2) building keyword ranking reports, (3) identifying queries losing clicks or dropping in position. NOT for: GA4 session/traffic data (use ga4-fetch), backlink data, site indexation issues."
metadata:
  {
    "openclaw": {
      "emoji": "🔍",
      "requires": { "bins": ["node"] }
    }
  }
---

# GSC FETCH Skill

Fetches Search Console query performance data grouped by query, page, country, or device.

## Quick Start
```bash
cd scripts/ && node gsc-fetch.js <company-slug> [--days=7] [--dimension=query|page]
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Organic session volume → use `ga4-fetch`
- Live SERP competitor positions → use `serper-miner`
- Backlink or domain authority data

## Output
Returns a JSON array of rows. See `references/gsc-fields.md` for all dimension and metric field names.

## Rules
- Load `GSC_SITE_URL` and `GOOGLE_SERVICE_ACCOUNT_JSON` from the company `.env`.
- Default dimension: `query`. For page-level data pass `--dimension=page`.
- Max 25,000 rows per call; paginate with `--startRow` if needed.