---
name: wf-company-onboarding
description: "One-time onboarding workflow for a new client company. Sets up the full directory structure, validates credentials, runs an initial snapshot, and produces the first strategy report. Triggered manually via init-company script or orchestrator task."
trigger: manual
---

# Workflow: Company Onboarding

Bootstraps a new company environment from scratch. Must complete successfully before any weekly workflow can run for this company.

---

## Step 1 — Validate Company Directory Structure

**Agent**: `seo-orchestrator`
**Script**: `scripts/init-company.js <company-slug>`

Verify the following directory and file structure exists. Create any missing pieces:

```
companies/<slug>/
  .env                          # credentials — never commit
  .env.example                  # template — committed
  about/                        # READ-ONLY after init. Agents never write here.
    profile.md                  # business name, website, CMS, NAP, industry
    goals.md                    # business objectives and targets
    keywords.md                 # seed keyword list (minimum 10)
    competitors.md              # known competitors (minimum 3)
    audience.md                 # target demographic and personas
    brand-voice.md              # tone, style, writing rules
    scope.md                    # which channels and services are in scope
    missing-dependencies.md     # credential and integration gaps
  workspace/                    # FREE-FORM. Agents may create sub-folders freely.
  content/
    pending-publish/            # Flat .md drafts only. No sub-folders.
  memory/
    chat/
      sessions/                 # Individual chat session logs
      context.json              # Current active context state
      history.md                # Summary of recent sessions
    tasks/
      queue.json                # Current pending tasks for this company
      history/                  # Task history by month
        <YYYY-MM>/
          all.json
          completed.json
    context-digest.md
    episodic.md
    episodic-log.txt             # Timestamped action log
    sheets/                     # flat .md files only
  plans/
    active/                     # active-plan.json
  reports/
    <YYYY-MM>/                  # system-managed; created at report time
  reviews/                      # flat .md review files only
  technical/
    audits/                     # flat .json audit files only
    issues-log.md
  latest.txt
```

> **Filesystem guardrail**: This schema is fixed and company-agnostic. Agents MUST NOT create new top-level folders or sub-folders outside of workspace/. See skills/skill-execution-protocol Section 9.

If any of `profile.md`, `goals.md`, `keywords.md`, or `competitors.md` is completely missing: **STOP** and log which files are missing. The company cannot be onboarded without basic profile data. `brand-voice.md` and `audience.md` are exempt — they will be auto-generated or can be added post-onboarding.

**NAP Validation (Do Not Stop)**: 
If `about/profile.md` contains placeholder tags like `[REQUIRED: Exact Legal Business Name]`, do NOT halt the onboarding. 
Instead, prominently highlight this missing data in the `episodic.md` log and flag it as a `WARNING` for the Citations checklist. Proceed to Step 2.

---

## Step 1b — Generate Scope File

**Agent**: `seo-orchestrator`
**Target**: `companies/<slug>/about/scope.md`

If `scope.md` does not already exist, create it from the canonical template below.
If it exists, skip (do not overwrite — the operator may have customised it).

The scope file is the **operator-controlled capability boundary**. It defines what platforms,
content types, and tasks are authorised for this company. Agents read it before creating tasks.

```markdown
---
name: <company-name> — Operator Capability Scope
last_updated: <ISO date>
managed_by: operator
---

# Capability Scope — <Company Name>

> This file is the authoritative definition of what this system is authorised to do.
> The seo-orchestrator reads this before every delta-evaluation.
> Edit operator flags below to enable or disable channels. Set managed_by to reflect who owns this.

## Content & Publishing

### In Scope
- WordPress blog posts (new drafts and content refreshes)
- WordPress page edits (meta, body updates)
- Meta title and meta description optimisation
- Schema markup injection (JSON-LD)
- Featured image: reuse from existing WordPress media library only

### Out of Scope
- AI image generation — if no image exists in media library, publish without featured image
- Video production, podcast/audio content, infographics

## Social Distribution

### In Scope
- Reddit — value-first posts and comments in pre-approved subreddits (see Sheet 09)
- Quora — expert answers to pre-identified questions (see Sheet 09)
- LinkedIn — professional posts on the company page
- Medium — canonical syndication of published blog posts (800+ words only)

### Out of Scope
- YouTube — explicitly excluded
- Instagram, Facebook, Twitter/X, TikTok, Pinterest — not configured

## Operator Flags

\`\`\`yaml
linkedin_active: true
reddit_active: true
quora_active: true
medium_syndication_active: true
gbp_posts_active: false
youtube_active: false
image_generation_active: false
ahrefs_active: false
\`\`\`
```

