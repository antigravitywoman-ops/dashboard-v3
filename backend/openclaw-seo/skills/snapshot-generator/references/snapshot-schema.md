# Snapshot Output Schema

The `snapshot-generator` skill writes a JSON file to `memory/snapshots/snapshot-<timestamp>.json`.

## Top-Level Structure

```json
{
  "generated_at": "2026-03-08T06:00:00Z",
  "company": "<company-slug>",
  "period": {
    "start": "2026-03-01",
    "end": "2026-03-07",
    "days": 7
  },
  "ga4": { ... },
  "gsc": { ... },
  "delta": { ... }
}
```

## `ga4` Object

```json
{
  "organicSessions": 1820,
  "totalSessions": 4250,
  "engagementRate": 0.62,
  "averageSessionDurationSec": 105,
  "conversions": 38,
  "topPages": [
    { "pagePath": "/services/cabin-rentals", "organicSessions": 340, "engagementRate": 0.71 },
    { "pagePath": "/blog/best-retreats", "organicSessions": 210, "engagementRate": 0.58 }
  ]
}
```

## `gsc` Object

```json
{
  "totalClicks": 3100,
  "totalImpressions": 84000,
  "avgCTR": 0.037,
  "avgPosition": 8.4,
  "topQueries": [
    { "query": "<target keyword 1>", "clicks": 142, "impressions": 3820, "ctr": 0.037, "position": 4.2 },
    { "query": "<target keyword 2>", "clicks": 98, "impressions": 2100, "ctr": 0.047, "position": 2.1 }
  ],
  "topPages": [
    { "page": "https://<your-domain>.com/<page-path>", "clicks": 340, "impressions": 5600, "position": 3.8 }
  ]
}
```

## `delta` Object

Compares against the previous snapshot file in `memory/snapshots/`. If no previous snapshot exists, all delta values are `null`.

```json
{
  "previousSnapshotFile": "snapshot-1741219200000.json",
  "organicSessionsChange": 210,
  "organicSessionsChangePct": "+13.1%",
  "avgPositionChange": -0.6,
  "totalClicksChange": 180,
  "gainedKeywords": ["<newly ranked keyword>"],
  "droppedKeywords": ["<keyword that fell out of top 10>"],
  "newEntries": ["<brand new keyword appearing>"]
}
```

## File Naming

`snapshot-<unix-timestamp-ms>.json`

The most recent file (sorted by filename descending) is always the current baseline.

## Delta Computation Rules

- `organicSessionsChange` = current `ga4.organicSessions` − previous `ga4.organicSessions`
- `avgPositionChange` = current `gsc.avgPosition` − previous `gsc.avgPosition` (negative = improvement)
- `gainedKeywords` = queries in top 10 this week, not in top 10 last week
- `droppedKeywords` = queries in top 10 last week, not in top 10 this week
