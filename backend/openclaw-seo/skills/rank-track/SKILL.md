---
name: rank-track
description: "Tracks keyword ranking positions over time by comparing current SERP results against a stored baseline from a previous serper-miner run. Computes position deltas (gained/lost/new/dropped). Use when: (1) weekly monitoring of tracked keywords for a company, (2) detecting significant ranking drops that need urgent action, (3) building the KPIs sheet position-delta data. NOT for: initial SERP mining (use serper-miner), GSC query volume (use gsc-fetch)."
metadata:
  {
    "openclaw": {
      "emoji": "📈",
      "requires": { "bins": ["node"] }
    }
  }
---

# RANK TRACK Skill

Compares current SERP positions against the stored baseline and outputs position deltas.

## Quick Start
```bash
cd scripts/ && node rank-track.js <company-slug> [--keywords="kw1,kw2"]
```

## When NOT to Use

❌ **DON'T use this skill when:**
- No baseline serper-miner data exists yet → run `serper-miner` first
- You want live competitor intel → use `serper-miner`
- You want GSC impressions/CTR → use `gsc-fetch`

## Output
Returns a JSON array: `{ keyword, previousPosition, currentPosition, delta, status: "gained"|"lost"|"stable"|"new"|"dropped" }`.

## Rules
- Reads baseline from `memory/competitors/serp-<kw>-<ts>.json` (most recent file per keyword).
- Writes delta report to `memory/rank-deltas/rank-<ts>.json`.