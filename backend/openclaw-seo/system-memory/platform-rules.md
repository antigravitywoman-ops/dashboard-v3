# Global Platform Distribution Rules & Rate Limits

This file dictates how worker agents interact with social and community platforms. All distribution agents and post-* skills must abide by these rules. Rules here override any per-skill defaults.

---

## Universal Rules (All Platforms)

- **No duplicate angles**: Each platform must receive a distinct framing of the content. Reddit, LinkedIn, Quora, and Medium readers are different audiences. If the angle is the same, it's spam.
- **No cross-platform copy-paste**: Never post identical or near-identical text to two platforms.
- **One link per post**: A single canonical link to the company's CMS URL. No supplementary social links, no email addresses.
- **Brand voice is adaptive**: Apply the brand voice from `about/brand-voice.md` but adapt it to the platform norm. A "formal" brand voice becomes "knowledgeable peer" on Reddit, not formal corporate.
- **No fabrication**: Every statistic, result, or case mentioned must come from the master draft, `profile.md`, or a crawled source. Never invent specifics.
- **Log every action**: Every distribution action — including skips and failures — must be appended to `companies/<slug>/content/distribution-log.md` before moving to the next channel.

---

## Reddit

**Audience**: Domain-specific communities of practitioners and enthusiasts. Highly adversarial to marketing.

**Tone**: Value-first, community-peer, hyper-specific. Write as a person who belongs to the community.

**Format rules**:
- Use Reddit-flavored Markdown: bold with `**`, lists with `-`, no headers in body text
- Text posts: 150–400 words. Comments: 80–200 words
- No "call to action" language whatsoever — no "click here", "check out", "visit our site"
- Link goes at the END, in a specific format: "Full [specific thing] breakdown: [url]"
- In new subreddits (account karma < 10 there): link goes in first comment, not body

**Rate limits**:
- Hard limit: 1 post per subreddit per 7 rolling days
- Soft limit: Do not post to more than 3 subreddits for the same piece of content total
- Never cross-post identical or near-identical content across subreddits — each post must use a distinct angle

**Prohibited**:
- Company name in the first line
- "We published a post about..."
- Any CTA or lead-gen language
- More than one link
- Posting in a subreddit without first reading its rules in the current run

**Community trust signals**:
- Ask a genuine question at the end to invite discussion
- Acknowledge community knowledge: "I imagine many here have dealt with this differently"
- Credit relevant other community members if referencing an existing thread

---

## Quora

**Audience**: General public seeking expert, authoritative answers. Discovery-driven — answers found via Google.

**Tone**: Expert, explanatory, cite-backed. Write as a domain expert who is helping someone understand.

**Format rules**:
- BLUF structure: direct answer in first 2–3 sentences, then depth
- Use Quora bold (`**text**`) for key terms; use numbered lists for steps
- Do NOT use Markdown headers — they render as raw `## text` on Quora
- 250–550 words — substantive but not exhaustive
- One external link, at the end, with specific benefit language

**Rate limits**:
- Global cap: max 3 answers/day across all company accounts combined
- Do not answer the same question twice (check distribution-log.md)
- Minimum 3-day gap between answers from the same account to avoid spam flags

**Prohibited**:
- Starting with "Great question!", "That depends...", or any other filler opener
- More than one external link
- Taglines, slogans, or promotional language
- Answering questions that aren't a strong topical match (relevance > volume)

**Quality bar**:
- The answer must be genuinely useful without the link — the link is a bonus, not the point
- Cite specific data points, timeframes, or measurements from the master draft
- Include credential context organically: years in domain, client type, specific outcome

---

## LinkedIn

**Audience**: Business professionals in related industries. Discovery via feed algorithm and hashtags.

**Tone**: Professional but direct. Insight-driven, outcome-focused. No corporate fluff.

**Format rules**:
- Hook in line 1 — the single most important line (visible before "See more")
- Max 2 sentences per paragraph — LinkedIn algorithm deprioritizes walls of text
- Line breaks between every paragraph
- 3–5 hashtags at the end (mix: 1 industry, 1 topic, 1 niche/geo)
- Link in post body OR in first comment per `linkedin_link_placement` in `brand-voice.md`
- Hard character cap: 3,000. Target: under 1,800 for optimal reach

**Rate limits**:
- Soft limit: 1 LinkedIn post per topic per 14 days
- Do not publish two posts on the same keyword within the same week

**Prohibited**:
- "Excited to share", "Thrilled to announce", "Passionate about"
- "Leverage", "synergy", "solution", "ecosystem" (corporate filler)
- Multiple external links
- Hashtags with < 500 followers or ultra-generic tags (#business, #success, #entrepreneur)

**Algorithm guidance**:
- Native content outperforms link posts — keep the best insight in the post itself
- Question at end or engagement invitation increases comment probability
- Posting time: Tuesday–Thursday, 8–10am or 12–2pm in the company's primary timezone

---

## Medium

**Audience**: Curious professionals and generalist readers discovering via Medium tags and publications.

**Tone**: Polished, informational, thought-leadership. Adapted for readers with no brand context.

**Format rules**:
- Full article syndication — body content must be substantially the same as the original for canonical protection
- Only the introduction (first 2–3 paragraphs) is rewritten for cold readers
- "Originally published at [URL]" at the end — Medium convention, reinforces canonical
- 3–5 Medium tags selected from relevant tag categories (verify > 500 followers each)
- Canonical URL set in API call — this is non-negotiable

**Rate limits**:
- Never re-syndicate the same canonical URL to Medium
- Maximum 2 syndications per week per company account to avoid quality flags
- If submitting to a Medium publication: allow 72 hours for editor review before re-queuing

**Prohibited**:
- Publishing without canonical URL set
- Rewriting or paraphrasing the body content (canonical protection requires substantial similarity)
- Starting article with brand name or local context ("Inika Resorts is a Maldives..." doesn't work for cold readers)
- Tags with < 500 followers or tags that don't match the article's actual topic

**Publication targeting** (when available):
- Submissions to relevant publications outperform personal feed by 3–10x in reach
- Check `about/profile.md` for pre-approved Medium publications
- Track pending submissions in distribution-log.md as `pending-publication-review`

---

## Distribution Log Format

All platforms log to `companies/<slug>/content/distribution-log.md` in this format:

```markdown
| ISO Timestamp | Platform | Post/Answer URL | Content CMS URL | Subreddit or Question URL | Angle Used | Status |
|---|---|---|---|---|---|---|
| 2026-03-10T08:15:00Z | reddit | https://reddit.com/r/... | https://company.com/blog/... | r/EcoTravel | cost-comparison-first-time | published |
| 2026-03-10T08:30:00Z | linkedin | https://linkedin.com/feed/... | https://company.com/blog/... | — | ROI-sustainability-occupancy | published |
| 2026-03-10T09:00:00Z | quora | https://quora.com/... | https://company.com/blog/... | https://quora.com/What-is... | expert-selection-guide | published |
| 2026-03-10T09:30:00Z | medium | https://medium.com/@.../... | https://company.com/blog/... | — | cold-reader-universal-hook | published |
```

Status values: `published`, `failed`, `rate-limit-skip`, `angle-overlap-skip`, `already-answered`, `already-syndicated`, `blocked-canonical`, `low-karma-mode`, `pending-publication-review`
