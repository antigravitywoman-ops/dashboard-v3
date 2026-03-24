# Sheet Format Rules

Per-sheet styling specification for the `excel-porter.py` script.

## Global Defaults (applied to all sheets)

| Property | Value |
|---|---|
| Font | Calibri 11pt |
| Header font | Calibri 12pt, Bold, White |
| Row 1 freeze | Always freeze row 1 |
| Auto-filter | Always enabled on header row |
| Default column width | 18 |
| Default row height | 15 |
| Header row height | 22 |
| Zebra striping | Light grey (#F2F2F2) on even rows |

---

## Sheet-Specific Rules

### 01 — Executive Summary

| Property | Value |
|---|---|
| Tab color | `#1F3864` (dark navy) |
| Header fill | `#1F3864` |
| Column widths | A:30, B:60 |
| Merge cells | A1:B1 for the company name title |
| Special | No table — prose layout. Columns A=Label, B=Content |

---

### 02 — Gap Analysis

| Property | Value |
|---|---|
| Tab color | `#E06C00` (orange) |
| Header fill | `#7F3F00` (dark orange) |
| Column widths | A:40, B:20, C:20, D:30 |
| Conditional formatting | Row fill `#FF6B6B` (red) if Status = "Missing", `#FFD700` (yellow) if Status = "Weak" |

---

### 03 — Competitor Analysis

| Property | Value |
|---|---|
| Tab color | `#C00000` (red) |
| Header fill | `#4C0000` (dark red) |
| Column widths | A:35, B:30, C:12, D:12, E:25 |
| Conditional formatting | DA column: red if < 20, green if > 60 |

---

### 04 — 12-Week Plan

| Property | Value |
|---|---|
| Tab color | `#203864` (navy) |
| Header fill | `#1F3864` (navy) |
| Column widths | A:8, B:40, C:15, D:15, E:15, F:25 |
| Conditional formatting | Status column: green="Done", yellow="In Progress", red="Blocked", grey="Not Started" |

---

### 05 — Keyword Research

| Property | Value |
|---|---|
| Tab color | `#375623` (dark green) |
| Header fill | `#1E4620` (dark green) |
| Column widths | A:40, B:14, C:12, D:12, E:14, F:18 |
| Number format | Volume (B): `#,##0` / KD (C): `0` / CTR: `0.0%` / Position: `0.0` |
| Conditional formatting | Position column: green if ≤3, yellow if 4–10, red if >20 |
| Formulas | CTR column = `=clicks/impressions` where available |

---

### 06 — Location Pages Template

| Property | Value |
|---|---|
| Tab color | `#7030A0` (purple) |
| Header fill | `#4B0082` (indigo) |
| Column widths | A:30, B:50, C:20, D:30 |

---

### 07 — Citations Checklist

| Property | Value |
|---|---|
| Tab color | `#00B0F0` (light blue) |
| Header fill | `#00457C` (dark blue) |
| Column widths | A:35, B:25, C:15, D:15 |
| Conditional formatting | Status column: green if "Submitted", red if "Missing" |

---

### 08 — YouTube Strategy

| Property | Value |
|---|---|
| Tab color | `#FF0000` (YouTube red) |
| Header fill | `#8B0000` (dark red) |
| Column widths | A:40, B:30, C:15, D:10 |

---

### 09 — Reddit & Quora

| Property | Value |
|---|---|
| Tab color | `#FF4500` (Reddit orange) |
| Header fill | `#7A2000` (dark orange-red) |
| Column widths | A:30, B:40, C:15, D:10 |

---

### 10 — Review Strategy

| Property | Value |
|---|---|
| Tab color | `#FFC000` (gold) |
| Header fill | `#7F6000` (dark gold) |
| Column widths | A:30, B:40, C:15, D:20 |

---

### 11 — Schema Markup

| Property | Value |
|---|---|
| Tab color | `#70AD47` (green) |
| Header fill | `#375623` (dark green) |
| Column widths | A:30, B:20, C:15, D:50 |
| Conditional formatting | Status: green if "Implemented", red if "Missing" |

---

### 12 — Weekly Tasks

| Property | Value |
|---|---|
| Tab color | `#ED7D31` (orange) |
| Header fill | `#843C0C` (dark brown-orange) |
| Column widths | A:6, B:35, C:20, D:12, E:15, F:25 |
| Conditional formatting | Priority: red band if "High", yellow if "Medium", no color if "Low" |

---

### 13 — KPIs & Metrics

| Property | Value |
|---|---|
| Tab color | `#7030A0` (purple) |
| Header fill | `#2C0066` (dark purple) |
| Column widths | A:30, B:20, C:20, D:20, E:15 |
| Number format | Metric values: `#,##0` / Percentage targets: `0.0%` |
| Formulas | Delta column = `=B-C` / % to target = `=B/C` |
| Conditional formatting | Delta column: green if > 0, red if < 0 |

---

## Color Reference

| Name | Hex | Usage |
|---|---|---|
| White header text | `#FFFFFF` | All header fonts |
| Light zebra row | `#F2F2F2` | Even data rows |
| Success green | `#70AD47` | Positive/done indicators |
| Warning yellow | `#FFD700` | In-progress/weak |
| Alert red | `#FF6B6B` | Missing/dropped/failed |
| Neutral grey | `#D9D9D9` | Not started / N/A |
