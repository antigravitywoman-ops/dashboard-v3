---
name: gbp-optimizer
description: "Manages Google Business Profile (GBP) listing signals: posts updates, uploads photos with geo-metadata, updates Q&A sections, and monitors review responses. Use when: (1) weekly local SEO maintenance, (2) the algorithm-updates directive requires fresh photo uploads, (3) a new GBP post is due per the content calendar. NOT for: gathering GSC/GA4 data (use those skills), schema markup (write JSON-LD directly)."
metadata:
  {
    "openclaw": {
      "emoji": "📍",
      "requires": { "bins": ["node"] }
    }
  }
---

# GBP OPTIMIZER Skill

Manages Google Business Profile listing signals for local SEO performance.

## Quick Start

```bash
cd scripts/ && node gbp-optimizer.js <company-slug> --action=post|photo|qa|review-response
```

## Actions

| Action | Description |
|---|---|
| `post` | Publish a GBP update post (offer, event, or what's new) |
| `photo` | Upload new photos with EXIF geo-metadata matching the business location |
| `qa` | Answer open questions in the Q&A section of the GBP listing |
| `review-response` | Draft responses to new reviews (does not auto-publish — outputs draft for review) |

## When NOT to Use

- Gathering analytics data → use `ga4-fetch` or `gsc-fetch`
- Schema markup on website → write JSON-LD directly in the CMS
- Citation management on other directories → use the Citations Checklist manually

## Output Per Action

- `post`: Returns `{ postId, publishedAt, postType }` after successful GBP post
- `photo`: Returns `{ photoId, geoTagged: true|false, uploadedAt }`
- `qa`: Returns `{ questionId, answerDraft, published: false }` — all Q&A answers output as drafts
- `review-response`: Returns `{ reviewId, responseDraft }` — never auto-publishes review responses

## Setup Requirements

- `GBP_LOCATION_ID` in company `.env` — the numeric location ID from the GBP dashboard
- `GOOGLE_SERVICE_ACCOUNT_JSON` in company `.env` — must have My Business API access

## Rules

- **Photos**: Upload 2-3 fresh photos per week per `system-memory/algorithm-updates.md` directive. Photos must have EXIF GPS coordinates matching the operating address.
- **Posts**: GBP posts expire after 7 days. Publish at least 1 post per week to maintain freshness signals.
- **Review responses**: Always output as draft. Never auto-publish review responses. Human review required.
- **Q&A**: Only answer questions where the answer is factually certain. Do not guess.
- **Rate limits**: GBP API allows 60 requests per minute per project.