Log creation of scope.md to `companies/<slug>/memory/episodic.md`.

---

## Step 1c — Generate Missing Dependencies File

**Agent**: `seo-orchestrator`
**Target**: `companies/<slug>/about/missing-dependencies.md`

If `missing-dependencies.md` does not exist, create it immediately after the credential check in Step 3.
This file tracks every dependency the system needs — credentials, about files, plan files — with a status
column the operator and agents maintain together.

Generate the file with all known credential keys from Step 3 results, setting status to:
- `present` — key exists and is non-empty in `.env`
- `missing` — key absent or has a placeholder value
- `unknown` — not checked yet (use this for items not validated in this onboarding run)

**Format** (exact structure required for heartbeat.js parsing):

```markdown
---
company: <slug>
last_checked: <ISO timestamp>
generated_by: seo-orchestrator
---

# Missing Dependencies — <Company Name>

> Living file. Updated by agents when items are resolved or newly discovered.
> Heartbeat reads this before scheduling tasks.
> Update Status from `missing` to `present` once configured.

## Environment & Credentials

| Key | Category | Priority | Status | Blocks |
|-----|----------|----------|--------|--------|
| `.env file` | environment | critical | <present/missing> | everything |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | credentials | high | <status> | GA4, GSC data |
| `GA4_PROPERTY_ID` | credentials | high | <status> | Traffic analytics |
| `GSC_SITE_URL` | credentials | high | <status> | Search impressions |
| `SERPER_API_KEY` | credentials | high | <status> | SERP data |
| `FIRECRAWL_API_KEY` | credentials | high | <status> | technical-audit |
| `WP_SITE_URL` | cms | medium | <status> | content-publish |
| `WP_USERNAME` | cms | medium | <status> | content-publish |
| `WP_APP_PASSWORD` | cms | medium | <status> | content-publish |
| `REDDIT_CLIENT_ID` | social | medium | <status> | reddit distribution |
| `REDDIT_CLIENT_SECRET` | social | medium | <status> | reddit distribution |
| `REDDIT_REFRESH_TOKEN` | social | medium | <status> | reddit distribution |
| `LINKEDIN_ACCESS_TOKEN` | social | medium | <status> | linkedin distribution |
| `MEDIUM_INTEGRATION_TOKEN` | social | low | <status> | medium syndication |
| `QUORA_SESSION_TOKEN` | social | low | <status> | quora distribution |

## About Files

| File | Priority | Status | Notes |
|------|----------|--------|-------|
| `about/profile.md` | critical | <present/missing> | — |
| `about/brand-voice.md` | high | <present/missing> | Required for content-draft |
| `about/scope.md` | high | present | — |
| `about/goals.md` | high | <present/missing> | — |
| `about/keywords.md` | high | <present/missing> | — |
| `about/competitors.md` | high | <present/missing> | — |
| `about/audience.md` | normal | <present/missing> | Buyer personas |

## Plan Files

| File | Priority | Status | Notes |
|------|----------|--------|-------|
| `plans/active/<YYYY-WNN>-weekly-plan.md` | high | missing | Generated by wf-build-weekly-plan |
| `memory/sheets/09-reddit-quora.md` | normal | missing | Required for wf-offpage-distribute (Reddit/Quora channels) |
```

