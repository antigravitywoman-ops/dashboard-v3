---
name: post-quora
description: "Writes and posts a high-quality expert answer to a pre-identified Quora question using BLUF structure, credential injection, and domain-specific authority signals. Naturally embeds a resource link. Use when: off-page workflow identifies a high-traffic Quora question matching target keywords. NOT for: Reddit (post-reddit), LinkedIn (post-linkedin), non-Quora forums (forum-commenter)."
metadata:
  {
    "openclaw": {
      "emoji": "❓",
      "requires": { "bins": ["node"] }
    }
  }
---

# POST QUORA Skill

Writes an expert Quora answer using Bottom Line Up Front (BLUF) structure with domain-specific authority signals extracted from the company profile and the blog draft. This skill does NOT copy the blog post — it extracts domain expertise and answers the specific Quora question directly.

## Quick Start
```bash
cd scripts/ && node post-quora.js <company-slug> \
  --question-url=<quora-url> \
  --draft=<path-to-md>
```

## When NOT to Use

❌ Don't use when:
- Target platform is Reddit → use `post-reddit`
- Industry forums (not Quora) → use `forum-commenter`
- The exact question URL already appears in `distribution-log.md` → already answered, skip
- The global Quora daily rate limit of 3 answers/day across all companies is hit

---

## Role of This Skill

This skill **validates structure and executes the API call**. It does not generate content. The content-publisher has already extracted the relevant H2 sections from the master draft, reordered them into BLUF structure, and added credential signals from `profile.md`. This skill receives pre-prepared answer text via `--text-file`, validates the question URL is valid and unanswered, checks the global daily rate limit, and submits via the Quora API.

## Structural Rules (used by content-publisher during extraction + reformatting)

The content-publisher applies these rules when preparing the answer text before calling this skill.

### Step 1 — Read all inputs
- Master draft: path from task `result_path` — for domain knowledge extraction only
- `distribution_quora_target` from frontmatter — Brain's pre-identified question URL or topic (e.g., "https://www.quora.com/What-is-the-best-eco-resort-in-Maldives")
- `companies/<slug>/about/profile.md` → credentials, years in business, certifications, specific client outcomes, domain expertise descriptors
- `companies/<slug>/about/brand-voice.md` → Quora tone (usually: expert, helpful, cite-backed, never promotional)
- `companies/<slug>/memory/sheets/09-reddit-quora.md` → pre-identified question and recommended answer angle from the Brain's research session

### Step 2 — Question relevance and quality assessment
Use `crawl-firecrawl` to fetch the Quora question page:
- Confirm the question's topic cluster matches the blog post's target keyword
- Read the top-voted existing answers: if the top answer is comprehensive and highly upvoted and covers the same ground → plan a genuinely different angle, not just the same answer repackaged
- Check view count: prefer questions with > 1,000 views for distribution value
- If question has been deleted, merged, or redirected → find the next question in Sheet 09

### Step 3 — Deduplication check
Read `companies/<slug>/content/distribution-log.md`:
- If this exact question URL appears in the log → STOP, log `already-answered`, move to next question in Sheet 09
- If a near-identical question was answered within 30 days and the answer would be substantially the same → find an alternative question from Sheet 09

### Step 4 — Write the Quora answer (runtime generation)

The content-publisher generates the answer text at runtime. The script accepts pre-written answer text as stdin or `--text-file` argument.

**Answer structure — BLUF (Bottom Line Up Front):**

```
DIRECT ANSWER BLOCK (first 2–3 sentences — most important):
  Answer the question immediately, specifically, and without preamble.
  "The best X for Y depends on Z. In our experience working with [N] [client type] over [X years], the most common mistake is [specific mistake] — and here's how to avoid it."
  Include one concrete fact, number, or domain-specific observation from the blog draft.
  Do NOT start with: "Great question!", "That depends...", "There are many factors...", "As an AI..."

DEPTH SECTIONS (3–5 paragraphs):
  Each paragraph covers one sub-aspect of the question.
  Extract from the blog draft's H2 sections — rephrase, do not copy verbatim.
  Use specific details: timeframes, costs, measurements, direct comparisons.
  Bold key decision factors or terms for scanability.
  Demonstrate domain expertise: use technical vocabulary appropriate to the vertical.
  No generic advice ("it depends on your needs") — every sentence should be specific.

CREDENTIAL SIGNAL (1 sentence, embedded naturally in depth section — NOT a separate boast):
  "We've [worked with / designed / managed] [N] [type] over [timeframe] in [domain/geography]..."
  OR: cite a specific finding from the blog draft as an expert observation.
  This earns credibility without reading as promotional.

RESOURCE LINK (final paragraph, optional but recommended):
  "If you want the full breakdown on [specific benefit], we documented the entire process here: [URL]"
  Do NOT write: "Visit our website", "Check out our blog", "See our article"
  Specific benefit language only: "full cost comparison", "step-by-step permit checklist", "complete material guide"
  Only one link per answer. Use the canonical CMS URL from task result.live_url.
```

**Tone calibration from brand-voice.md:**
- Write as a domain expert answering a peer's question — not a sales rep, not a marketer
- Use first-person knowledge framing: "In our experience...", "What we consistently see is...", "The data from our projects shows..."
- Never use brand slogans, taglines, or promotional language
- Never end with "Hope that helps!" or similar filler closings

**Length:** 250–550 words. Quora rewards substantive answers but penalizes walls of text. The BLUF block must hook the reader before the fold.

### Step 5 — Formatting
- Use Quora's bold markdown (`**text**`) for key terms and decision factors
- Use ordered lists for sequential steps; unordered lists for parallel factors
- Do NOT use Markdown headers (Quora does not render them — they appear as raw `## text`)
- Max one external link per answer — the canonical company URL goes here
- Do NOT add any company social links, email addresses, or phone numbers

---

## Output
Returns `{ answerId, quoraUrl, linkInserted: true|false, wordCount, questionViews }`.

## Rules
- Load `QUORA_SESSION_TOKEN` from company `.env`
- Minimum answer length: 200 words — shorter answers are downvoted and flagged as thin content
- Insert company link only once, at the end, with specific benefit context
- Global rate limit: max 3 Quora answers/day across ALL companies — orchestrator enforces this before invoking the skill
- Log result immediately to `companies/<slug>/content/distribution-log.md`:
  `| <ISO> | quora | <quoraUrl> | <contentUrl> | <questionUrl> | <first 80 chars of answer> | published |`
