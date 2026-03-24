---
name: excel-porter
description: "Converts structured Markdown sheet files from memory/sheets/ into a fully formatted multi-sheet Excel workbook (.xlsx) with colors, freeze panes, column widths, formulas, and conditional formatting. Use when: (1) all strategy sheet .md files are ready in memory/sheets/ and the final Excel deliverable is needed, (2) re-generating the .xlsx after a sheet update. NOT for: writing strategy content (that is the research-analyst's job), parsing incoming Excel files (use excel-parser)."
metadata:
  {
    "openclaw": {
      "emoji": "📊",
      "requires": { "bins": ["python3"] }
    }
  }
---

# EXCEL PORTER Skill

Reads `memory/sheets/*.md` markdown table files and generates a real formatted `.xlsx` deliverable using openpyxl.

## Architecture

```
research-analyst writes:
  memory/sheets/01-executive-summary.md
  memory/sheets/02-gap-analysis.md
  ...
  memory/sheets/13-kpis-metrics.md

report-generator.js writes (dual copy):
  memory/sheets/           ← live copy (read by agents)
  reports/<period>/sheets/ ← immutable archive

excel-porter reads all → generates:
  companies/<slug>/reports/SEO_Strategy_<slug>_<date>.xlsx
```

## Quick Start
```bash
# Full workbook from memory/sheets/ (agent-driven path)
cd scripts/ && python3 excel-porter.py <company-slug>

# Full workbook from report archive (script path — via report-generator.js)
cd scripts/ && python3 excel-porter.py <company-slug> --source=reports/2026-W11/sheets/

# Single sheet re-render
cd scripts/ && python3 excel-porter.py <company-slug> --sheet=05-keyword-research
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Sheet `.md` files aren't written yet — ask research-analyst to write them first
- Parsing an incoming Excel file → use `excel-porter`
- Writing strategic content → that is the research-analyst's job

## Sheet File Convention

Each sheet file must use this naming in `memory/sheets/`:
```
01-executive-summary.md
02-gap-analysis.md
03-competitor-analysis.md
04-twelve-week-plan.md
05-keyword-research.md
06-location-pages.md
07-citations-backlinks.md
08-youtube-strategy.md
09-reddit-quora.md
10-review-strategy.md
11-schema-markup.md
12-weekly-tasks.md
13-kpis-metrics.md
```

Files must contain at least one **standard Markdown table**. Prose and headers above the table are treated as context and ignored by the porter.

## Output

Saves to `companies/<slug>/reports/SEO_Strategy_<slug>_<YYYY-MM-DD>.xlsx`.
See `references/sheet-format-rules.md` for the exact formatting spec per sheet.

## Rules
- Requires: `pip install openpyxl`
- Runs all sheets in numbered order. Missing sheet files are skipped with a warning.
- Log the output path to `memory/episodic.md` on completion.