**Rules**:
- After any `auth-manager --check-all` run, update this file with fresh results
- Agents that discover a missing dep during execution must update their row to `missing` with a note
- When the operator provides credentials, update rows to `present` and append a timestamp note
- The heartbeat hard-blocks `content-publish` and `technical-audit` tasks when their HIGH deps show `missing`
- MEDIUM and LOW missing deps cause channel/feature skipping with a log entry — they do not block the task


---

## Step 2 — Register Company

**Agent**: `seo-orchestrator`
**Target**: `runtime/companies.json`

Add the new company slug to the registry:

```json
{
  "active": ["existing-slug-1", "existing-slug-2", "<new-slug>"],
  "paused": []
}
```

If `runtime/companies.json` does not exist, create it with the new company as the first active entry.

---

## Step 3 — Credential Validation

**Agent**: `seo-orchestrator`
**Skill**: `auth-manager` with check-all

Check all credentials in `companies/<slug>/.env` against this required list:

| Credential | Required For | Priority |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | GA4, GSC data collection | HIGH — core analytics |
| `GA4_PROPERTY_ID` | Organic traffic and engagement | HIGH — core analytics |
| `GSC_SITE_URL` | Keyword rankings and click data | HIGH — core analytics |
| `SERPER_API_KEY` | Competitor SERP intelligence | HIGH — competitor analysis |
| `FIRECRAWL_API_KEY` | Site crawling and content audit | HIGH — technical audit |
| `WP_SITE_URL` + `WP_APP_PASSWORD` | WordPress CMS publishing | MEDIUM — if WordPress |
| `CMS_API_KEY` + `CMS_ENDPOINT` | Non-WordPress CMS publishing | MEDIUM — if non-WP CMS |
| `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` | Reddit distribution | MEDIUM — off-page |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn distribution | MEDIUM — off-page |
| `MEDIUM_INTEGRATION_TOKEN` | Medium syndication | LOW — supplementary |
| `QUORA_SESSION_TOKEN` | Quora distribution | LOW — supplementary |
| `VPS_HOST` + `VPS_USER` + `VPS_SSH_KEY_PATH` | Remote server operations | LOW — if VPS hosting |

**Output**: Log credential status to `companies/<slug>/memory/episodic.md` with:
- Which credentials are present and valid
- Which are missing
- Setup instructions for each missing credential (link to `.env.example`)

**Do NOT block onboarding for missing MEDIUM or LOW priority credentials.** Missing HIGH priority credentials are noted but onboarding continues — the first strategy report will have annotated gaps.

---

## Step 3.5 — Generate Brand Voice

**Agent**: `seo-orchestrator`
**Output**: `companies/<slug>/about/brand-voice.md`

Auto-generate the brand voice document so content-draft tasks can start immediately without waiting for manual operator input.

**If `FIRECRAWL_API_KEY` is available**: Use `crawl-firecrawl` [STUB] to fetch the homepage, the About page, and the primary product/service page. Supplement with `crawl-browser` for verification.

> Note: `crawl-firecrawl` is a [STUB] skill — it may return simulated data. Always use `crawl-browser` as the primary verification tool. See `references/task-statuses.md`.
- Tone (formal vs. conversational, technical depth, active vs. passive voice)
- Language patterns (sentence length, use of industry jargon, typical CTAs)
- Content style (how products are described, trust signals used, certifications mentioned)
- Words and phrases used repeatedly (brand vocabulary)

**If `FIRECRAWL_API_KEY` is missing**: Synthesize from `about/profile.md`, `about/goals.md`, and `about/keywords.md`:
- Infer tone from industry, company age, and buyer type (B2B industrial = authoritative and technical)
- Infer vocabulary from product names and export market list
- Use ISO certification and years of experience as authority markers

**Write `about/brand-voice.md`** with these sections:
1. **Voice & Tone** — 3–5 adjectives describing the voice; 1 paragraph explaining it
2. **Audience** — primary buyer persona (role, concerns, technical fluency)
3. **Language Guidelines** — sentence structure, reading level, active vs. passive preference
4. **Words & Phrases to Use** — 10+ brand-aligned terms
5. **Words & Phrases to Avoid** — 5+ off-brand patterns
6. **Writing Examples** — 2–3 sample sentences showing the voice in action

