---
name: data-researcher
description: "Executes targeted web searches to retrieve specific statistics, factual claims, or case studies to embed as citations within content. Use when: (1) content-writer drafts a blog post and needs a specific factual backing, (2) you need to replace a [CITE] placeholder with a real statistic and external link. NOT for: finding competitor keywords (use serper-miner), crawling a whole page (use crawl-firecrawl)."
metadata:
  {
    "openclaw": {
      "emoji": "🔬",
      "requires": { "bins": ["python3"] }
    }
  }
---

# DATA RESEARCHER Skill

Searches the web for specific factual claims, statistics, and citations.

## Quick Start
```bash
cd scripts/ && python3 data-researcher.py <company-slug> --query="<search query>"
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Mining the top 10 search results for SEO metrics → use `serper-miner`
- Finding general industry trends for strategy → use `research-analyst` internal knowledge

## Output
Returns a JSON array of maximum 3 cited facts matching the query, including the statistic/claim, the source URL, and the source title.
Saved to `memory/research-<timestamp>.json`.

## Rules
- The query should be highly specific (e.g., `"average roi of email marketing 2024"` instead of `"email marketing"`).
- The script uses the SERPER_API_KEY from the system or `.env`.
- Always output the URL so that the `content-writer` can embed it as an actual `<a href>` citation in the content, permanently eliminating the `[CITE]` placeholder.
