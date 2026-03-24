---
name: rangani-engineering — Operator Capability Scope
last_updated: 2026-03-13
managed_by: operator
---

# Capability Scope — Rangani Engineering

> This file is the authoritative definition of what this system is and is not authorised to do for this client.
> The seo-orchestrator reads this file during every delta-evaluation and before creating any task.
> All agents must respect these constraints. Scope changes must be made here by the operator — not inferred from context.

---

## Content & Publishing

### In Scope
- WordPress blog posts — new drafts and content refreshes via `cms-wordpress` / `wpcli-manager`
- WordPress page edits — title, meta, body updates on existing pages
- Meta title and meta description optimisation across all indexed pages
- Schema markup injection (JSON-LD via WordPress)
- Featured image: **reuse from the existing WordPress media library only** — orchestrator must pass available media IDs to content-writer; content-writer selects the best fit from existing uploads
- Internal linking — adding or updating internal links within WordPress posts and pages

### Out of Scope
- **Image / photo generation** — no AI image generation, no Unsplash/stock fetch, no DALL-E or similar. If no suitable image exists in the media library, publish without a featured image and log `no-image-available`.
- **Video production** — no video scripting, recording, editing, or uploading of any kind
- **Podcast / audio content**
- **Infographic or graphic design**

---

## Social Distribution

### In Scope
- **Reddit** — value-first text posts and comments in pre-approved subreddits (see Sheet 09). Comments on existing relevant threads preferred when karma is low. Rate limit: 1 post per subreddit per 7 days.
- **Quora** — expert answers to pre-identified questions (see Sheet 09). Rate limit: max 3 answers per day across all clients.
- **LinkedIn** — professional posts on the company page (`linkedin_active: true`). Rate limit: 1 post per topic per 14 days.
- **Medium** — canonical syndication of published blog posts 800+ words only. Always set canonical URL.

### Out of Scope
- **YouTube** — no video publishing, channel management, or description optimisation. YouTube is explicitly excluded even though the skill may exist in the system.
- **Instagram** — not configured, not in scope
- **Facebook** — not configured, not in scope
- **Twitter / X** — not configured, not in scope
- **TikTok** — not in scope
- **Pinterest** — not in scope
- **Google Business Profile posts** — GBP profile optimisation is in scope (Sheet 10 tasks) but GBP post publishing is not yet activated; do not create `gbp-post` tasks until `gbp_posts_active: true` is set below

---

## Data & Analytics

### In Scope
- Google Search Console (GSC) — impressions, clicks, CTR, position tracking
- Google Analytics 4 (GA4) — traffic, sessions, conversion events
- Serper.dev — SERP data, competitor monitoring, keyword tracking
- Firecrawl — website crawls, technical audits, content extraction

### Out of Scope
- Ahrefs — skill exists in system but not configured for this company; do not attempt
- Google Ads / paid campaigns — organic SEO only
- Any paid advertising platform

---

## Technical SEO

### In Scope
- Page speed audits (PageSpeed Insights API)
- Crawl error detection (Firecrawl + GSC)
- Robots.txt and sitemap audits
- Schema markup validation
- Broken link scanning
- Core Web Vitals monitoring

### Out of Scope
- Hosting / server configuration changes (beyond what `wpcli-manager` can do safely)
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

These flags are read by agents before executing any distribution task. An agent must check the relevant flag before invoking any skill. If the flag is false or missing, skip that channel and log the reason.
