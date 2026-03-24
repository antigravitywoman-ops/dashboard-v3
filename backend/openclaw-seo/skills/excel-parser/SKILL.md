---
name: excel-parser
description: "Parses a client-provided Excel deliverable (.xlsx) using pandas and openpyxl to extract structured data from all sheets, including cell values, column headers, colors, and formula strings. Outputs a structured JSON file for agent consumption. Use when: (1) a client has provided an intake or state review Excel file that needs to be ingested, (2) seo-orchestrator needs historical data from a spreadsheet deliverable. NOT for: generating Excel output (use excel-porter), reading CSV files (read directly)."
metadata:
  {
    "openclaw": {
      "emoji": "📊",
      "requires": { "bins": ["python3"] }
    }
  }
---

# EXCEL PARSER Skill

Use the `python3` CLI to execute the excel-parser script located in the `scripts/` directory.

## When to Use

✅ **USE this skill when:**
- An intake or state review Excel file needs to be ingested and analyzed.
- The seo-orchestrator requires historical or audit data from spreadsheet deliverables.

## Quick Start
```bash
cd scripts/ && python3 excel-parser.py <path-to-excel-file> <company-slug>
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Generating an Excel file → use `excel-porter`
- Reading CSV → read the file directly without this skill

## Output
Writes `memory/intake-state.json` with per-sheet data.
See `references/sheet-schemas.md` for the full JSON structure per sheet type.

## Rules
- Requires: `pip install pandas openpyxl`
- Runs two passes: pandas for cell values, openpyxl for colors and formulas.
- Saves the raw parsed JSON — do not filter or summarize during parse. Let the research-analyst interpret.
