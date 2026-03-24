# GA4 Data API — Field Reference

Used by `ga4-fetch` and `snapshot-generator` skills.

## Metric Names

| Metric | Description | Example Value |
|---|---|---|
| `sessions` | Total sessions | 4250 |
| `organicGoogleSearchSessions` | Sessions from organic Google search | 1820 |
| `engagementRate` | Sessions with >10s engagement / total sessions | 0.62 |
| `averageSessionDuration` | Mean session duration in seconds | 105 |
| `conversions` | Count of configured conversion events | 38 |
| `screenPageViews` | Total page views | 9400 |
| `bounceRate` | Sessions without engagement / total sessions | 0.38 |
| `newUsers` | First-time users | 1340 |

## Dimension Names

| Dimension | Description | Example Value |
|---|---|---|
| `landingPage` | First page of session (path only) | `/services/cabin-rentals` |
| `pagePath` | Individual page path | `/blog/best-retreats` |
| `sessionDefaultChannelGroup` | Channel bucket | `Organic Search` |
| `date` | Date in YYYYMMDD format | `20260301` |
| `country` | Country name | `United States` |
| `deviceCategory` | Device type | `mobile`, `desktop`, `tablet` |

## Channel Group Filter for Organic Only

```json
{
  "dimensionFilter": {
    "filter": {
      "fieldName": "sessionDefaultChannelGroup",
      "stringFilter": {
        "value": "Organic Search"
      }
    }
  }
}
```

## Date Range Format

```json
{
  "dateRanges": [
    { "startDate": "7daysAgo", "endDate": "today" }
  ]
}
```

Accepted values: `NdaysAgo`, `yesterday`, `today`, or `YYYY-MM-DD`.

## Required .env Variables

| Variable | Description |
|---|---|
| `GA4_PROPERTY_ID` | Numeric property ID (e.g. `123456789`) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Path to service account JSON file or inline JSON string |

## Authentication

Use a Google Service Account with **Viewer** role on the GA4 property.
The service account must be added as a user in GA4 Admin > Account Access Management.
