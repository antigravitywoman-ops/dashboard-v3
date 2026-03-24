---
company: arpit-sharma-writing
last_checked: 2026-03-21T18:57:13.920Z
generated_by: heartbeat-auto-sync
---

# Missing Dependencies — Arpit Sharma Writing

> **Auto-synced from .env by heartbeat.js on every cycle.** Do NOT manually edit Status values.
> heartbeat.js reads this before scheduling tasks — missing HIGH-priority credentials block dependent task types.
> Credential failures detected at runtime (by wp-technical or cms-wordpress) trigger an update to this file.
> For manually maintained notes, see the "Notes for Operator" section below.

---

## Environment & Credentials

| Key | Category | Priority | Status | Blocks |
|-----|----------|----------|--------|--------|
| `.env file` | environment | critical | present | everything |
| `WP_SITE_URL` | cms | medium | present — https://arpitsharmawriting.com/ | content-publish |
| `WP_USERNAME` | cms | medium | present — arpitsharmawriting@gmail.com | content-publish |
| `WP_APP_PASSWORD` | cms | medium | present — jnddE@MaN#iPnVN&WXVlBq7x | content-publish |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | credentials | high | present — /home/dev/openclaw-seo/keys/service-account.json |
| `GA4_PROPERTY_ID` | credentials | high | missing | GA4 traffic data |
| `GSC_SITE_URL` | credentials | high | present — https://arpitsharmawriting.com/ |
| `SERPER_API_KEY` | credentials | high | missing | SERP data, competitor intel, rank-track |
| `FIRECRAWL_API_KEY` | credentials | high | missing | technical-audit, content extraction |
| `REDDIT_CLIENT_ID` | social | medium | missing | reddit distribution |
| `REDDIT_CLIENT_SECRET` | social | medium | missing | reddit distribution |
| `REDDIT_REFRESH_TOKEN` | social | medium | missing | reddit distribution |
| `LINKEDIN_ACCESS_TOKEN` | social | medium | missing | linkedin distribution |
| `MEDIUM_INTEGRATION_TOKEN` | social | low | missing | medium syndication |
| `QUORA_SESSION_TOKEN` | social | low | missing | quora distribution |

---

## About Files

| File | Priority | Status | Notes |
|------|----------|--------|-------|
| `about/profile.md` | critical | present | Author profile, books, mentorship program |
| `about/goals.md` | high | present | Business and SEO objectives |
| `about/keywords.md` | high | present | Seed keyword list across all clusters |
| `about/competitors.md` | high | present | Author and UPSC competitor landscape |
| `about/scope.md` | high | present | Operator capability scope |
| `about/brand-voice.md` | high | present | Research-based, operator-reviewed 2026-03-15 |
| `about/audience.md` | normal | present | 4 buyer personas — self-help reader, UPSC aspirant, young writer, general reader |
| `about/missing-dependencies.md` | high | present | This file |

---

## Notes for Operator

- **WP_USERNAME / WP_APP_PASSWORD**: Both are set in .env. The WP_APP_PASSWORD is a login password — the system uses it to log in and automatically creates an Application Password on first publish via WordPress REST API. This file is auto-synced from .env by heartbeat.js — do not edit Status values manually.
- **GSC_SITE_URL**: Set to https://arpitsharmawriting.com/ (present). Verify the property is verified in Google Search Console.
- **GA4_PROPERTY_ID**: Set up GA4 property and add the numeric property ID here.
- HIGH priority credential items will block specific task types (see Blocks column).
- MEDIUM items will cause individual channels/features to be skipped.
- LOW items are silently skipped with a log entry.
