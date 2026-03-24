---
name: content-curator
description: "Organizes keyword data into topic clusters, maps pillar and supporting pages, and builds a content calendar from research data. Use when: (1) the research-analyst has finished keyword research and a content plan needs to be structured, (2) building the YouTube Strategy or Reddit/Quora sheets. NOT for: generating actual content (use blog-generate), posting content (use post-* skills)."
metadata:
  {
    "openclaw": {
      "emoji": "🗂️",
      "requires": { "bins": ["node"] }
    }
  }
---

# CONTENT CURATOR Skill

Groups keywords into topic clusters and maps pillar → cluster → supporting page hierarchies.

## Quick Start
You can run the underlying script for this skill using node:
```bash
cd scripts/ && node content-curator.js "<topic>" <compliance-level> <company-slug>
```

## Expected Input/Output
Expects a target `topic`, a `compliance-level` (e.g. `medical`, `finance`, `standard`), and the `company-slug`.
Returns a highly-curated markdown output ready for immediate CMS ingestion, including compliant disclaimers and strictly validated JSON-LD schema.
