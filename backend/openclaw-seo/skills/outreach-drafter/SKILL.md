---
name: outreach-drafter
description: "Drafts personalized cold outreach emails for link-building, digital PR, and guest post campaigns. Generates custom pitches based on the target site's niche, the company's content assets, and the specific link opportunity. Use when: (1) the Citations Checklist or off-page workflow identifies a high-value link target, (2) a guest post pitch needs writing. NOT for: social media posts (use post-* skills), forum comments (use forum-commenter)."
metadata:
  {
    "openclaw": {
      "emoji": "📧",
      "requires": { "bins": ["node"] }
    }
  }
---

# OUTREACH DRAFTER Skill

Generates personalized email pitches for link-building and PR campaigns.

## Quick Start
You can run the underlying script for this skill using node:
```bash
cd scripts/ && node outreach-drafter.js "<target-url>" "<value-prop>" <company-slug>
```

## Expected Input/Output
Expects the `target-url` being pitched, the `value-prop` (e.g., "broken link replacement on page X", "guest post on Y topic"), and the `company-slug`.
Returns a highly personalized email subject line and body.
