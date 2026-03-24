---
name: report-generator
description: "Orchestrates end-to-end report production for a company: (1) generates or refreshes current-snapshot.md from GSC/GA4 data, (2) writes 14 SEO strategy sheet .md files + .meta.json to companies/<slug>/reports/<period>/sheets/, (3) triggers excel-porter to produce the .xlsx deliverable. Use when: the weekly-strategy workflow begins, a monthly report is due, or the operator requests a fresh report. NOT for: raw metric fetching (use ga4-fetch/gsc-fetch), Excel-only output (use excel-porter directly). Scheduling: the heartbeat reads each company's report_period from active-plan.json and schedules this skill accordingly — do not hardcode company slugs or periods."
metadata:
  {
    "openclaw": {
      "emoji": "📋",
      "requires": { "bins": ["python3"] }
    }
  }
---

# REPORT GENERATOR Skill

Orchestrates the full weekly/monthly SEO report pipeline for a company.

## Responsibilities

1. **Snapshot**: Ensures `technical/current-snapshot.md` is fresh (calls `snapshot-generator` skill or writes directly using data from `ga4-fetch` + `gsc-fetch`)
2. **Sheets**: Writes 14 strategy sheet `.md` files + matching `.meta.json` metadata files to `companies/<slug>/reports/<period>/sheets/`
3. **Excel**: Calls `excel-porter` skill to produce the `.xlsx` workbook

## Scheduling Logic (Heartbeat-Driven)

The heartbeat inspects `companies/<slug>/plans/active/active-plan.json`:
- Reads `report_period` (e.g. `2026-03` or `2026-W11`) and `current_week`
- Determines if a report is due based on cadence (weekly or monthly)
- Enqueues a `generate-report` task for the `data-intelligence` agent
- The skill itself is **stateless regarding scheduling** — it reads the period from the task context

## Quick Start

```bash
# Run full report pipeline for a period
cd skills/report-generator/scripts/ && node report-generator.js <company-slug> <period> [--snapshot-only] [--sheets-only]
```

## Task Context

The heartbeat passes this context to the `data-intelligence` agent:

```json
{
  "type": "generate-report",
  "company": "<slug>",
  "report_period": "2026-W11",
  "priority": "normal",
  "context": {
    "period": "YYYY-MM or YYYY-WNN",
    "force_refresh_snapshot": true,
    "trigger_excel": true,
    "schedule_source": "active-plan.json",
    "scope_flags": { ... }
  }
}
```

## Output Structure

```
companies/<slug>/reports/<period>/
  SEO_Strategy_<slug>_<date>.xlsx   ← excel-porter output
  sheets/
    00-digital-presence-baseline.md
    00-digital-presence-baseline.meta.json
    01-executive-summary.md
    01-executive-summary.meta.json
    ...
    13-kpis-metrics.md
    13-kpis-metrics.meta.json
```

## Sheet Numbering Convention

| # | Filename | Name |
|---|----------|------|
| 00 | `00-digital-presence-baseline.md` | Digital Presence Baseline |
| 01 | `01-executive-summary.md` | Executive Summary |
| 02 | `02-gap-analysis.md` | Gap Analysis |
| 03 | `03-competitor-analysis.md` | Competitor Analysis |
| 04 | `04-twelve-week-plan.md` | Twelve Week Plan |
| 05 | `05-keyword-research.md` | Keyword Research |
| 06 | `06-location-pages.md` | Location Pages |
| 07 | `07-citations-backlinks.md` | Citations & Backlinks |
| 08 | `08-youtube-strategy.md` | YouTube Strategy |
| 09 | `09-reddit-quora.md` | Reddit & Quora |
| 10 | `10-review-strategy.md` | Review Strategy |
| 11 | `11-schema-markup.md` | Schema Markup |
| 12 | `12-weekly-tasks.md` | Weekly Tasks |
| 13 | `13-kpis-metrics.md` | KPIs & Metrics |

## Sheet .meta.json Schema

Each sheet's `.meta.json` contains the full enriched schema. The script computes all counts from actual content.

```json
{
  "sheet_number": 1,
  "sheet_name": "Executive Summary",
  "sheet_id": "01-executive-summary",
  "period": "2026-W11",
  "content_hash": "<md5 hex — content fingerprint for change detection>",
  "generated_at": "<ISO timestamp>",
  "generated_by": "report-generator",
  "validation_status": "pending|passed|failed",
  "validation_errors": null,
  "summary": "<1-sentence summary (max 150 chars) of what this sheet covers>",
  "highlights": ["<finding 1 (max 80 chars)>", "<finding 2>", "<finding 3>"],
  "keywords_count": <int|null — rows in Sheet 05 keyword table>,
  "competitors_analyzed": <int|null — rows in Sheet 03 competitor table>,
  "gaps_identified": <int|null — GAP-### references in Sheets 02 & 04>,
  "tasks_generated": <int|null — rows in Sheet 12 task table>,
  "data_sources": ["ga4", "gsc", "serper-miner", "crawl-browser"],
  "linked_sheets": ["05-keyword-research"],
  "created_at": "<ISO timestamp>",
  "updated_at": "<ISO timestamp>"
}
```

**After sheets are written**, the script automatically runs `sheet-validator.py` and updates `validation_status` in all `.meta.json` files to `passed` or `failed`.

## Snapshot Refresh Logic

1. Check `companies/<slug>/technical/current-snapshot.md` — parse `**Generated**:` timestamp
2. If snapshot is older than `snapshot_max_age_hours` (from task context, default 24), regenerate:
   - Read `memory/snapshots/snapshot-*.json` files for cached data
   - Or call `ga4-fetch` + `gsc-fetch` + `rank-track` skills directly
   - Rewrite `current-snapshot.md` with fresh data
3. If snapshot is fresh, skip to sheet generation

## Rules

- **Do NOT hardcode company slugs** — read from task context
- **Do NOT hardcode periods** — read from `report_period` in context
- **Read `active-plan.json`** for scope flags and phase context (not for task counts — use the weekly `.meta.json` for that; the dashboard reads task counts from the synced weekly `.meta.json`)

- **Write .meta.json alongside every .md** — the API reads both
- **Always call excel-porter** after writing sheets (unless `--sheets-only` flag)
- **Log output path** to `memory/episodic-log.txt` on completion

## Dependencies

- `python3` (for excel-porter via openpyxl)
- `ga4-fetch` skill (for live GA4 data)
- `gsc-fetch` skill (for live GSC data)
- `rank-track` skill (for keyword position data)
- `excel-porter` skill (for .xlsx generation)
