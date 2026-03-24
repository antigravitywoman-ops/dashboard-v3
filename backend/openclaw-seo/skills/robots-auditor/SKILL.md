---
name: robots-auditor
description: "Fetches and parses a target site's robots.txt file to identify active crawling restrictions (Allow/Disallow), sitemap declarations, and User-agent specific blocks. Use when: (1) technical audit workflow needs to verify crawling governance, (2) diagnosing why a specific page or directory is not getting indexed. NOT for: extracting actual page content (use crawl-firecrawl) or inspecting Google's index directly (use index-checker)."
metadata:
  {
    "openclaw": {
      "emoji": "🤖",
      "requires": { "bins": ["node"] }
    }
  }
---

# ROBOTS AUDITOR Skill

Parses robots.txt files to identify crawling restrictions.

## Quick Start
```bash
cd scripts/ && node robots-auditor.js <target-url>
```

## Output
Returns a JSON object detailing whether crawling is allowed, listing all explicit Allow/Disallow rules, and any specified Sitemap URLs.

## Rules
- The target URL can be the site root or a specific page. The script will automatically resolve the `robots.txt` path (e.g., target `https://example.com/blog/article-1` resolves to `https://example.com/robots.txt`).
- Analyzes both `User-agent: *` blocks and specific bots (like Googlebot).
