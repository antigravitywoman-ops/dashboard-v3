---
name: crawl-browser
description: "Full-site headless browser crawler with SPA detection and JS-navigation fallback. Crawls multi-page sites, detects React/Vue/Angular SPAs where direct HTTP requests return 404, and extracts real rendered content via route interception simulation. Use for: (1) full site crawls where Firecrawl key is absent, (2) JS-rendered SPA sites where static crawlers return empty content, (3) onboarding audits that must discover the full real page inventory. Output includes url_type field: HTTP_200 (indexable), JS_ROUTE_ONLY (SPA content but server 404 — fix routing), DEAD_ROUTE (404 and no JS content). NOT for: single-page WebFetch tasks (just use WebFetch directly)."
metadata:
  {
    "openclaw": {
      "emoji": "🕷️",
      "requires": { "bins": ["node"], "npm": "playwright" }
    }
  }
---

# CRAWL BROWSER Skill

Full-site multi-page crawler with automatic SPA detection and JS-navigation fallback.
Handles both traditional server-rendered sites AND React/Vue/Angular SPAs.

## Quick Start

```bash
cd ~/openclaw-seo/skills/crawl-browser && \
PLAYWRIGHT_BROWSERS_PATH=/home/dev/.cache/ms-playwright \
node scripts/crawl-browser.js <company-slug> --url=<homepage-url> [--limit=150] [--mode=auto|http|spa]
```

**Examples**:
```bash
# Auto-detect (recommended — tries HTTP, probes for SPA, JS-navigates if SPA found)
node scripts/crawl-browser.js rangani-engineering --url=https://ranganiindia.com/ --limit=150

# Force HTTP-only (fast, for known static sites)
node scripts/crawl-browser.js acme-corp --url=https://acme.com/ --mode=http

# Force SPA mode (if you know it's a React/Vue app)
node scripts/crawl-browser.js myapp --url=https://myapp.io/ --mode=spa
```

## Crawl Modes

| Mode | What it does |
|---|---|
| `auto` | Phase 1: HTTP crawl all discovered URLs. Phase 2: detect SPA via probe. Phase 3: JS-navigate 404 routes via route interception if SPA confirmed. |
| `http` | HTTP-only crawl. Fast, no SPA fallback. |
| `spa` | JS-navigation only. Skips HTTP phase. |

## SPA Detection Logic

In `auto` mode, the crawler detects SPAs when:
1. **Status signal**: ≥ 40% of non-home pages return HTTP 404
2. **Probe confirmation**: JS-navigating the first 404 route via route interception renders content (word_count > 30 or H1 present)
3. **HTML signal**: homepage HTML contains React/Vue/Angular bundle markers

If SPA is detected, the crawler uses **route interception simulation**:
- Intercepts all 404 responses and serves homepage HTML instead (simulates `/* /index.html 200` catch-all)
- React/Vue Router then handles the URL client-side and renders the correct component
- Real page content is extracted from the fully rendered DOM

## Output

Saved to: `companies/<slug>/technical/audits/<YYYY-MM-DD>-onboarding-crawl.json`

> **Note**: This output is the **raw crawl result**. It contains `crawl_meta`, `critical_issues[]`, and `pages[]` only.
> Fields like `summary`, `health_score`, `meta_summary`, and `highlights` are NOT computed here.
> After this file is written, run the `audit-enricher` skill to compute those dashboard-required fields.
> The `audit-enricher` skill is automatically called in the `wf-company-onboarding` and `wf-technical-audit` workflows.

### Page `url_type` values

| url_type | HTTP Status | Meaning | Scheduling impact |
|---|---|---|---|
| `HTTP_200` | 200 | Real server-accessible page | Schedule content tasks normally |
| `JS_ROUTE_ONLY` | 404 | SPA content exists but server returns 404 | Content tasks valid — MUST be paired with CRITICAL routing fix task |
| `DEAD_ROUTE` | 404 | No content found even via JS | No content tasks — investigate if route should exist |
| `HTTP_3xx` | 3xx | Redirect | Follow redirect destination; add redirect audit task |
| `ERROR` | — | Fetch failed (timeout, network error, PDF download) | Log and skip |

