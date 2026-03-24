# Excel Parser — Sheet Schema Reference

Defines the expected JSON structure for each sheet type that `excel-parser.py` produces in `memory/intake-state.json`.

## Top-Level Structure

```json
{
  "success": true,
  "company": "<company-slug>",
  "parsedAt": "2026-03-08T06:00:00Z",
  "sheets": {
    "<SheetName>": {
      "headers": ["Column A", "Column B", "..."],
      "rows": [
        { "Column A": "value", "Column B": 123 }
      ],
      "rowCount": 150,
      "formatting": {
        "highlightedRows": [2, 5, 11],
        "columnColors": { "A": "#FF0000", "D": "#00FF00" },
        "formulas": { "E2": "=D2/C2", "F2": "=SUM(B2:B10)" }
      }
    }
  }
}
```

## Per Sheet Type

### Keyword Research Sheet

Expected columns (flexible — use actual headers from file):
| Column | Expected Type | Description |
|---|---|---|
| Keyword | string | The search query |
| Monthly Volume | integer | Avg monthly searches |
| Difficulty | integer | 0–100 KD score |
| Intent | string | `informational`, `commercial`, `transactional` |
| Current Position | float | Company's current avg SERP position |
| Target URL | string | The page being optimized |
| Priority | string | `H`, `M`, `L` |

### Technical Issues Sheet

Expected columns:
| Column | Expected Type |
|---|---|
| URL | string |
| Issue Type | string |
| Severity | string (`Critical`, `Warning`, `Info`) |
| Recommendation | string |

### Competitor Analysis Sheet

| Column | Expected Type |
|---|---|
| Competitor Domain | string |
| DA | integer |
| Keywords Overlap | integer |
| Gap Keywords | string (comma-separated) |

### 12-Week Plan Sheet

| Column | Expected Type |
|---|---|
| Week | integer (1–12) |
| Task | string |
| Owner | string |
| Status | string (`Not Started`, `In Progress`, `Done`) |
| Notes | string |

## Parser Rules

1. `headers` = first non-empty row values in the sheet
2. `rows` = all subsequent rows as key-value dicts using headers as keys
3. `rowCount` = number of data rows (excluding header row)
4. `formatting.highlightedRows` = 1-indexed row numbers where any cell has a non-default fill color
5. `formatting.columnColors` = column letter → most common fill color hex in that column
6. `formatting.formulas` = cell address → formula string (openpyxl `data_only=False` mode)
