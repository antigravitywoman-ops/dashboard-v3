---
name: skill-execution-protocol
description: "Universal skill selection, fallback, and termination protocol. Read this before using any other skill. Governs how to pick the right skill for each sub-task, what to try when a skill fails (API > browser > crawl > infer > annotate), how many attempts to make, and when to stop and write what you have. Prevents blind retries, skipped fallbacks, and runaway token burn."
metadata:
  {
    "openclaw": {
      "emoji": "🧭",
      "requires": {}
    }
  }
---

# SKILL EXECUTION PROTOCOL

> Read this before using any other skill. It governs how you select, attempt, fall back on, and exit skills.

---

## 1. Task Start -- Skill Inventory (MANDATORY)

Before acting, run this check:

1. List every skill injected into your context for this task
2. For each skill, identify its prerequisite (API key, file, prior output)
3. Check which prerequisites are available right now
4. Build your active skill set: only skills whose prerequisites are met

Do not attempt a skill whose prerequisite is missing. Skip directly to its fallback.

**Stub skill policy**: Some skills are marked `[STUB]` in `AGENTS.md` — they document the
intended capability and interface but return simulated/hardcoded data until the real API
integration is implemented. When a stub skill is encountered:
- Do NOT call it if real credentials are available for the same capability
- Do NOT call it as a fallback — use browser tools (WebFetch, WebSearch) instead
- Always annotate data from stub skills: `[Source: simulated — verify with live API]`
- Stub skills do NOT satisfy the Tier 1 requirement — a stub returning data is not
  the same as a real API call succeeding
- See: `references/task-statuses.md` for the full stub skill policy

---

## 2. Skill Selection -- Minimum Viable Set

Pick the single best skill per sub-task. Only add a second skill if the first cannot produce the needed output alone.

Example (research-analyst, competitor traffic):
- Best: serper-miner if SERPER_API_KEY exists (real SERP data)
- Fallback: WebSearch `site:<competitor-domain>` or WebFetch SimilarWeb public page
- Wrong: running a multi-page crawl just to get a competitor's traffic estimate

---

## 3. Fallback Chain -- Try In This Order

| Tier | Method | When to Use |
|---|---|---|
| 1 -- API Skill | Injected skill file (capability with live API key) | API key exists and skill applies |
| 2 -- Browser Tool | WebSearch or WebFetch | API key missing but data is publicly accessible |
| 3 -- Crawl | crawl-browser | Single-page WebFetch is insufficient |
| 4 -- Infer | Reason from adjacent data in context | No public web source exists |
| 5 -- Annotate | [Data Missing: specific reason] | Private data only (GSC, GA4, historical baselines) OR Tiers 1-4 genuinely exhausted |

Skipping Tiers is a CRITICAL failure. You cannot jump from Tier 1 failure to Tier 5 without attempting Tier 2.

---

## 4. Attempt Budget -- Per Skill, Per Data Point

| Scope | Max Attempts | What To Do After Limit |
|---|---|---|
| Single API call | 2 | Move to Tier 2 fallback |
| Single data point (all tiers) | 3 total | Write best available value + [Source: method] annotation |
| Single sub-task (e.g., one sheet section) | 2 skill approaches | Write with what you have; note gap inline |

After 2 failed attempts on the same skill: do not retry. Switch tiers.

---

## 5. Token Ceiling -- When To Stop and Write

Trigger: You have made 3+ tool calls on the same sub-task with no useful output.

Action:
1. Write what you have to the output file (partial beats nothing)
2. Annotate: [Incomplete: exceeded attempt budget -- best available data shown]
3. Move to the next sub-task
4. Do NOT loop back and retry

---

## 6. Infeasibility Exit -- When To Declare Blocked

Declare blocked (not just partially incomplete) when:

1. Core prerequisite missing and no public fallback exists (e.g., historical rank baseline with no prior data)
2. Multiple skill tiers all fail for the same data
3. Task type is wrong for current company state (e.g., content-refresh with no published content)

On infeasibility:
1. Write produced output to output path (even if stub)
2. Set task status to "blocked"
3. Set result: "BLOCKED: one-line reason -- [list what was attempted]"
4. Do NOT retry. Orchestrator escalation handles blocked tasks.

Do NOT declare blocked because: API key missing (use browser), URL returned 403 (try another), one skill produced nothing (try Tier 2).

**WordPress auth failure is NOT infeasibility.** HTTP 401/403 from WordPress REST API → run `wp-technical --action=auth-resolve`. The skill handles 3 fallback tiers internally.

---

## 7. Capability Fallback Quick Reference

Use **capability descriptions** (left column), not skill names. This lets any agent
find the right approach regardless of which specific skill is available.