### Output JSON structure

```json
{
  "crawl_meta": {
    "mode": "auto",
    "spa_detected": true,
    "server_routing_broken": true,
    "summary": {
      "http_200": 1,
      "js_route_only": 7,
      "dead_route": 0,
      "http_4xx": 0,
      "errors": 1
    }
  },
  "critical_issues": [
    {
      "type": "SERVER_ROUTING_BROKEN",
      "severity": "CRITICAL",
      "priority": "critical",
      "message": "7 pages return HTTP 404 but render via JS. Fix: add catch-all rewrite.",
      "fix": "Netlify: _redirects → /* /index.html 200. Nginx: try_files $uri /index.html.",
      "affected_urls": [...]
    }
  ],
  "pages": [
    {
      "url": "https://example.com/about",
      "status": 404,
      "url_type": "JS_ROUTE_ONLY",
      "spa_content_found": true,
      "title": "About Us",
      "h1": "Our Story",
      "meta_desc": "...",
      "canonical": "",
      "word_count": 580,
      "internal_links": [...],
      "note": "Content found via SPA simulation. Server returns 404 for direct HTTP requests. Fix server routing to make this page indexable."
    }
  ]
}
```

Critical issues are also appended to `companies/<slug>/technical/issues-log.md`.

### issues-log.md Format

The issues-log is written in a machine-parseable format that the SEO dashboard and other agents consume. Each crawl appends a new section. The exact format is:

```markdown
# Issues Log — <slug>

---
## Crawl Issues — <YYYY-MM-DD>

> Source: crawl-browser (SPA-aware) | <ISO timestamp>

### [CRITICAL] SERVER_ROUTING_BROKEN
- **Message**: 7 pages return HTTP 404 but render via JS. Fix: add catch-all rewrite.
- **Fix**: Netlify: _redirects → /* /index.html 200. Nginx: try_files $uri /index.html.
- **Affected URLs** (7): https://example.com/about, https://example.com/contact, ...

### [MEDIUM] MISSING_CANONICAL_HOMEPAGE
- **Message**: Homepage has no canonical tag.
- **Fix**: Add <link rel="canonical" href="https://example.com/" /> to <head>.
```

**Parsing rules for agents reading this file:**
- Blockquote lines (`>`) are source attribution — skip lines starting with `> Source:`
- `### [SEVERITY] TYPE` lines mark the start of an issue — extract `TYPE` as the issue identifier
- `- **Message**: ...` lines contain the human-readable issue text — extract this as the primary display string
- `- **Fix**: ...` lines contain remediation steps
- `- **SEO Impact**: ...` lines contain SEO impact notes
- `- **Affected URLs**: ...` lines list affected URLs
- Standard `- item` bullets without `**FieldName**:` format are standalone issues (fallback)

## Scheduling Rules for Agents Reading This Output

**When `crawl_meta.server_routing_broken: true`**:
1. Create a `CRITICAL` priority task: type `website-edit`, title `Fix server-side catch-all routing`, assigned_to `HUMAN` (or `content-publisher` if hosting platform access exists)
2. All tasks targeting `JS_ROUTE_ONLY` pages are **content-valid** (the page content was real) but **publish-blocked** — mark them `status: deferred` with reason `routing-fix-required`
3. Do NOT prevent content analysis, keyword mapping, or meta description drafting for these pages — the content is real, just not server-accessible yet
4. Once the routing fix task is marked complete, unblock deferred tasks

**When `url_type: HTTP_200`**: schedule on-page tasks normally.

**When `url_type: DEAD_ROUTE`**: do not schedule content tasks. Add to technical issues list.

## Rules

- Always save crawl output to `technical/audits/<YYYY-MM-DD>-onboarding-crawl.json`
- Always write critical issues to `technical/issues-log.md`
- Default page limit: 150. Do not exceed without explicit operator instruction.
- Playwright browsers must be installed: `npx playwright install chromium`
- Browser cache: `PLAYWRIGHT_BROWSERS_PATH=/home/dev/.cache/ms-playwright`
- npm deps: run `npm install` in `skills/crawl-browser/` if node_modules missing
