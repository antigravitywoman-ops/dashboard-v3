---
name: schema-auditor
description: "Audits a web page's structured data (JSON-LD, Microdata, RDFa) against Google's Schema.org requirements and identifies errors, warnings, and missing schema types. Use when: (1) a technical audit workflow requires schema validation, (2) checking if LocalBusiness, Article, FAQ, or Product schemas are correctly implemented. NOT for: generating new schema (write it directly), CMS publishing (use cms-wordpress), crawling page content (use crawl-browser)."
metadata:
  {
    "openclaw": {
      "emoji": "🧩",
      "requires": { "bins": ["python3"] }
    }
  }
---

# SCHEMA AUDITOR Skill

Validates structured data on a target URL against Schema.org and Google Rich Results requirements.

## Quick Start
```bash
cd scripts/ && python3 schema-auditor.py <url> <company-slug>
```

## When NOT to Use

❌ **DON'T use this skill when:**
- You need to write or inject schema → write JSON-LD directly into the content output
- Crawling for other technical issues → use `crawl-browser` or `crawl-firecrawl`

## Output
Returns: `{ url, schemasFound[], errors[], warnings[], missingRecommended[], richResultTypes[] }`.
Saved to `memory/schema-audit-<ts>.json`.

## Rules
- Check for: LocalBusiness, Article, FAQPage, BreadcrumbList, Product schema types.
- Flag any schema missing `@context`, `@type`, or required properties for its type.
