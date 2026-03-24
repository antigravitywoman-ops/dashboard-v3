---
name: serp-monitor
description: "Monitors Google SERP result pages for tracked keywords and fires alerts when positions change beyond a defined threshold (e.g. dropped >5 places). Compares against the most recent serper-miner baseline. Use when: (1) alert thresholds have been configured in business-goals.md, (2) daily or pre-scheduled monitoring checks are needed. NOT for: initial SERP data mining (use serper-miner), historical position tracking (use rank-track)."
metadata:
  {
    "openclaw": {
      "emoji": "🚨",
      "requires": { "bins": ["node"] }
    }
  }
---

# SERP MONITOR Skill

Monitors live SERPs against baselines and fires structured alerts for significant changes.

## Quick Start
```bash
cd scripts/ && node serp-monitor.js <company-slug> [--threshold=5]
```

## When NOT to Use

❌ **DON'T use this skill when:**
- No baseline exists yet → run `serper-miner` first
- Bulk competitive intelligence → use `serper-miner`
- Rank delta reporting → use `rank-track`

## Output
Returns a JSON array of alerts: `{ keyword, previousPos, currentPos, delta, severity: "critical"|"warning"|"ok" }`.

## Rules
- Default drop threshold: 5 positions. Override with `--threshold`.
- Log all alerts to `memory/alerts/serp-alert-<ts>.json`.
```