| Capability Needed | Prerequisite | Fallback if Missing |
|---|---|---|
| GSC query data (keyword clicks, impressions, CTR, avg position) | GOOGLE_SERVICE_ACCOUNT_JSON + GSC_SITE_URL | [Data Missing: No GSC Key] — no browser substitute for private search data |
| GA4 session data (organic sessions, engagement, top landing pages) | GA4_PROPERTY_ID + GOOGLE_SERVICE_ACCOUNT_JSON | [Data Missing: No GA4 Key] — no browser substitute for private analytics |
| SERP / keyword position data | SERPER_API_KEY (serper-miner) | WebSearch manual SERP check per keyword — annotate [Source: manual browser check] |
| Site crawl (multi-page, bulk metadata extraction) | FIRECRAWL_API_KEY | Use crawl-browser (headless, no API key needed) |
| Live URL crawl (verification, schema check) | None (public) | Use crawl-browser |
| PageSpeed / Core Web Vitals (LCP, CLS, INP) | None (public API) | WebFetch pagespeed.web.dev/report?url=<URL> directly |
| Competitive traffic / domain authority | AHREFS_API_KEY | WebFetch ahrefs.com/website-authority-checker/?target=<domain> |
| Snapshot writing (WoW delta from prior snapshot) | Prior snapshot file | Build from browser data + [Source: initial browser baseline] |
| Sheet validation (quality gate) | Sheets at target path | Cannot substitute — only run when sheets are written |
| Excel workbook generation | Validated sheets (pass gate) | Cannot run without passing sheets — declare blocked |
| WordPress publish (REST API) | WP_APP_PASSWORD valid (App Password format) | Run `wp-technical --action=auth-resolve` first; then retry |
| WordPress publish (Python fallback tiers) | Python3 + WP site URL + any WP credential | Built-in tier fallback: App Password → Cookie+Nonce → XML-RPC |

---

## 8. Loop Termination Checklist

Before writing "completed" to the task, confirm:

- [ ] All required outputs written to designated file paths
- [ ] Every unfilled cell has an annotation ([Data Missing], [Source: x], [Incomplete])
- [ ] No sub-task abandoned without attempting Tier 2 fallback
- [ ] No skill retried more than 2 times
- [ ] Task status updated in `companies/<slug>/memory/tasks/queue.json` (per-company queue)
- [ ] If partial output: result field notes what was completed vs incomplete

If any item cannot be satisfied -- set status to "blocked" and explain in result.

---

## 9. Filesystem Discipline — MANDATORY

The company folder schema is **fixed and company-agnostic**. Every company has the same folders regardless of industry, platform, or objective. Agents MUST NOT deviate from this schema.

### Canonical Company Folder Schema

```
companies/<slug>/
  .env                          # credentials
  about/                        # READ-ONLY. Onboarding only. Agents never write here.
  workspace/                    # FREE-FORM. Only place agents may create sub-folders.
  content/pending-publish/      # Flat .md drafts only. No sub-folders.
  memory/                       # context-digest.md + episodic.md + sheets/ (flat)
  plans/active/                 # active-plan.json (monthly strategic) + weekly .meta.json (synced by heartbeat — source of truth for dashboard task counts)
  reports/<YYYY-MM>/            # system-managed (sheets/, validation/, output/)
  reviews/                      # flat .md files only
  technical/audits/             # flat .json files only
  technical/issues-log.md
  latest.txt
```

### Write Permission Rules

| Folder | Allowed | Forbidden |
|--------|---------|-----------|
| about/ | Read only | Any write or new file |
| workspace/ | Any file, any sub-folder | Nothing forbidden |
| content/pending-publish/ | Flat .md files | Sub-folders; mirroring CMS paths |
| memory/ | context-digest.md, episodic.md | New files, new sub-folders |
| memory/sheets/ | Flat .md files | Sub-folders |
| plans/active/ | active-plan.json, .meta.json (weekly) | Arbitrary other files; .meta.json must not be deleted (heartbeat source of truth) |
| reviews/ | Flat .md files | Sub-folders |
| technical/audits/ | Flat .json files | Sub-folders |

### Forbidden Patterns — CRITICAL

- **No new top-level folders** under companies/<slug>/ — EVER
- **No folders that mirror website URL structure** (e.g., content/blog/, content/books/, content/pages/)
- **No scratch/temp folders** (tmp/, logs/, cache/, data-intelligence/) anywhere in the company tree
- **No files in about/** — it is READ-ONLY, managed by onboarding workflow only
- **No sub-folders in content/, memory/, reviews/, or technical/** beyond the already-defined ones

### Naming convention for content/pending-publish/

Encode CMS section as a flat filename prefix, NOT as a sub-folder:

  CORRECT:   content/pending-publish/blog-upsc-for-working-professionals.md
  CORRECT:   content/pending-publish/books-the-answers-within.md
  WRONG:     content/pending-publish/blog/upsc-for-working-professionals.md
  WRONG:     content/pending-publish/books/the-answers-within.md

### workspace/ — for company-specific creative artefacts

When a task requires storing research notes, content briefs, product summaries, competitor deep-dives, or any company-specific working documents that do not fit the structured folders, use workspace/. Sub-folders permitted. Clean up scratch artefacts after task completes.

Examples:
  workspace/research/     # keyword and topic research
  workspace/briefs/       # content briefs before drafting
  workspace/products/     # product or service summaries
  workspace/competitors/  # competitor deep-dives