Append to `companies/<slug>/memory/episodic.md`:
```
brand-voice.md auto-generated (method: crawl-based | inference-based). Operator should review and edit before first content-draft task.
```

## Step 4 — Initial Site Crawl (HARD GATE — must complete before Step 5+)

**Agent**: `seo-orchestrator`
**Skill**: `crawl-browser` (primary — no API key, handles SPAs automatically) → `crawl-firecrawl` [STUB] (supplementary only if FIRECRAWL_API_KEY is configured AND site is static)

> `crawl-firecrawl` is a [STUB] skill — see `references/task-statuses.md`. Always use `crawl-browser` as the primary crawl tool.

This step is a hard gate. No downstream content or on-page tasks may be scheduled until a real crawl result exists. A site with broken server routing is NOT a crawl failure — the crawl-browser skill handles SPAs automatically.

**Execution order**:
1. Always run `crawl-browser` first (primary, no API key needed):
   ```bash
   cd ~/openclaw-seo/skills/crawl-browser && \
   PLAYWRIGHT_BROWSERS_PATH=/home/dev/.cache/ms-playwright \
   node scripts/crawl-browser.js <slug> --url=<site_url> --limit=150
   ```
2. If `FIRECRAWL_API_KEY` is present AND the site is static (no JS rendering): run `crawl-firecrawl` [STUB] as supplementary:
   ```bash
   crawl-firecrawl <slug> --url=<site_url> --limit=200
   ```
3. If `crawl-browser` produces no output file: proceed to Step 4-FAIL
   ```bash
   cd ~/openclaw-seo/skills/crawl-browser && \
   PLAYWRIGHT_BROWSERS_PATH=/home/dev/.cache/ms-playwright \
   node scripts/crawl-browser.js <slug> --url=<site_url> --limit=150
   ```
3. If `crawl-browser` produces no output file: proceed to Step 4-FAIL

**Understanding crawl output — the `url_type` field**:

The `crawl-browser` skill automatically detects SPAs where the server lacks a catch-all rewrite rule.
Every page in the output has a `url_type` classifying it:

| url_type | HTTP Status | Meaning |
|---|---|---|
| `HTTP_200` | 200 | Normal page. Full SEO work proceeds. |
| `JS_ROUTE_ONLY` | 404 | SPA route: server 404 but real content rendered via JS. Content is valid; publish tasks deferred until routing is fixed. |
| `DEAD_ROUTE` | 404 | Server 404 AND no JS content found. Likely a removed or non-existent route. |
| `ERROR` | — | Network failure, PDF download, timeout. Log and skip. |

**On crawl success — standard site (all HTTP_200)**:
- Save raw result to `companies/<slug>/technical/audits/<YYYY-MM-DD>-onboarding-crawl.json`
- Write summary to `companies/<slug>/technical/issues-log.md`: total URLs, counts by url_type, top critical issues
- Log to `episodic.md`: `Onboarding crawl complete — <N> pages (HTTP_200) — saved to technical/audits/`
- **Run `audit-enricher` immediately after crawl (see Step 4.5)**
- Proceed to Step 5

**On crawl success — SPA detected (`crawl_meta.server_routing_broken: true`)**:

This is NOT a failure. The crawl extracted real content via SPA simulation. Proceed with the data.

1. Read `crawl_meta.summary` and `critical_issues[]` from the JSON output — these are pre-computed
2. **Queue a CRITICAL task before any other** (do NOT wait until weekly plan build):
   ```json
   {
     "type": "website-edit",
     "priority": "critical",
     "assigned_to": "HUMAN",
     "title": "Fix server-side catch-all routing — sub-pages return HTTP 404 to Google",
     "context": {
       "problem": "React/JS SPA detected. Server has no catch-all rewrite. All pages except homepage return HTTP 404 to search crawlers.",
       "affected_page_count": "<js_route_only count from summary>",
       "fix": "<copy fix field from critical_issues[0] in crawl JSON>",
       "seo_impact": "Only the homepage is indexable. All product/service/about pages are invisible to Google."
     }
   }
   ```
