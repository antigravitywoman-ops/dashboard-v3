---
name: audit-enricher
description: "Post-processes raw crawl audit JSON files to compute dashboard-required fields: summary counts, health_score, meta_summary, and highlights. Run this after crawl-browser or crawl-firecrawl completes. Use when: (1) onboarding crawl finishes, (2) weekly technical audit crawl completes. NOT for: schema audits or pagespeed checks alone — those are standalone.
---
metadata:
  {
    "openclaw": {
      "emoji": "🧮",
      "requires": { "bins": ["node"] }
    }
  }
---

# AUDIT ENRICHER Skill

Reads a raw crawl audit JSON (from `crawl-browser` or `crawl-firecrawl`) and enriches it with **computed fields** required by the SEO dashboard:

- `summary.total_issues`, `summary.critical`, `summary.high`, `summary.medium`, `summary.low`, `summary.fixed`
- `health_score` (0–100)
- `meta_summary` (one-sentence health summary)
- `highlights` (3–5 key findings, max 80 chars each)

This skill is a **post-processing step**. The raw crawl writes `critical_issues[]`, `high_issues[]`, `medium_issues[]`, `low_issues[]` arrays and/or `pages[]`. This skill aggregates them into the flat `summary` object and computes derived values.

## Quick Start

```bash
cd skills/audit-enricher && \
node scripts/audit-enricher.js <company-slug> [--audit=<audit-filename>]
```

**Examples:**
```bash
# Enrich the most recent audit for a company
node scripts/audit-enricher.js rangani-engineering

# Enrich a specific audit file
node scripts/audit-enricher.js arpit-sharma-writing --audit=2026-03-15-onboarding-crawl.json
```

## What It Does

1. **Reads** the raw audit JSON from `companies/<slug>/technical/audits/<filename>.json`
2. **Classifies** all issues from `critical_issues[]`, `high_issues[]`, `medium_issues[]`, `low_issues[]` arrays by severity
3. **Computes** `summary` object with issue counts
4. **Computes** `health_score` (0–100) based on severity-weighted formula
5. **Generates** `meta_summary` — a human-readable sentence describing the site's health
6. **Extracts** `highlights` — top 5 short findings formatted as badge-friendly strings
7. **Writes** the enriched JSON back to the same file (in-place update), preserving all existing fields
8. **Generates** the `*.meta.json` sidecar file in the same directory, matching the `metadata-schemas.md` Technical Audit schema

## Health Score Formula

```
base_score = 100
deductions:
  each CRITICAL issue   → -15
  each HIGH issue       → -8
  each MEDIUM issue     → -3
  each LOW issue        → -1
  SPA detected + not fixed → -10
health_score = max(0, min(100, base_score - deductions))
```

Score ranges:
- **70–100**: Good (green)
- **40–69**: Needs Work (yellow)
- **0–39**: Critical (red)

## Health Score Deductions — Issue Impact Table

| Severity | Per-issue deduction | Example (5 issues) |
|---|---|---|
| CRITICAL | -15 | SPA routing broken, missing schema, unverified GBP |
| HIGH | -8 | Missing meta desc, slow PageSpeed, missing alt text |
| MEDIUM | -3 | Missing canonical, thin content |
| LOW | -1 | Missing hreflang, sitemap not submitted |

## meta_summary Generation Rules

`meta_summary` is a single sentence (max 200 chars). Logic:

1. **CRITICAL present**: `"Site health is critical — <N> critical issues need immediate attention."`
2. **HIGH issues dominant** (≥3 HIGH, no CRITICAL): `"Site has structural issues — <N> high-priority problems found."`
3. **Mostly MEDIUM/LOW**: `"Site structure is sound but <top_issue> needs attention."` — extract the most impactful MEDIUM issue type
4. **No issues**: `"No crawl issues detected. Site is fully accessible to search engines."`

## highlights Generation Rules

Extract up to **5** short findings (max 80 chars each) from issue types and messages:

- Use the issue `type` field if available
- Truncate to 80 chars with `...` if longer
- Sort by severity: CRITICAL first, then HIGH, then MEDIUM
- Skip duplicates

Examples:
```
"MISSING_CANONICAL_HOMEPAGE — Homepage has no canonical tag." (truncated to 80)
"SITE_STRUCTURE — Domain conflict: both www and non-www indexed."
```

## Output

Two files are written to `companies/<slug>/technical/audits/`:

**1. `<date>-onboarding-crawl.json`** — enriched in-place with these additional/updated fields:

```json
{
  "crawl_timestamp": "2026-03-15T12:31:12.701Z",
  "summary": {
    "total_issues": 18,
    "critical": 4,
    "high": 6,
    "medium": 5,
    "low": 3,
    "fixed": 0
  },
  "health_score": 34,
  "meta_summary": "Site health is critical — 4 critical issues need immediate attention.",
  "highlights": [
    "SERVER_ROUTING_BROKEN — 7 pages return 404 via JS",
    "MISSING_SCHEMA — No JSON-LD on any page",
    "GBP_NOT_VERIFIED — Google Business Profile unclaimed",
    "MISSING_META_DESC — 5 pages without descriptions",
    "SLOW_PAGE_SPEED — Mobile 45/100 on homepage"
  ],
  "critical_issues": [...],
  "pages": [...]
}
```

**2. `<date>-onboarding-crawl.meta.json`** — sidecar matching `metadata-schemas.md` Technical Audit schema:

## When to Run

| Workflow | When to call audit-enricher |
|---|---|
| `wf-company-onboarding.md` | After `crawl-browser` Step 4 completes |
| `wf-technical-audit.md` | After Step 1 (Full Site Crawl) completes |

```json
{
  "audit_type": "full-site",
  "crawl_timestamp": "2026-03-15T12:31:12.701Z",
  "pages_crawled": 4,
  "total_issues": 18,
  "critical": 4,
  "high": 6,
  "medium": 5,
  "low": 3,
  "fixed": 0,
  "health_score": 34,
  "meta_summary": "Site health is critical — 4 critical issues need immediate attention.",
  "highlights": ["..."],
  "scope_flags": null,
  "tool": "openclaw-seo/crawl-browser",
  "created_at": "2026-03-15T12:31:12.701Z",
  "updated_at": "2026-03-22T09:00:00.000Z"
}
```

## Rules

- Always run on the most recent audit file unless `--audit` is specified
- In-place update: modifies the existing audit JSON file
- Preserve all original fields — only add/update `summary`, `health_score`, `meta_summary`, `highlights`
- If the file already has these fields, replace them (allow re-run for updated counts)
- If `critical_issues`/`high_issues` arrays are missing but `summary` exists, skip enrichment (already enriched)
- If no issues arrays and no summary, create minimal summary from `pages.length` = 0 = no issues
- The `.meta.json` sidecar is always regenerated on each run (safe to re-run)
