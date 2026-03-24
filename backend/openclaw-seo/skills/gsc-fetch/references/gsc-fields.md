# GSC Search Analytics API — Field Reference

Used by `gsc-fetch` and `snapshot-generator` skills.

## Response Row Fields

| Field | Type | Description | Example |
|---|---|---|---|
| `query` | string | The exact search query | `"<target keyword>"` |
| `page` | string | Full URL of the ranking page | `"https://site.com/cabins"` |
| `country` | string | 3-letter country code | `"usa"` |
| `device` | string | Device type | `"MOBILE"`, `"DESKTOP"`, `"TABLET"` |
| `clicks` | integer | Number of organic clicks | 142 |
| `impressions` | integer | Number of times shown in SERP | 3820 |
| `ctr` | float | Click-through rate (clicks/impressions) | 0.037 |
| `position` | float | Average ranking position | 4.2 |

## Dimensions (grouping options)

| `dimensions` value | Groups data by |
|---|---|
| `["query"]` | Per search query |
| `["page"]` | Per URL |
| `["query","page"]` | Per query+URL combo |
| `["country","query"]` | Per country+query |
| `["device"]` | By device type |

## Request Structure

```json
{
  "startDate": "2026-02-23",
  "endDate": "2026-03-08",
  "dimensions": ["query"],
  "rowLimit": 25000,
  "startRow": 0,
  "dimensionFilterGroups": [{
    "filters": [{
      "dimension": "country",
      "operator": "equals",
      "expression": "usa"
    }]
  }]
}
```

## Pagination

The API returns max 25,000 rows per call. To paginate:
- Set `startRow` to multiples of 25000 until response returns fewer rows than `rowLimit`.

## Date Range Shortcuts

Use ISO 8601 format `YYYY-MM-DD`. No relative shorthand — compute dates in script.

## Required .env Variables

| Variable | Description |
|---|---|
| `GSC_SITE_URL` | Exact verified property URL (e.g. `https://site.com/`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Path to service account JSON or inline JSON string |

## Authentication

Same Google Service Account used for GA4. Must be added as a **Full User** on the GSC property.