3. Proceed to Step 5 normally — the `JS_ROUTE_ONLY` pages contain valid extracted content (titles, H1s, word counts) that the research-analyst will use for Sheet 00-A
4. The research-analyst handling `JS_ROUTE_ONLY` pages must note their `url_type` in Sheet 00-A and mark all CMS/publish tasks as deferred with `deferred_reason: routing-fix-required`
5. Log to `episodic.md`:
   ```
   Onboarding crawl complete — SPA DETECTED — server_routing_broken: true
   Total: <N> pages | HTTP_200: <n> | JS_ROUTE_ONLY: <n> | DEAD_ROUTE: <n>
   CRITICAL routing-fix task queued (assigned_to: HUMAN)
   Proceeding to Step 5 — JS_ROUTE_ONLY pages included in inventory with real content data
   ```
6. **Run `audit-enricher` immediately after crawl (see Step 4.5)**

**On crawl failure (Step 4-FAIL)**:
- Write to `companies/<slug>/technical/issues-log.md`:
  ```
  CRAWL FAILED — <ISO timestamp>
  Reason: <specific error>
  Site inventory: UNKNOWN
  Action required: Operator must verify site is publicly accessible and re-trigger onboarding Step 4.
  ```
- Write to `companies/<slug>/memory/episodic.md`: `Onboarding crawl FAILED — all on-page content tasks blocked until crawl succeeds`
- Set `crawl_status: FAILED` in `companies/<slug>/about/missing-dependencies.md`
- **Do NOT proceed to Step 5 or Step 6**. Jump to Step 8 with context: `crawl_available: false — research-analyst must not populate Sheet 00-A from world knowledge`

---

## Step 4.5 — Enrich Audit JSON

**Agent**: `seo-orchestrator`
**Skill**: `audit-enricher`

After the raw crawl JSON is saved, run `audit-enricher` to compute the dashboard-required fields:

```bash
cd ~/openclaw-seo/skills/audit-enricher && \
node scripts/audit-enricher.js <slug>
```

This adds `summary`, `health_score`, `meta_summary`, and `highlights` to the audit JSON. These fields are required by the SEO dashboard's Technical tab. Without this step, the dashboard will show "0 issues" and "no health score" even when issues exist.

The `audit-enricher` skill is idempotent — re-running it updates the counts. Always run it after any crawl result (onboarding or weekly audit).

---

## Step 5 — Schema Baseline Audit

**Agent**: `seo-orchestrator`
**Skill**: `schema-auditor`

Audit the homepage, 3 key product/service pages, and 2 blog posts (if available).
Write findings to `companies/<slug>/technical/issues-log.md` under a "Schema" section.

---

## Step 6 — Initial Snapshot

**Agent**: `seo-orchestrator`
**Skill**: `snapshot-generator`

Collect available performance data. If APIs are missing, snapshot will contain `[Data Missing]` annotations — this is acceptable for the initial baseline.

