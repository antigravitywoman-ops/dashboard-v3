#!/usr/bin/env python3
"""
SHEET VALIDATOR — Self-Checker for SEO Strategy Sheets
Validates that markdown sheet files in memory/sheets/ meet the depth and quality
standards defined in references/sheet-metrics.md.

Usage:
    python3 sheet-validator.py <company-slug>

Returns exit code 0 if all checks pass, 1 if any fail.
Outputs a JSON report of all findings.
"""

import sys
import os
import re
import json
from collections import Counter

# ── Configuration ────────────────────────────────────────────────────────────

SHEET_SPECS = {
    "01-executive-summary.md": {
        "display_name": "Executive Summary",
        "min_rows": 12,
        "min_columns": 4,
        "required_columns_substring": ["metric", "current", "target"],
        "uniqueness_column_index": 0,  # Metric names must be unique
        "check_data_missing_annotation": True,
    },
    "02-gap-analysis.md": {
        "display_name": "Gap Analysis",
        "min_rows": 30,
        "min_columns": 5,
        "required_columns_substring": ["gap", "priority", "impact", "effort"],
        "uniqueness_column_index": 1,  # Specific Gap must be unique
        "check_no_sequential_filler": True,  # e.g. "Case Study 1", "Case Study 2"
        "check_data_missing_annotation": True,
    },
    "03-competitor-analysis.md": {
        "display_name": "Competitor Analysis",
        "min_rows": 10,
        "min_columns": 5,
        "required_columns_substring": ["competitor", "domain"],
        "uniqueness_column_index": 0,  # Competitor names must be unique
        "check_column_variation": {"column_index": 2, "min_unique_ratio": 0.5},
        "check_data_missing_annotation": True,
    },
    "04-twelve-week-plan.md": {
        "display_name": "12-Week Plan",
        "min_rows": 12,
        "min_columns": 4,
        "required_columns_substring": ["week", "focus", "task"],
        "uniqueness_column_index": 3,  # Tasks must be unique per week
    },
    "05-keyword-research.md": {
        "display_name": "Keyword Research",
        "min_rows": 50,
        "min_columns": 5,
        "required_columns_substring": ["keyword", "volume", "difficulty"],
        "uniqueness_column_index": 0,  # Keywords must be unique
        "check_no_arithmetic_sequence": {"column_index": 2},  # Search Volume must not be sequential
        "check_no_sequential_filler": True,
        "check_data_missing_annotation": True,
    },
    "06-location-pages.md": {
        "display_name": "Location Pages",
        "min_rows": 8,
        "min_columns": 4,
        "required_columns_substring": ["location"],
        "uniqueness_column_index": 0,  # Location names must be unique
    },
    "07-citations-backlinks.md": {
        "display_name": "Citations & Backlinks",
        "min_rows": 12,
        "min_columns": 4,
        "required_columns_substring": ["platform", "status"],
        "uniqueness_column_index": 0,  # Platform names must be unique
        "check_no_sequential_filler": True,
    },
    "08-youtube-strategy.md": {
        "display_name": "YouTube Strategy",
        "min_rows": 8,
        "min_columns": 4,
        "required_columns_substring": ["video", "keyword"],
        "uniqueness_column_index": 0,
        "check_no_sequential_filler": True,
    },
    "09-reddit-quora.md": {
        "display_name": "Reddit & Quora",
        "min_rows": 8,
        "min_columns": 4,
        "required_columns_substring": ["platform", "topic"],
        "uniqueness_column_index": 1,  # Topics must be unique
        "check_no_sequential_filler": True,
    },
    "10-review-strategy.md": {
        "display_name": "Review Strategy",
        "min_rows": 5,
        "min_columns": 4,
        "required_columns_substring": ["source", "status"],
        "uniqueness_column_index": 0,
    },
    "11-schema-markup.md": {
        "display_name": "Schema Markup",
        "min_rows": 6,
        "min_columns": 4,
        "required_columns_substring": ["schema", "status"],
        "uniqueness_column_index": 0,
    },
    "12-weekly-tasks.md": {
        "display_name": "Weekly Tasks",
        "min_rows": 12,
        "min_columns": 4,
        "required_columns_substring": ["task", "priority"],
        "uniqueness_column_index": 2,  # Task descriptions must be unique
        "check_no_sequential_filler": True,
    },
    "13-kpis-metrics.md": {
        "display_name": "KPIs & Metrics",
        "min_rows": 8,
        "min_columns": 5,
        "required_columns_substring": ["kpi", "baseline"],
        "uniqueness_column_index": 0,
        "check_data_missing_annotation": True,
    },
}


