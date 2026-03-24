---
name: post-linkedin
description: "Transforms a gate-approved blog draft into a LinkedIn-native professional post with hook, structured short paragraphs, and hashtags. Uses business-outcome framing from the distribution brief written by the Brain. Publishes to the company LinkedIn page or personal profile per configuration. Use when: off-page workflow routes a distribute-content task with linkedin as a channel. NOT for: Reddit posts (post-reddit), Medium syndication (post-medium), forum threads (post-quora)."
metadata:
  {
    "openclaw": {
      "emoji": "💼",
      "requires": { "bins": ["node"] }
    }
  }
---

# POST LINKEDIN Skill

Transforms a blog draft into a LinkedIn-native post using the Brain's pre-planned business-outcome angle, brand voice, and professional formatting. LinkedIn posts are NOT excerpts or reposts of the blog — they are standalone professional insights that reference the full article as a resource.

## Quick Start
```bash
cd scripts/ && node post-linkedin.js <company-slug> \
  --draft=<path-to-md> \
  --angle="<distribution_linkedin_angle from frontmatter>"
```

## When NOT to Use

❌ Don't use when:
- Target is Reddit → use `post-reddit`
- Target is Medium → use `post-medium`
- Content is a thin update (< 200 words in source) → skip LinkedIn, insufficient material
- `linkedin_active: false` in `companies/<slug>/about/profile.md`
- A LinkedIn post about the same topic was published within 14 days (check distribution-log.md)

---

## Role of This Skill

This skill **validates structure and executes the API call**. It does not generate content. The content-publisher has already extracted the relevant insight from the master draft, applied the hook format, trimmed to LinkedIn paragraph style, and added hashtags. This skill receives pre-prepared post text via `--text-file`, runs a final character count and prohibited-phrase check, then publishes via the LinkedIn API.

## Structural Rules (used by content-publisher during extraction + reformatting)

The content-publisher applies these rules when preparing the post text before calling this skill.

### Step 1 — Read all inputs
- Master draft: path from task `result_path`
- `distribution_linkedin_angle` from frontmatter — Brain's business-outcome framing hint (e.g., "ROI of sustainability certification on luxury resort occupancy rate")
- `companies/<slug>/about/brand-voice.md` → LinkedIn tone descriptor, `linkedin_link_placement` setting ("post" or "first_comment")
- `companies/<slug>/about/profile.md` → company name, industry, years in business, certifications, measurable results (for E-E-A-T signals)
- `companies/<slug>/memory/sheets/05-keyword-research.md` → keyword clusters for hashtag selection

### Step 2 — Deduplication check
Read `companies/<slug>/content/distribution-log.md`:
- If a LinkedIn post was published on the same topic or keyword within 14 days → adapt to a derivative angle
- Compare `distribution_linkedin_angle` against the last 5 LinkedIn entries in the log
- Acceptable derivatives: if blog was about "cost of X" → LinkedIn can cover "ROI of X" or "3 decisions that determine cost of X"
- If no derivative angle is distinct enough → skip LinkedIn for this content cycle, log `angle-overlap-skip`

### Step 3 — Select a hook format
Pick the format that best fits the `distribution_linkedin_angle`:

| Format | Pattern |
|---|---|
| Bold Claim | "The [industry] rule everyone follows is wrong about [X]." |
| Sharp Question | "How many [target audience] lose [outcome] because they ignore [X]?" |
| Stat Lead | "[Number]% of [domain] professionals overlook [X]. Here's what changes when you don't." |
| Counterintuitive | "We [did X] and the result surprised us. Here's what we learned." |
| Story opener | "A [client type] came to us with [specific problem]. 90 days later, [specific result]." |

The hook is the most important line — it appears before "See more" in the feed. If the hook is weak, the post gets no reads.

### Step 4 — Write the LinkedIn post (runtime generation)

**Post structure:**
```
LINE 1: Hook — single sentence, no fluff, no "I'm excited to share"
[blank line]

CONTEXT BLOCK (2–3 sentences):
  Establish the problem or tension using business-outcome language.
  Use: revenue, efficiency, occupancy rate, churn, cost reduction, conversion rate
  Specific numbers beat vague claims: "23% lower" > "significantly lower"
  Extract data points and results from the blog draft body.
[blank line]

INSIGHT BODY (3–5 paragraphs, max 2 lines each):
  Each paragraph = one insight, one step, or one lesson
  Extract core insights from the blog draft — do NOT copy paragraphs verbatim
  Can use numbered lists or emoji bullets if brand-voice.md permits
  End with the insight that naturally sets up the CTA
[blank line]

CTA / LINK LINE (1 sentence):
  If linkedin_link_placement = "post": include URL directly
  If linkedin_link_placement = "first_comment": write "Full breakdown in comments 👇"
  Never: "Check out our website", "Visit our blog", "Contact us"
  Instead: "Full [specific benefit] breakdown here: [url]" or "I documented the process: [url]"
[blank line]

HASHTAGS (3–5):
  Line: #IndustryHashtag #TopicHashtag #NicheHashtag
  Never: #business #entrepreneur #success #motivation (too generic, no SEO/distribution value)
```

**Tone calibration from brand-voice.md:**
- Extract E-E-A-T signals from `about/profile.md`: "Over 12 years in [vertical]...", "Working with 40+ [client type]..."
- Professional but not corporate: avoid passive voice, buzzwords, and jargon
- If brand voice uses first-person "we": use it for credibility. If expert-authority: use insight framing
- Prohibited: "excited to announce", "pleased to share", "thrilled", "passionate about", "leverage", "synergy"

**Length:** 900–1,800 characters (hard cap 3,000 — optimal for algorithmic reach is under 1,800)

### Step 5 — Hashtag selection
From `companies/<slug>/memory/sheets/05-keyword-research.md` keyword clusters:
- 1 broad industry hashtag (e.g., `#HospitalityMarketing`, `#CivilEngineering`)
- 1 topic hashtag matching `target_keyword` (e.g., `#EcoResort`, `#StructuralDesign`)
- 1 geo or niche hashtag matching company geography or vertical
- Optional 4th–5th: from related topic cluster
- Use script's LinkedIn hashtag lookup to prefer tags with > 1,000 followers

---

## Output
Returns `{ postId, url, publishedAt, characterCount, hashtagsUsed, linkPlacement }`.

## Rules
- Load `LINKEDIN_ACCESS_TOKEN` from company `.env`
- Hard cap: 3,000 characters
- Log result immediately to `companies/<slug>/content/distribution-log.md`:
  `| <ISO> | linkedin | <postUrl> | <contentUrl> | <angleUsed> | <hashtags> | published |`
- Never cross-post the same angle used on Reddit to LinkedIn — different platform, different professional audience, different framing mandatory
