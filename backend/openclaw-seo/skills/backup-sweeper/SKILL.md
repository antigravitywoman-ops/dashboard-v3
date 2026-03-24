---
name: backup-sweeper
description: "Archives old snapshots, SERP competitor files, temp files, and stale reports to keep the company memory directory clean and under size limits. Moves files older than a threshold to a dated archive folder. Use when: (1) running scheduled weekly maintenance before generating a new strategy, (2) memory directory is growing large. NOT for: deleting important reference files (this only archives, never deletes permanently)."
metadata:
  {
    "openclaw": {
      "emoji": "🧹",
      "requires": { "bins": ["node"] }
    }
  }
---

# BACKUP SWEEPER Skill

Archives stale memory files while preserving important reference data.

## Quick Start
```bash
cd scripts/ && node backup-sweeper.js <company-slug> [--older-than=30d]
```

## When NOT to Use

❌ **DON'T use this skill when:**
- You want to permanently delete files — this skill only archives
- Files have not been reviewed yet — archive only after a strategy cycle completes

## Output
Returns `{ filesArchived, archivePath, freedBytes }`.

## Rules
- Default archive threshold: files older than 30 days.
- Archive target: `companies/<slug>/archive/<YYYY-MM>/`.
- Never archive: `business-goals.md`, `episodic.md`, or any `.env` files.