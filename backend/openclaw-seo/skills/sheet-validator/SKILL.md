---
name: sheet-validator
description: "Validates all 14 SEO strategy Markdown sheet files against depth, uniqueness, and quality standards defined in references/sheet-metrics.md. Returns a structured JSON report with CRITICAL, WARNING, and INFO findings. Use when: (1) research-analyst has finished writing sheets and is self-checking before submission, (2) seo-orchestrator is running the final quality gate before passing to excel-porter. NOT for: validating Excel output (validate the Markdown source), reading or interpreting strategy content."
metadata:
  {
    "openclaw": {
      "emoji": "✅",
      "requires": { "bins": ["python3"] }
    }
  }
---

# SHEET VALIDATOR Skill

Validates all 14 SEO strategy Markdown sheets against deep quality standards. Used in the iterative research-analyst → orchestrator validation loop.

## Quick Start

```bash
# Validate all 14 sheets for a company
python3 skills/sheet-validator/scripts/sheet-validator.py <company-slug>

# Validate a single sheet
python3 skills/sheet-validator/scripts/sheet-validator.py <company-slug> --sheet=05-keyword-research

# Validate with verbose output (shows passing sheets too)
python3 skills/sheet-validator/scripts/sheet-validator.py <company-slug> --verbose
```

## When NOT to Use

- Validating the Excel output → validate the Markdown source before porting
- Reading or summarizing strategy content → agents read sheets directly
- Checking API credentials → use `auth-manager`

## Expected Sheet Set

All 14 files must exist in `companies/<slug>/memory/sheets/`:

