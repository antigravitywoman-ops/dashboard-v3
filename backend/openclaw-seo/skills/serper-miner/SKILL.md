---
name: serper-miner
description: "Pulls live competitor intelligence from Google SERP by querying the Serper.dev API for specific target keywords. Returns Top 10 organic results, People Also Ask, and related searches. Use when: (1) generating the Competitor Analysis sheet for a weekly strategy report, (2) seeding a rank-track baseline for new keywords, (3) checking if a keyword has fallen off page 1. NOT for: GA4/GSC metrics (use ga4-fetch/gsc-fetch), monitoring existing baselines (use serp-monitor)."
metadata:
  {
    "openclaw": {
      "emoji": "⛏️",
      "requires": { "bins": ["python3"] }
    }
  }
---

# SERPER MINER Skill

Use the `python3` CLI to execute the serper-miner script located in the `scripts/` directory.

## Quick Start
```bash
cd scripts/ && python3 serper-miner.py "<target-keyword>" <company-slug> [--gl=us]
```

## When NOT to Use

❌ **DON'T use this skill when:**
- You already have a baseline and want to check deltas → use `serp-monitor`
- You need GA4 or GSC data → use `ga4-fetch` or `gsc-fetch`

## Output
JSON with `organicResults[]`, `peopleAlsoAsk[]`, `relatedSearches[]`.
See `references/serper-fields.md` for full field definitions.
Saved to `memory/competitors/serp-<kw>-<ts>.json`.

## Rules
- Load `SERPER_API_KEY` from company `.env`.
- Default geo: `gl=us`. Pass `--gl=gb` for UK, etc.
- Run for top 3 tracked keywords per weekly strategy cycle.