# ── Parsing ──────────────────────────────────────────────────────────────────

def parse_markdown_tables(filepath: str) -> list[tuple[list[str], list[list[str]]]]:
    """Parse a markdown file and extract all tables found.
    Returns list of (headers, rows) tuples.
    """
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()

    tables = []
    current_headers = []
    current_rows = []
    in_table = False
    separator_seen = False

    for line in lines:
        stripped = line.strip()
        if not stripped.startswith("|"):
            if in_table and separator_seen:
                tables.append((current_headers, current_rows))
                current_headers, current_rows = [], []
                in_table, separator_seen = False, False
            continue

        cells = [c.strip() for c in stripped.split("|")[1:-1]]

        if not in_table:
            current_headers = cells
            in_table = True
            continue

        if all(re.match(r'^:?-+:?$', c) for c in cells):
            separator_seen = True
            continue

        if separator_seen:
            current_rows.append(cells)

    if in_table and separator_seen:
        tables.append((current_headers, current_rows))

    return tables


# ── Validators ───────────────────────────────────────────────────────────────

def check_file_exists(filepath: str) -> dict | None:
    if not os.path.exists(filepath):
        return {"severity": "CRITICAL", "message": f"File missing: {os.path.basename(filepath)}"}
    return None


def check_min_rows(rows: list, min_rows: int, sheet_name: str) -> dict | None:
    if len(rows) < min_rows:
        return {
            "severity": "CRITICAL",
            "message": f"{sheet_name}: Only {len(rows)} rows found, minimum {min_rows} required."
        }
    return None


def check_min_columns(headers: list, min_cols: int, sheet_name: str) -> dict | None:
    if len(headers) < min_cols:
        return {
            "severity": "CRITICAL",
            "message": f"{sheet_name}: Only {len(headers)} columns found, minimum {min_cols} required."
        }
    return None


def check_required_columns(headers: list, required_substrings: list, sheet_name: str) -> dict | None:
    header_lower = [h.lower() for h in headers]
    missing = []
    for sub in required_substrings:
        if not any(sub in h for h in header_lower):
            missing.append(sub)
    if missing:
        return {
            "severity": "WARNING",
            "message": f"{sheet_name}: Missing expected column(s) containing: {', '.join(missing)}"
        }
    return None


def check_uniqueness(rows: list, col_index: int, sheet_name: str) -> dict | None:
    """Check that values in the specified column are unique (detects filler)."""
    if not rows or col_index >= len(rows[0]):
        return None

    values = [row[col_index].strip().lower() for row in rows if col_index < len(row)]
    counter = Counter(values)
    duplicates = {v: c for v, c in counter.items() if c > 1 and v not in ["", "-", "n/a"]}

    if duplicates:
        examples = list(duplicates.keys())[:3]
        return {
            "severity": "CRITICAL",
            "message": f"{sheet_name}: Duplicate values in column {col_index}: {examples}. Each row must be unique."
        }
    return None


