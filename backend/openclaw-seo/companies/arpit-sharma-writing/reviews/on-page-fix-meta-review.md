# Review: on-page-fix — Meta Descriptions, H1 Tags, Canonical Tag
**Task ID**: task-arpit-sharma-writing-on-page-fix-meta-1773585060000
**Status**: waiting-human — WP Application Password not configured
**Generated**: 2026-03-15T15:00:00.000Z
**Agent**: model-local (meta-optimizer + seo-orchestrator proxy)

---

## Blocker

Same as schema-inject: `WP_APP_PASSWORD` must be a WordPress Application Password, not the login password.
See schema-inject-review.md for steps.

---

## Audit: Current State (live, scraped 2026-03-15)

| Page | H1 (current) | Meta Desc | Canonical | Priority |
|------|-------------|-----------|-----------|----------|
| / | "Arpit Sharma" | MISSING | MISSING | CRITICAL |
| /about-me/ | "Arpit Sharma" | MISSING | present | CRITICAL |
| /stoics-mentorship-upsc/ | "Arpit Sharma" | MISSING | present | CRITICAL |

All 3 pages share identical H1 "Arpit Sharma" — confirmed DUPLICATE-H1-TAGS gap.

---

## Approved Copy

### Homepage (/)
| Field | Approved Value |
|-------|---------------|
| SEO Title (Yoast) | Arpit Sharma - Author, UPSC Mentor & Personal Development Writer |
| Meta Description | Published author and UPSC mentor from Bhopal. Arpit Sharma writes on self-discovery, resilience, and the writing life. Founder of Stoics Mentorship for UPSC 2027 aspirants. |
| H1 | Arpit Sharma — Author, Mentor & UPSC Guide |
| Canonical | https://arpitsharmawriting.com/ (ADD — currently missing) |

**Meta desc chars**: 167 (trim if Yoast shows orange — target <155)
**Trimmed version**: Published author and UPSC mentor from Bhopal. Arpit Sharma writes on self-discovery, resilience, and the writing life. Stoics Mentorship for UPSC 2027.

### /about-me/ (Post ID: 27)
| Field | Approved Value |
|-------|---------------|
| SEO Title (Yoast) | About Arpit Sharma - Published Author at 17 & UPSC Mentor, Bhopal |
| Meta Description | Author of two books. Published at 17, 20M+ words written, met Nobel Laureate Kailash Satyarthi. Running Stoics Mentorship for UPSC 2027 aspirants from Bhopal. |
| H1 | About Arpit Sharma — Young Author, UPSC Mentor & 20M-Word Writer |
| Canonical | https://arpitsharmawriting.com/about-me/ (already present — no change) |

**Meta desc chars**: 151 ✅

### /stoics-mentorship-upsc/ (Post ID: 1)
| Field | Approved Value |
|-------|---------------|
| SEO Title (Yoast) | Stoics Mentorship - Personal 1-on-1 UPSC 2027 Coaching for Working Professionals |
| Meta Description | Personal UPSC mentorship for working professionals by Arpit Sharma. Tailored strategy, weekly 1-on-1 sessions, and accountability — not a coaching factory. UPSC Civil Services 2027. |
| H1 | Stoics Mentorship — 1-on-1 UPSC Coaching for Working Professionals |
| Canonical | https://arpitsharmawriting.com/stoics-mentorship-upsc/ (already present — no change) |

**Meta desc chars**: 182 (trim to): Personal UPSC mentorship for working professionals by Arpit Sharma. Tailored strategy, weekly 1-on-1 sessions, accountability. UPSC Civil Services 2027.
**Trimmed chars**: 154 ✅

---

## Manual Application Steps (no API needed)

### Yoast SEO Meta (fastest path)

1. wp-admin → Posts → All Posts → hover "About Me" → click Edit
2. Scroll down to Yoast SEO panel → click "Edit snippet"
3. SEO title field: paste approved value above
4. Meta description field: paste approved value above
5. Click "Update" / "Publish"
6. Repeat for "Stoics Mentorship" post

### Homepage Meta

1. wp-admin → Yoast SEO → Settings → Site representation
   OR: Yoast → Search Appearance → Content Types → Home → set title + description
2. For homepage H1: edit the page/post set as homepage → change the H1 block text
3. For homepage canonical: Yoast SEO → Settings → Advanced → add canonical in the homepage edit panel

### H1 Changes

H1 tags are in the page content/builder. Edit each post/page in Gutenberg or Elementor:
- Find the top-level heading block
- Change the text to the approved H1 value above
- Do NOT change any other blocks, layout, or styling

---

## REST API Commands (once WP_APP_PASSWORD is fixed)

```bash
source /home/dev/openclaw-seo/companies/arpit-sharma-writing/.env

# About Me (ID 27) — title = H1 in WordPress
curl -s -X POST "https://arpitsharmawriting.com/wp-json/wp/v2/posts/27" \
  -u "${WP_USERNAME}:${WP_APP_PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "About Arpit Sharma — Young Author, UPSC Mentor & 20M-Word Writer",
    "meta": {
      "_yoast_wpseo_title": "About Arpit Sharma - Published Author at 17 & UPSC Mentor, Bhopal",
      "_yoast_wpseo_metadesc": "Author of two books. Published at 17, 20M+ words written, met Nobel Laureate Kailash Satyarthi. Running Stoics Mentorship for UPSC 2027 aspirants from Bhopal."
    }
  }'

# Stoics Mentorship (ID 1)
curl -s -X POST "https://arpitsharmawriting.com/wp-json/wp/v2/posts/1" \
  -u "${WP_USERNAME}:${WP_APP_PASSWORD}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Stoics Mentorship — 1-on-1 UPSC Coaching for Working Professionals",
    "meta": {
      "_yoast_wpseo_title": "Stoics Mentorship - Personal 1-on-1 UPSC 2027 Coaching for Working Professionals",
      "_yoast_wpseo_metadesc": "Personal UPSC mentorship for working professionals by Arpit Sharma. Tailored strategy, weekly 1-on-1 sessions, accountability. UPSC Civil Services 2027."
    }
  }'
```

Note: Homepage (front page) requires knowing the Page ID. Check:
`curl -s "https://arpitsharmawriting.com/wp-json/wp/v2/pages?per_page=50" -u "${WP_USERNAME}:${WP_APP_PASSWORD}" | python3 -c "import json,sys;[print(p['id'],p['slug']) for p in json.load(sys.stdin)]"`
