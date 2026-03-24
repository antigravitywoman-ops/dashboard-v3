---
name: broken-link-scanner
description: "Scans a specific URL or a list of URLs to detect broken external and internal links (404s, 500s). Returns a mapping of all found links grouped by their HTTP status codes. Use when: (1) running routine technical link health audits, (2) cleaning up orphaned or deprecated resources. NOT for: bulk crawling entire websites recursively (use crawl-firecrawl)."
metadata:
  {
    "openclaw": {
      "emoji": "🔗",
      "requires": { "bins": ["node"] }
    }
  }
---

# BROKEN LINK SCANNER Skill

Identifies broken internal and external links on a provided web page.
