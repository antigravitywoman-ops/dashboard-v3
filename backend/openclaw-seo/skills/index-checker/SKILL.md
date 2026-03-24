---
name: index-checker
description: "Checks the Google index status of specific URLs using the GSC URL Inspection API. Returns whether a URL is indexed, the canonical Google selected, last crawl date, and any coverage issues. Use when: (1) verifying newly published pages have been indexed, (2) investigating why a page is missing from search results. NOT for: bulk keyword data (use gsc-fetch), crawling site content (use crawl-firecrawl)."
metadata:
  {
    "openclaw": {
      "emoji": "🔎",
      "requires": { "bins": ["node"] }
    }
  }
---

# INDEX CHECKER Skill

Checks indexation status of specific URLs via the Google Search Console URL Inspection API.

## Quick Start

```bash
cd scripts/ && node index-checker.js <company-slug> --url=<url>
cd scripts/ && node index-checker.js <company-slug> --urls-file=<path-to-url-list.txt>
```

## When NOT to Use

- Bulk keyword/query data → use `gsc-fetch`
- Crawling page content → use `crawl-firecrawl` or `crawl-browser`
- Checking 404s and HTTP status → covered by `crawl-firecrawl` output

## Output

Returns per-URL:

```json
{
  "url": "<url>",
  "indexing_state": "INDEXING_ALLOWED" | "BLOCKED_BY_ROBOTS_TXT" | "NOT_INDEXED" | "INDEXED",
  "coverage_state": "Submitted and indexed" | "Crawled - currently not indexed" | ...,
  "google_canonical": "<canonical url>",
  "last_crawl_time": "<ISO timestamp>",
  "crawl_allowed": true,
  "indexing_allowed": true,
  "page_fetch_state": "SUCCESSFUL" | "BLOCKED" | "SOFT_404" | ...
}
```

Saved to `memory/index-check-<timestamp>.json`.

## Setup Requirements

- `GOOGLE_SERVICE_ACCOUNT_JSON` in company `.env`
- `GSC_SITE_URL` in company `.env`
- Service account must have Search Console Read access for the property

## Rules

- Run for all pages published in the last 7 days during the weekly technical audit
- Flag any URL that is NOT_INDEXED more than 72 hours after publishing as a WARNING
- Flag any URL where `google_canonical` differs from the submitted URL as a potential issue
- Rate limit: GSC URL Inspection API allows 2,000 queries per day per property