Write to `companies/<slug>/memory/snapshots/snapshot-<timestamp>.json`.
Also initialize `companies/<slug>/technical/current-snapshot.md` using the exact format from `wf-daily-intelligence.md` Step "Snapshot Markdown Format" (Section: ## Search Console (GSC), ## Analytics (GA4), ## Keyword Rankings, ## Action Items). Use `[Data Missing: <credential>]` for any unavailable metrics rather than omitting the rows.

---

## Step 7 — Seed SERP Baseline

**Agent**: `seo-orchestrator`
**Skill**: `serper-miner`

Run serper-miner for the top 5 seed keywords from `companies/<slug>/about/keywords.md`.
This establishes the keyword position baseline for all future weekly cycles.

If `SERPER_API_KEY` is missing: use WebSearch to manually check positions for each keyword and annotate `[Source: manual SERP check — no SERPER API key]`. See `agents/data-intelligence.md` for the browser-first keyword tracking approach.

---

## Step 8 — Trigger First Strategy Report

**Agent**: `seo-orchestrator`

Add a task to the queue:
```json
{
  "type": "generate",
  "target": "weekly-strategy",
  "company": "<slug>",
  "assigned_to": "research-analyst",
  "context": {
    "is_initial_report": true,
    "note": "First strategy report. API data may be partially unavailable — annotate with [Data Missing] as appropriate."
  }
}
```

The first report will be lower data quality than subsequent ones (missing live API data), but provides the initial strategic framework the team can act on immediately.

---

## Step 8.5 — Initialize Context Digest

**Agent**: `seo-orchestrator`
**Target**: `companies/<slug>/memory/context-digest.md`
**Trigger**: Runs after Step 8 (First Strategy Report) completes and sheets have been written to `memory/sheets/`

Generate the initial `memory/context-digest.md` from the freshly written sheets. This is the lightweight summary file that future weekly plan builds and content agents load as context instead of re-reading all 14 full sheets.

The digest must be ≤ 150 lines and contain:
- Phase and schedule summary (from Sheet 04)
- Technical health snapshot: crawl errors, LCP, schema coverage, broken links, crawl source (from Sheet 00-E + Sheet 13)
- Checklist completion rates: technical/on-page/off-page [HIGH] items checked vs. total
- Top 5 open Gap IDs with priority (from Sheet 02)
- Top 10 keyword targets: keyword, SV, KD, standing, priority, target week (from Sheet 05)
- KPI baselines: organic traffic, crawl errors, LCP, schema coverage, referring domains (from Sheet 13)
- Credential status summary (from `about/missing-dependencies.md`)

After generating, append to `episodic.md`:
`context-digest.md initialized from onboarding report. Period: <YYYY-MM>. Lines: <N>.`

The digest is regenerated automatically at the end of every future report cycle (after sheets pass validation). Agents must read it as the first context layer before deciding whether to load full sheets.

---

## Onboarding Completion

**Agent**: `seo-orchestrator`
**Target**: `companies/<slug>/memory/episodic.md`

Append:
```markdown
## <ISO timestamp> — ONBOARDING COMPLETE
Company <slug> onboarded successfully.
- Credentials: <N valid> / <total required>
- Missing HIGH priority credentials: <list or "none">
- Initial crawl: <N pages>, <N critical issues>
- Schema baseline: <N schemas found>, <N errors>
- SERP baseline: <"established" or "skipped — no Serper key">
- First strategy report: queued
```

### Generate Metadata Files

After onboarding completes, generate all metadata files:

1. **Create folder structure**:
```bash
python skills/meta-generator/scripts/meta-generator.py <slug> --folders
```

2. **Generate metadata for all existing files**:
```bash
python skills/meta-generator/scripts/meta-generator.py <slug> --enrich --caller meta-audit
```

This ensures:
- All content files in `content/` have `.meta.json` sidecars with `summary` and `highlights` fields
- All about files have metadata with correct category, `summary`, and `highlights`
- All reviews have metadata
- All reports will have metadata when generated

> Use `--caller meta-audit` during onboarding because no agent has produced the content yet — the files are scaffold-only.

---

## Step 10 — Markdown Formatting Standard

**Agent**: `seo-orchestrator`
**Scope**: All `.md` files created during onboarding and any future file generation

All `.md` files in `about/`, `content/`, and `reports/` must follow this formatting standard. This ensures clean rendering in both the raw file AND the dashboard's ReactMarkdown viewer.

### Heading Hierarchy

```markdown
# Page Title (H1) — one per file, matches filename
## Section Name (H2) — major sections
### Sub-section (H3) — specific topics within sections
#### Detail label (H4) — rarely used, for dense data
```

**Rules:**
- Use exactly one H1 per file (the page title)
- H2 headings are the primary organizational unit — use them liberally
- H3 headings subdivide H2 sections — use for clarity
- Never skip heading levels (e.g., don't go from H2 to H4)
- Use sentence case for headings (capitalize first word + proper nouns)

### Structured Data — Use Tables

For any data that has consistent fields, use markdown tables:

```markdown
## Product Categories

| Product | Capacity | Weight | Price Range |
|---------|----------|--------|-------------|
| Hydraulic Press 800T | 800 tons | 12,000 kg | ₹15-20L |
| Baling Machine | 50-200 tons | 3,000-8,000 kg | ₹3-8L |

## Key Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Crawl errors | 12 | 0 | FAIL |
| Schema coverage | 45% | 80% | PARTIAL |
```

### Lists

- Use `-` for unordered lists (not `*` or `+`)
- Use `1.`, `2.` for numbered sequences
- Indent sub-items with 2 spaces
- Maximum nesting depth: 2 levels

```markdown
## Primary Goals
- Increase organic traffic by 40% in 6 months
  - Target: 2,000 → 2,800 monthly visits
  - Channels: blog posts, service page updates
- Establish GBP as primary discovery channel
  - Add 10 photos per week
  - Seed Q&A with 5 expert answers weekly
```

### Emphasis & Inline Formatting

- Use `**bold**` for critical terms, values, and action items
- Use `*italics*` for emphasis and ship names
- Use backticks `` `code` `` for file names, URLs, and technical values
- Use `> blockquote` for important callouts or notes

### About File Templates

Use these templates when generating `about/` files:

#### profile.md
```markdown
# Company Name

**Founded**: <year>
**Headquarters**: <city, country>
**Type**: <description>
**Size**: <employee range>

## Executive Summary
<3-5 sentence overview of what the company does, who it serves, and its market position.>

## Products / Services
<bullet list of 4-8 key offerings>

## Target Market
<geography, industry, company size, buyer type>

## Value Proposition
<what makes them different from competitors — 2-3 sentences>
```

#### audience.md
```markdown
# Target Audience — <Company Name>

## Persona 1: <Name> (<Primary|Secondary>)
**Age/Role**: <brief description>
**Situation**: <current challenge or context>
**Goals**: <1-3 specific goals>
**Pain Points**: <top 2-3 frustrations>
**Why Us**: <what makes your solution right for them>
**Discovery Path**: <how they find the site>

---
## Persona 2: <Name> (<Primary|Secondary>)
<same structure>
```

#### keywords.md
```markdown
# Target Keywords — <Company Name>

## Primary Cluster
- <keyword>
- <keyword>

## Secondary Cluster
- <keyword>

## Long-tail / Informational
- <keyword>
```

#### competitors.md
```markdown
# Competitor Analysis — <Company Name>

## Direct Competitor: <Name>
**Website**: <url>
**Strengths**: <2-3 points>
**Weaknesses**: <2-3 points>
**Market Position**: <brief>

## Indirect Competitor: <Name>
<same structure>
```

#### goals.md
```markdown
# Business Goals — <Company Name>

## Primary Objective
<1-2 sentence statement of the main business goal for the next 6-12 months>

## Key Performance Indicators
| KPI | Current | Target | Timeline |
|-----|---------|--------|----------|
| <metric> | <value> | <value> | <date> |

## Strategic Priorities
1. <priority 1>
2. <priority 2>
3. <priority 3>
```

#### brand-voice.md
```markdown
# Brand Voice — <Company Name>

## Voice & Tone
<3-5 adjectives describing the voice + 1 paragraph explaining it>

## Audience
<primary buyer persona this voice speaks to>

## Language Guidelines
- Sentence structure: <description>
- Reading level: <target grade level>
- Active vs passive: <preference>

## Words to Use
- <term 1>
- <term 2>

## Words to Avoid
- <term 1>
- <term 2>

## Writing Example
> <1-2 sample sentences showing the voice in action>
```

#### keywords.md
```markdown
# Target Keywords — <Company Name>

## Primary Keywords (<main product/service>)
- <keyword 1> (<volume range>, KD <N>)
- <keyword 2> (<volume range>, KD <N>)

## Supporting Keywords
- <keyword>

## Informational / Content Topics
- <topic 1>
- <topic 2>
```

