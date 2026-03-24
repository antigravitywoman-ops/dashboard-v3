---
name: wf-technical-audit
description: "Weekly technical SEO audit workflow. Crawls the site, validates schema, checks Core Web Vitals for top pages, and produces a structured markdown audit report. Runs every Monday at 09:00."
trigger: cron(0 9 * * 1)
---

# Workflow: Technical Audit

Identifies indexation blockers, schema gaps, Core Web Vitals regressions, and broken link patterns. Produces a dated audit report per company.

---

## Step 0 — Robots.txt & Crawl Governance

**Agent**: `seo-orchestrator` (self-executed as part of the `technical-audit` task)
**Skill**: `sitemap-parser` or `robots-auditor`

Fetch and parse the target site's `robots.txt` file.

**Output**: `companies/<slug>/memory/robots-audit-<timestamp>.json`

**Flag immediately**:
- The entire site is blocked (`Disallow: /` for `*` or `Googlebot`)
- Critical paths (like `/blog/` or `/services/`) are explicitly disallowed.
- Missing `Sitemap:` directive in the robots.txt file.

If the entire site is blocked, **HALT** the technical audit workflow, log a SEVERE error, and create an urgent `robots-fix` task for the SEO Lead. Do not proceed to Step 1.

---

## Step 1 — Full Site Crawl

**Agent**: `seo-orchestrator` (self-executed as part of the `technical-audit` task)
**Skill**: `crawl-browser` (primary — no API key needed)

**Decision logic**:
- Read `about/profile.md` to check `cms_type` and `is_spa` flags
- Always prefer `crawl-browser` — it works for all site types and requires no API key
- If `FIRECRAWL_API_KEY` is configured AND site is static (no JS rendering): `crawl-firecrawl` [STUB] may be used as supplementary. Do not use crawl-firecrawl as the primary crawl tool. See `references/task-statuses.md`.

**Output**: `companies/<slug>/technical/audits/<YYYY-MM-DD>-weekly-crawl.json`

> Note: `crawl-browser` writes directly to `technical/audits/` with filename `<date>-weekly-crawl.json`.

**Collect from each page**:
- URL, HTTP status code, title, H1, meta description, canonical tag, word count, internal links count

**Flag immediately**:
- Any 4xx/5xx status codes on indexed URLs
- Pages with missing H1 or duplicate H1s
- Pages missing meta description
- Canonical pointing to a different URL (potential redirect chain)

---

## Step 1.5 — Enrich Audit JSON

**Agent**: `seo-orchestrator`
**Skill**: `audit-enricher`

After the crawl completes, run `audit-enricher` to add `summary`, `health_score`, `meta_summary`, and `highlights` to the crawl output:

```bash
cd ~/openclaw-seo/skills/audit-enricher && \
node scripts/audit-enricher.js <slug>
```

The `audit-enricher` script finds the most recent audit JSON in `technical/audits/` automatically, enriches it in-place, and writes the `*.meta.json` sidecar. The enriched fields are required by the SEO dashboard. Do not skip this step.

---

## Step 2 — Schema Validation

**Agent**: `seo-orchestrator` (self-executed)
**Skill**: `schema-auditor`

Run `schema-auditor` on the top 10 URLs by estimated organic traffic (from the current snapshot) plus the homepage.

**Expected schema types to check** (defined in Sheet 11 of the strategy report):
- Organization (homepage)
- BreadcrumbList (site-wide)
- Service or Product (service/product pages)
- Article or BlogPosting (blog posts)
- FAQPage (FAQ sections)
- LocalBusiness (if physical location)

**Flag**:
- Any schema missing `@context` or `@type`
- Required properties missing for each type (per schema.org spec)
- Schemas that don't match eligible Google Rich Result types

**Output**: `companies/<slug>/memory/schema-audit-<timestamp>.json`

---

## Step 3 — Core Web Vitals Check

**Skill**: `pagespeed-fetch`

Iterate the top 10 traffic URLs (identified from the current snapshot) and the homepage through `pagespeed-fetch`.

**Collect and log**:
- LCP (Largest Contentful Paint) — threshold: <2.5s (GOOD), 2.5-4s (NEEDS IMPROVEMENT), >4s (POOR)
- CLS (Cumulative Layout Shift) — threshold: <0.1 (GOOD), 0.1-0.25 (NEEDS IMPROVEMENT), >0.25 (POOR)
- INP (Interaction to Next Paint) — threshold: <200ms (GOOD), 200-500ms (NEEDS IMPROVEMENT), >500ms (POOR)

**Flag immediately**:
- Any URL returning POOR in any metric.

---

## Step 4 — Index Status Check

**Skill**: `index-checker`

Check indexation status for all newly published URLs from the past 14 days, plus the top 10 historical traffic URLs.

**Flag immediately**:
- Any URL returning `status: not-indexed`
- Canonical mismatches (`google_canonical` differs from `user_canonical`)

---

## Step 5 — Internal Link Audit

**Agent**: `seo-orchestrator` (self-executed)
**Source**: Crawl data from Step 1

From the crawl JSON, identify:
- Internal links returning 404 — auto-patch candidate (redirect or replace)
- Redirect chains longer than 2 hops — flag for simplification
- Orphan pages (pages with 0 internal links pointing to them)
- Pages with fewer than 3 internal links — underlinked content

**Secondary verification**: Run `broken-link-scanner` on the homepage and top 5 traffic hubs to actively verify that extracted <a> tags return a 200 HTTP status code. Flag any 4xx or 5xx links.

---

## Step 6 — Sitemap Validation

**Skill**: `sitemap-parser`

Parse the XML sitemap declared in Step 0 (robots.txt) or at `<site-url>/sitemap.xml`.

**Compare against crawled URLs**:
- Flag URLs found in the crawl that are *missing* from the sitemap.
- Flag URLs declared in the sitemap that return a 404/non-200.

---

## Step 7 — Produce Audit Report

**Agent**: `seo-orchestrator`
**Output**: `companies/<slug>/technical/audits/<YYYY-MM-DD>.md`

Report structure:
```markdown
# Technical Audit — <Company Name>
**Date**: <YYYY-MM-DD>
**Audited by**: wf-technical-audit

## Summary
| Check | Status | Issues Found |
|---|---|---|
| Crawl | COMPLETE | <N> issues |
| Schema | COMPLETE | <N> errors |
| Core Web Vitals | COMPLETE | <N> poor URLs |
| Index Status | COMPLETE | <N> not-indexed |
| Internal Links | COMPLETE | <N> broken links |
| Sitemap | COMPLETE | <N> orphan URLs |

## Critical Issues (Fix This Week)
...

## Warnings (Fix Next Sprint)
...

## Recommendations
...
```

---

## Step 8 — Task Generation

**Agent**: `seo-orchestrator`

After producing the audit report, create tasks in `companies/<slug>/memory/tasks/queue.json` (per-company queue — source of truth) for:
- Each CRITICAL technical issue → `{ type: "website-edit", priority: "critical", assigned_to: "content-publisher", context: { fix_type: "technical-critical" } }`
- Schema gaps → `{ type: "schema-inject", priority: "normal", assigned_to: "content-publisher" }`
- Broken internal links → `{ type: "on-page-fix", priority: "normal", assigned_to: "content-publisher" }`

> These task types map to `content-publisher` in `AGENTS.md`. For the full canonical task type registry, see `references/task-statuses.md`.

Do not create tasks for warnings unless they accumulate continuously over 3 identical audits.
