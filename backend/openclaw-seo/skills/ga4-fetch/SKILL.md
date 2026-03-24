---
name: ga4-fetch
description: "Fetches organic session metrics, engagement rates, conversion events, and page-level traffic from Google Analytics 4 via the GA4 Data API. Use when: (1) building a weekly performance snapshot, (2) snapshot-generator requests organic traffic data, (3) identifying top landing pages by organic sessions. NOT for: GSC query/keyword data (use gsc-fetch), paid traffic analysis, real-time dashboards."
metadata:
  {
    "openclaw": {
      "emoji": "📡",
      "requires": { "bins": ["node"] }
    }
  }
---

# GA4 FETCH Skill

Fetches organic performance data from Google Analytics 4 via the Data API.

## Quick Start
```bash
cd scripts/ && node ga4-fetch.js <company-slug> [--days=7]
```

## When NOT to Use

❌ **DON'T use this skill when:**
- You need keyword query data → use `gsc-fetch`
- You need competitor data → use `serper-miner`
- Analyzing paid/direct traffic (this skill filters to organic channel only)

## Output
Returns a JSON object. See `references/ga4-fields.md` for all field names and dimension definitions.

## Rules
- Load `GA4_PROPERTY_ID` and `GOOGLE_SERVICE_ACCOUNT_JSON` from the company `.env`.
- Always request `organicGoogleSearch` channel group filter.
- Default date range: last 7 days. Pass `--days=30` for monthly snapshots.