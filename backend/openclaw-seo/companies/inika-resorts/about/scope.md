# Capability Scope — Inika Resorts

> This file is the authoritative definition of what this system is authorised to do.
> The seo-orchestrator reads this before every delta-evaluation.
> Edit operator flags below to enable or disable channels.

## Content & Publishing

### In Scope
- WordPress blog posts (new drafts and content refreshes)
- WordPress page edits (meta, body updates)
- Meta title and meta description optimisation
- Schema markup injection (JSON-LD)
- Featured image: reuse from existing media library only

### Out of Scope
- AI image generation — if no image exists in media library, publish without featured image
- Video production, podcast/audio content, infographics

## Social Distribution

### In Scope
- Reddit — value-first posts in relevant subreddits
- Quora — expert answers to pre-identified questions

### Out of Scope
- LinkedIn — not yet configured
- Medium — not configured
- YouTube — explicitly excluded
- Instagram, Facebook, Twitter/X, TikTok, Pinterest — not configured

## Operator Flags

```yaml
linkedin_active: false
reddit_active: true
quora_active: true
medium_syndication_active: false
gbp_posts_active: true
youtube_active: false
image_generation_active: false
ahrefs_active: false
```