def check_no_sequential_filler(rows: list, sheet_name: str) -> dict | None:
    """Detect numbered filler patterns like 'Case Study 1', 'Case Study 2', etc."""
    pattern = re.compile(r'^(.+?)[\s]*(\d+)$')

    for col_idx in range(min(3, len(rows[0]) if rows else 0)):
        values = [row[col_idx].strip() for row in rows if col_idx < len(row)]
        base_names = []
        for v in values:
            match = pattern.match(v)
            if match:
                base_names.append(match.group(1).strip().lower())

        if len(base_names) >= 3:
            counter = Counter(base_names)
            worst = counter.most_common(1)
            if worst and worst[0][1] >= 3:
                return {
                    "severity": "CRITICAL",
                    "message": (
                        f"{sheet_name}: Sequential filler detected in column {col_idx} — "
                        f"'{worst[0][0]}' appears {worst[0][1]} times with incrementing numbers. "
                        f"Each row must have genuinely unique, researched content."
                    )
                }
    return None


def check_no_arithmetic_sequence(rows: list, col_index: int, sheet_name: str) -> dict | None:
    """Detect if numeric values in a column follow an arithmetic sequence (fake data)."""
    if not rows or col_index >= len(rows[0]):
        return None

    numbers = []
    for row in rows:
        if col_index >= len(row):
            continue
        val = row[col_index].strip()
        try:
            numbers.append(int(val))
        except ValueError:
            try:
                numbers.append(float(val))
            except ValueError:
                continue

    if len(numbers) < 5:
        return None

    # Check if differences are constant
    diffs = [numbers[i+1] - numbers[i] for i in range(len(numbers)-1)]
    if len(set(diffs)) == 1 and diffs[0] != 0:
        return {
            "severity": "CRITICAL",
            "message": (
                f"{sheet_name}: Column {col_index} values follow an arithmetic sequence "
                f"(constant difference of {diffs[0]}). This indicates generated/fake data. "
                f"Values must reflect real research with natural variation."
            )
        }
    return None


def check_column_variation(rows: list, col_index: int, min_unique_ratio: float, sheet_name: str) -> dict | None:
    """Check that values in a column have sufficient variety."""
    if not rows or col_index >= len(rows[0]):
        return None

    values = [row[col_index].strip().lower() for row in rows if col_index < len(row) and row[col_index].strip()]
    if not values:
        return None

    unique_ratio = len(set(values)) / len(values)
    if unique_ratio < min_unique_ratio:
        return {
            "severity": "WARNING",
            "message": (
                f"{sheet_name}: Column {col_index} has low variation — "
                f"only {len(set(values))}/{len(values)} unique values ({unique_ratio:.0%}). "
                f"Minimum {min_unique_ratio:.0%} unique values expected."
            )
        }
    return None


def check_data_missing_annotation(rows: list, sheet_name: str) -> dict | None:
    """Check that [Data Missing] annotations use the correct format."""
    for row in rows:
        for cell in row:
            cell_lower = cell.lower()
            if "data missing" in cell_lower or "waiting on api" in cell_lower:
                if not re.search(r'\[Data Missing', cell):
                    return {
                        "severity": "WARNING",
                        "message": f"{sheet_name}: Found informal missing data note. Use format: [Data Missing: No <API_NAME> Key]"
                    }
    return None


# ── Main ─────────────────────────────────────────────────────────────────────

