---
name: snapshot-generator
description: "Collects live organic performance metrics from GA4 (sessions, engagement) and GSC (clicks, impressions, avg position) and compiles them into a schema-compliant point-in-time snapshot JSON. Computes week-over-week deltas against the previous snapshot. Use when: (1) the weekly-strategy workflow begins (always the first step), (2) a fresh data baseline is needed before competitive analysis. NOT for: pulling individual metrics (use ga4-fetch or gsc-fetch directly), generating Excel output (that is excel-porter's job)."
metadata:
  {
    "openclaw": {
      "emoji": "📸",
      "requires": { "bins": ["python3"] }
    }
  }
---

# SNAPSHOT GENERATOR Skill

Use the `python3` CLI to execute the snapshot-generator script located in the `scripts/` directory.

## Quick Start
```bash
cd scripts/ && python3 snapshot-generator.py <company-slug> [--days=7]
```

## When NOT to Use

❌ **DON'T use this skill when:**
- You only need GA4 data → use `ga4-fetch` directly
- You only need GSC data → use `gsc-fetch` directly
- Generating the output Excel → use `excel-porter`

## Output
Saves schema-compliant JSON to `memory/snapshots/snapshot-<ts>.json`.
See `references/snapshot-schema.md` for all output fields and delta computation logic.

## Rules
- Requires Google service account credentials in company `.env`.
- Always runs BEFORE competitor mining in the weekly strategy workflow.
- Computes deltas automatically against the most recent previous snapshot file.
