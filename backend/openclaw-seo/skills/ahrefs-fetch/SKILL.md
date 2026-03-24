---
name: ahrefs-fetch
description: "Fetches Domain Rating (DR), URL Rating (UR), and estimated organic traffic for a given target domain or URL. Use when: (1) evaluating backlink targets in Sheet 07-B, (2) assessing competitor authority in Sheet 03. NOT for: pulling Google Analytics/Search Console data for the client."
metadata:
  {
    "openclaw": {
      "emoji": "🔗",
      "requires": { "bins": ["python3"] }
    }
  }
---

# AHREFS FETCH Skill

Use the `python3` CLI to execute the ahrefs-fetch script located in the `scripts/` directory.

## Quick Start
```bash
cd scripts/ && python3 ahrefs-fetch.py <target-domain-or-url>
```

## Output
Returns a JSON object with Domain Rating, URL Rating, total backlinks, and estimated monthly organic traffic.

## Rules
- Requires `AHREFS_API_KEY` in the environment or company `.env`.
- Do NOT hallucinate metrics if the API call fails or the key is missing. Annotate the report with `[Ahrefs Data Unavailable]` instead.
