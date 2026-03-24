---
name: arpit-sharma-writing — Operator Capability Scope
last_updated: 2026-03-15
managed_by: operator
---

# Capability Scope — Arpit Sharma Writing

> This file is the authoritative definition of what this system is and is not authorised to do for this client.
> The seo-orchestrator reads this file during every delta-evaluation and before creating any task.
> All agents must respect these constraints. Scope changes must be made here by the operator.

---

## Content & Publishing

### In Scope
- WordPress blog posts — new drafts and content refreshes via `cms-wordpress` / `wpcli-manager`
- WordPress page edits — title, meta, body updates on existing pages (About, Books, Mentorship, Contact)
- New pages if research supports them (e.g. location pages, topic hub pages, dedicated book landing pages)
- Meta title and meta description optimisation across all indexed pages
- Schema markup injection (JSON-LD via WordPress) — especially Author, Book, and Course schema
- Internal linking — adding or updating internal links within WordPress posts and pages
- Featured image: **reuse from the existing WordPress media library only** — if no suitable image exists, publish without featured image and log `no-image-available`

### Out of Scope
- **Image / photo generation** — no AI image generation, no stock fetch, no DALL-E
- **Video production** — no YouTube, no reels, no video scripting
- **Podcast / audio content**
- **Infographic or graphic design**

---

## Social Distribution

### In Scope
- **Reddit** — value-first text posts and comments in relevant subreddits (r/selfimprovement, r/personalfinanceindia, r/UPSC, r/india, r/books, r/IndianWritersOnReddit). Rate limit: 1 post per subreddit per 7 days.
- **Quora** — expert answers to questions on UPSC prep, self-help books, writing journey, personal development. Rate limit: max 3 answers per day across all clients.
- **Medium** — canonical syndication of published blog posts 800+ words only. Always set canonical URL back to arpitsharmawriting.com.
- **LinkedIn** — personal profile posts (not company page). Rate limit: 1 post per topic per 14 days.

### Out of Scope
- **YouTube** — no video publishing or description optimisation
- **Instagram** — account exists but not managed by this system
- **Facebook** — not in scope
- **Twitter / X** — not in scope
- **TikTok** — not in scope
- **Google Business Profile** — personal brand, no physical storefront; GBP not applicable

---

## Data & Analytics

### In Scope
- Google Search Console (GSC) — impressions, clicks, CTR, position tracking
- Google Analytics 4 (GA4) — traffic, sessions, conversion events
- Serper.dev — SERP data, competitor monitoring, keyword tracking
- Firecrawl — website crawls, technical audits, content extraction

### Out of Scope
- Ahrefs — not configured; do not attempt
- Google Ads / paid campaigns — organic SEO only

---

## Technical SEO

### In Scope
- Page speed audits (PageSpeed Insights API)
- Crawl error detection
- Robots.txt and sitemap audits
- Schema markup validation (Author, Book, Course, BlogPosting types)
- Broken link scanning
- Core Web Vitals monitoring

### Out of Scope
- Hosting / server configuration changes
- DNS changes
- SSL certificate management

---

## Operator Flags

```yaml
linkedin_active: true
reddit_active: true
quora_active: true
medium_syndication_active: true
gbp_posts_active: false
youtube_active: false
image_generation_active: false
ahrefs_active: false
```

## Operator Execution Settings

```yaml
# Website optimisation execution — all active
content_drafts_active: true        # New blog posts via content-writer
content_refresh_active: true       # Refresh underperforming posts
schema_injection_active: true      # Schema markup via website-edit tasks
on_page_fixes_active: true         # Meta titles, H1s, internal links
technical_audit_active: true       # Weekly technical audit via data-intelligence
weekly_execution_cadence: weekly   # How often step-5 execution tasks are created
max_content_drafts_per_week: 1     # One new post per week
max_refresh_tasks_per_week: 2      # Max 2 refresh tasks per week
max_website_edits_per_cycle: 3     # Max 3 on-page fix tasks per delta-eval
```