```
00-digital-presence-baseline.md
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

## What It Checks

### Structural Checks (All Sheets)
- **Sheet exists**: All 14 numbered files must be present
- **Contains a table**: At least one Markdown table with headers per file
- **Minimum row count**: Per-sheet minimums from `references/sheet-metrics.md`
- **Required columns present**: Column names checked per sheet

### Multi-Table Sheets
Sheet 02 (`02-gap-analysis.md`) must contain **two tables**: Table 02-A (Internal Gaps) and Table 02-B (Competitor Gap Matrix). Missing either sub-table is a CRITICAL finding.

Sheet 07 (`07-citations-backlinks.md`) must contain **three tables**: 07-A (Citations), 07-B (Backlink Pipeline), 07-C (Asset Inventory). Missing any sub-table is a CRITICAL finding.

### Filler Detection (CRITICAL)
- **Sequential naming**: Detects values matching "Item 1", "Item 2", "Keyword 1", "Video Concept 3", "Gap 1", "Location Page 2", etc. — any key column ending with incrementing number
- **Generic labels**: "Implementation details for W1", "SEO tasks for week 2", "Placeholder", "TBD", "To be decided"
- **Duplicate key values**: In primary identifier columns (Keyword, Competitor, Gap ID, Video Title, Location, Platform, Task) — no two rows identical or near-identical
- **City-swap location pages**: Sheet 06 `Unique Content Hook` and `Key Sections` identical across two or more rows

### Numeric Quality (CRITICAL)
- **Arithmetic sequences**: Any numeric column where 3+ consecutive values differ by a constant delta (e.g., 1010/1020/1030, 31/32/33, 100/200/300)
- **Identical numbers across rows**: If a numeric column has the same value for >50% of rows, it is flagged

### Copy-Paste Detection (CRITICAL)
- **Identical assessment cells**: Columns like "Content Quality", "Backlink Profile", "Priority", "Standing", "Threat Level" — if >40% of rows share the same value, it is flagged
- **Identical strategy/hook cells**: Any two rows with identical values in "Unique Content Hook", "Content Angle", "Script Outline", "Review Generation Tactic", "Our Exploitable Opportunity"

### Deep Sheet-Specific Checks (CRITICAL unless noted)
- **Sheet 00**: Must have all 5 sub-tables (00-A through 00-E). 00-C must have ≥20 GBP attribute rows.
- **Sheet 01**: Must contain Setup Hurdles table AND Strategic Narrative prose ≥400 words AND Property Overview block.
- **Sheet 02**: 02-A must cover ≥6 of 8 gap categories. 02-A must contain ≥5 rows with E-E-A-T dimension not "N/A". 02-B must name real competitor names (not "Competitor 1").
- **Sheet 03**: `Key SEO Strengths` and `Key Weaknesses` must be unique across all competitor rows. `Domain Authority` must not be constant across rows.
- **Sheet 04**: Must have exactly 12 rows. Each row must have non-empty `Worker` and `Gap IDs Addressed` columns (weeks 10–12 may have "None" for Gap IDs). `Phase` must follow Foundation/Growth/Scale/Optimization sequence.
- **Sheet 05**: Must cover all 4 intent types. Must have ≥5 topic clusters. `Standing` column required. `Target Week` column required. `Search Volume` must not be arithmetic sequence.
- **Sheet 06**: `Unique Content Hook` must be unique per row. `H1 Title` must include location name. `Primary Keyword` must include location name.
- **Sheet 07**: Canonical NAP block must appear above 07-A table. 07-B must have ≥15 target domains. 07-C must have ≥4 asset types.
- **Sheet 12**: `AI Agent` column required. `Success Criteria` column required.
- **Sheet 13**: `Target (Week 4)`, `Target (Week 8)`, `Target (Week 12)` must show progressive improvement. `Delta` must be calculated (not hardcoded 0 or identical).

### Depth Checks (WARNING)
- Row count below sheet minimum (see sheet-metrics.md for per-sheet thresholds)
- Sheet 05: Fewer than 15 long-tail keywords (3+ words)
- Sheet 05: Fewer than 8 "Quick Win" keywords in `Standing` column
- Sheet 08: Not all 3 funnel stages covered
- Sheet 02 (02-A): Fewer than 5 UX friction rows
- Sheet 13: Fewer than 5 KPI categories covered

### Data Annotation Checks (INFO)
- Blank numeric cell without `[Data Missing: ...]` annotation
- Sheet 01 Setup Hurdles table missing (INFO if Hurdles table exists but any row has no setup steps)
- Sheet 01 Strategic Narrative below 400 words (WARNING if 100–400 words, CRITICAL if under 100 words)

## Output Format

```json
{
  "company": "<slug>",
  "validated_at": "<ISO timestamp>",
  "overall_pass": false,
  "summary": {
    "critical": 4,
    "warning": 3,
    "info": 1,
    "sheets_missing": ["00-digital-presence-baseline.md"],
    "sheets_passing": ["01-executive-summary.md", "03-competitor-analysis.md", "08-youtube-strategy.md"]
  },
  "findings": [
    {
      "severity": "CRITICAL",
      "sheet": "05-keyword-research.md",
      "column": "Search Volume",
      "message": "Arithmetic sequence detected: values 1010, 1020, 1030, 1040, 1050 differ by constant delta of 10",
      "rows_affected": [2, 3, 4, 5, 6]
    },
    {
      "severity": "CRITICAL",
      "sheet": "02-gap-analysis.md",
      "sub_table": "02-B",
      "column": "Competitor",
      "message": "Sequential filler detected: 'Competitor 1', 'Competitor 2', 'Competitor 3' — real competitor names required",
      "rows_affected": [2, 3, 4]
    },
    {
      "severity": "CRITICAL",
      "sheet": "06-location-pages.md",
      "column": "Unique Content Hook",
      "message": "Identical value 'Add local testimonials and case studies' found in 5 rows — city-swap detected",
      "rows_affected": [3, 4, 5, 6, 7]
    },
    {
      "severity": "CRITICAL",
      "sheet": "07-citations-backlinks.md",
      "sub_table": "missing",
      "message": "Sub-table 07-C (Asset Inventory) not found — three sub-tables required",
      "rows_affected": []
    },
    {
      "severity": "WARNING",
      "sheet": "05-keyword-research.md",
      "column": "Standing",
      "message": "Only 3 'Quick Win' keywords found — minimum 8 required",
      "rows_affected": []
    }
  ]
}
```

## Pass Condition

`overall_pass: true` requires:
- Zero CRITICAL findings
- Zero missing sheets (all 14 must be present)

WARNING findings do NOT block the pass — returned for analyst awareness only.

## Reference

Full column definitions, minimum row counts, quality gate rules, and skill-to-column mapping:

```
skills/sheet-validator/references/sheet-metrics.md
references/sheet-metrics.md
```

Both files contain identical content. The validator script uses `skills/sheet-validator/references/` as primary.

## Setup Requirements

- Python 3.8+
- No external packages required (standard library only)