def validate_company(company_slug: str) -> dict:
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # Path: skills/sheet-validator/scripts -> skills/sheet-validator -> skills -> root -> companies
    sheets_dir = os.path.join(script_dir, "..", "..", "..", "companies", company_slug, "memory", "sheets")
    sheets_dir = os.path.normpath(sheets_dir)

    print(f"[sheet-validator] Validating sheets for: {company_slug}")
    print(f"[sheet-validator] Sheets directory: {sheets_dir}")

    findings = []
    passed = 0
    failed = 0

    for filename, spec in SHEET_SPECS.items():
        filepath = os.path.join(sheets_dir, filename)
        sheet_name = spec["display_name"]

        # 1. File exists?
        err = check_file_exists(filepath)
        if err:
            findings.append(err)
            failed += 1
            continue

        # 2. Parse all tables
        all_file_tables = parse_markdown_tables(filepath)
        if not all_file_tables:
            findings.append({"severity": "CRITICAL", "message": f"{sheet_name}: No markdown tables found in file."})
            failed += 1
            continue

        sheet_findings = []
        
        # Aggregate headers and rows for combined validation
        all_headers = []
        all_rows = []
        for h, r in all_file_tables:
            all_headers.extend(h)
            all_rows.extend(r)

        # 3. Row count (Aggregated)
        err = check_min_rows(all_rows, spec["min_rows"], sheet_name)
        if err:
            sheet_findings.append(err)

        # 4. Column count (Best effort: check if ANY table meets min columns)
        max_cols = max(len(h) for h, r in all_file_tables)
        err = check_min_columns(all_headers, spec["min_columns"], sheet_name) # Using all_headers as proxy for checking existence
        if max_cols < spec["min_columns"]:
            sheet_findings.append({
                "severity": "CRITICAL",
                "message": f"{sheet_name}: Table structure too narrow. Max columns found: {max_cols}, minimum {spec['min_columns']} required."
            })

        # 5. Required columns (Search across ALL headers)
        err = check_required_columns(all_headers, spec.get("required_columns_substring", []), sheet_name)
        if err:
            sheet_findings.append(err)

        # 6. Uniqueness (Against aggregated rows)
        if "uniqueness_column_index" in spec:
            err = check_uniqueness(all_rows, spec["uniqueness_column_index"], sheet_name)
            if err:
                sheet_findings.append(err)

        # 7. Sequential filler (Against aggregated rows)
        if spec.get("check_no_sequential_filler"):
            err = check_no_sequential_filler(all_rows, sheet_name)
            if err:
                sheet_findings.append(err)

        # 8. Arithmetic sequence
        if "check_no_arithmetic_sequence" in spec:
            cfg = spec["check_no_arithmetic_sequence"]
            err = check_no_arithmetic_sequence(all_rows, cfg["column_index"], sheet_name)
            if err:
                sheet_findings.append(err)

        # 9. Column variation
        if "check_column_variation" in spec:
            cfg = spec["check_column_variation"]
            err = check_column_variation(all_rows, cfg["column_index"], cfg["min_unique_ratio"], sheet_name)
            if err:
                sheet_findings.append(err)

        # 10. Data missing annotation format
        if spec.get("check_data_missing_annotation"):
            err = check_data_missing_annotation(all_rows, sheet_name)
            if err:
                sheet_findings.append(err)

        # Tally
        critical_count = sum(1 for f in sheet_findings if f["severity"] == "CRITICAL")
        if critical_count > 0:
            failed += 1
        else:
            passed += 1

        findings.extend(sheet_findings)
        if not sheet_findings:
            print(f"  ✓ {sheet_name} — PASS ({len(all_rows)} rows, aggregated)")
        else:
            for f in sheet_findings:
                print(f"  ✗ [{f['severity']}] {f['message']}")

    # Summary
    total = len(SHEET_SPECS)
    print(f"\n[sheet-validator] RESULT: {passed}/{total} sheets passed, {failed}/{total} failed")
    print(f"[sheet-validator] Total findings: {len(findings)} ({sum(1 for f in findings if f['severity'] == 'CRITICAL')} critical)")

    result = {
        "company": company_slug,
        "sheets_total": total,
        "sheets_passed": passed,
        "sheets_failed": failed,
        "findings": findings,
        "overall_pass": failed == 0,
    }

    print(json.dumps(result, indent=2))

    return result


if __name__ == "__main__":
    if len(sys.argv) >= 2:
        slug = sys.argv[1]
        result = validate_company(slug)
        sys.exit(0 if result["overall_pass"] else 1)
    else:
        print("Usage: python3 sheet-validator.py <company-slug>")
        sys.exit(1)
