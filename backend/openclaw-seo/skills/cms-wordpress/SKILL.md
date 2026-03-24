## Escalate to wp-technical For

| Symptom | wp-technical action |
|---------|---------------------|
| REST 401 on any write | `auth-resolve` |
| All pages share same H1 | `fix-h1` |
| No SEO plugin / meta descriptions missing | `install-yoast` then `configure-yoast` |
| Schema markup absent | `inject-schema` |
| FSE template read/write needed | `read-template` / `write-template` |
| Cache stale after publish | `purge-cache` |
| Live page audit (H1, meta, schema, canonical) | `audit-live` |

---
name: cms-wordpress
description: "Creates, updates, and manages WordPress posts, pages, categories, tags, and metadata via the WordPress REST API. Use when: (1) a blog draft needs to be published to a WordPress site, (2) updating an existing post's featured image or metadata. NOT for: bulk database operations (use wpcli-manager), non-WordPress CMS (use cms-editor-generic), generating content (use blog-generate)."
metadata:
  {
    "openclaw": {
      "emoji": "🔷",
      "requires": { "bins": ["node"] }
    }
  }
---

# CMS WORDPRESS Skill

Manages WordPress content and metadata via REST API.

## Quick Start
```bash
cd scripts/ && node cms-wordpress.js <company-slug> --action=publish|update --draft=<path> [--post-id=<id>]
```

## When NOT to Use

❌ **DON'T use this skill when:**
- Bulk content imports, cache flush, or plugin management → use `wpcli-manager`
- Non-WordPress platform → use `cms-editor-generic`

## Output
Returns `{ postId, slug, status, liveUrl }`.

## Auth Resolution

**Before any write operation**, verify credentials work:
1. Test `GET /wp-json/wp/v2/users/me` with `Authorization: Basic base64(user:WP_APP_PASSWORD)`
2. HTTP 200 → proceed with REST API Basic Auth
3. HTTP 401 `rest_not_logged_in` → `WP_APP_PASSWORD` is a login password, not an App Password → **escalate to `wp-technical` skill** with `--action=auth-resolve`
4. HTTP 401 `application_passwords_disabled` → App Passwords disabled → **escalate to `wp-technical`**

**If auth fails, ALWAYS run `wp-technical --action=auth-resolve` before retrying.** Do not attempt content operations with broken auth.

> See `skills/wp-technical` for the full 3-tier auth fallback chain (App Password → Cookie+Nonce → XML-RPC) and all WordPress infrastructure operations (FSE template editing, Yoast install/configure, schema inject, cache purge, H1 fix).

## Credential Detection + Dependency Sync

**This skill detects and records credential failures automatically.**

- On startup: loads `.env`, checks for blank `WP_USERNAME` / `WP_APP_PASSWORD`
- Blank credentials → flags both keys as `missing` in `missing-dependencies.md` immediately
- HTTP 401 from REST API → flags `WP_APP_PASSWORD` as `missing — auth failed (401)` and **returns `status: escalated`** with `escalate_to: wp-technical, action: auth-resolve`
- This causes the orchestrator to queue a `wp-technical` task without manual intervention
- `wp-technical` may auto-generate a new App Password and write it to `.env`, which heartbeat.js syncs next cycle

**You do not need to manually update `missing-dependencies.md`.** It is auto-synced by heartbeat.js and updated by skills at runtime.

## Rules
- Load `WP_SITE_URL`, `WP_USERNAME`, `WP_APP_PASSWORD` from company `.env`.
- Set post status to `draft` unless explicitly told to publish.
- Always set the Yoast/SEOPress meta title and meta description fields.
- Always backup the current post state (`--action=backup`) before applying any patch.

## Patch Policy — Minimal Footprint

**Default behavior is surgical patching, NOT full replacement.**

When updating an existing post:
1. Fetch the current post content via REST API first
2. Apply only the specific field(s) that need to change (title, content blocks, meta)
3. Leave all other fields untouched (categories, tags, featured image, slug, template)
4. Do NOT send a full content replacement unless the draft covers the entire post

### Fields that must NEVER be patched without explicit operator instruction:
- `template` (page template / theme layout)
- CSS classes or inline styles on existing elements
- Brand colors (hex/rgb values anywhere in content)
- Navigation menus or widget areas
- Sidebars, headers, footers
- ACF/custom fields not directly related to the content update task

### Human review required before patching:
- Any change to `post_type` or page template
- Adding or removing a top-level page from navigation
- Changing a post slug (breaks URLs / backlinks)
- Modifying more than 3 ACF/custom fields in a single operation
- Any structural change that affects how the theme renders the page

Write proposed changes to `reviews/<slug>-cms-review.md` and set task status to `waiting-human` for these cases.
