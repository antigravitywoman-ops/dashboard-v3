# Sheet Metric Definitions — Master Reference

> This file defines **exactly** what each of the 14 strategy sheets MUST contain.
> Every agent writing sheet data MUST read this file before generating any content.
> These definitions are industry-agnostic — they apply to resorts, SaaS, manufacturing, e-commerce, and any other vertical.
>
> **Data Source Tags**: Each column definition includes a `[Source: skill-name]` annotation indicating which skill populates it. `[MANUAL]` means research from profile.md / competitors.md / world knowledge. `[INFERRED]` means reasoned estimate when no live data is available.

---

## Sheet Naming Convention

All 14 sheets are written to both locations by report-generator.js:
- **Live copy**: `companies/<slug>/memory/sheets/` — read by agents/workflows
- **Archive**: `companies/<slug>/reports/<period>/sheets/` — immutable snapshot

```
00-digital-presence-baseline.md
01-executive-summary.md
02-gap-analysis.md
03-competitor-analysis.md
04-twelve-week-plan.md
05-keyword-research.md
06-location-pages.md
07-citations-backlinks.md
08-youtube-strategy.md
09-reddit-quora.md
10-review-strategy.md
11-schema-markup.md
12-weekly-tasks.md
13-kpis-metrics.md
```

---

## 00 — Digital Presence Baseline

**Purpose**: A complete, structured audit of everything that currently exists for the company — across their website, third-party platforms, Google ecosystem, and competitive landscape. This is the "what is" document; all other sheets derive targets from it. Generated once at onboarding and refreshed each quarter.

**Important**: This sheet documents current reality, not recommendations. Recommendations belong in Sheet 02 (Gap Analysis). Every blank or missing item here becomes a candidate gap row.

---

### Table 00-A: Website Content Inventory

A row-by-row record of every crawlable page on the domain.

**Data Source**: `[CRAWL: crawl-firecrawl]` + `[GSC: gsc-fetch]`

| Column | Description | Quality Criteria |
| :--- | :--- | :--- |
| Page URL | Full URL path (e.g., `/services/industrial-baling`) | Relative paths preferred; must be unique per row. |
| Page Type | Homepage / Service / Product / Blog / Location / About / Contact / FAQ / Category / Other | Must use one of these standard types. |
| Title Tag | The current `<title>` element value | Exact text from live page. Flag if >60 chars or missing. |
| Meta Description | Current meta description | Exact text. Flag if >160 chars or missing. |
| Word Count | Approximate body word count | Real number from crawl. |
| Last Updated | Date of most recent content change | ISO date from sitemap or crawl metadata. `[Data Missing]` if unavailable. |
| Indexing Status | INDEXED / NOINDEX / BLOCKED / ORPHAN / NOT IN SITEMAP | From GSC URL Inspection or sitemap comparison. `[Source: index-checker]` |
| GSC Impressions (L90d) | Total impressions over last 90 days | `[Source: gsc-fetch]`. `[Data Missing: No GSC Key]` if unavailable. |
| GSC Avg Position (L90d) | Average position over last 90 days | `[Source: gsc-fetch]`. Must be a number 1–100+ or `[Data Missing]`. |
| GSC Clicks (L90d) | Total clicks over last 90 days | `[Source: gsc-fetch]`. |
| Schema Types Present | Comma-separated list of schema types detected (e.g., "Organization, BreadcrumbList") | `[Source: schema-auditor]`. "None" if no schema detected. |
| Core Web Vitals | PASS / FAIL / NOT TESTED | `[Source: pagespeed-fetch]`. For top 10 traffic pages only; `[STATUS: PLANNED]` otherwise. |
| Internal Links In | Count of other internal pages linking to this page | From crawl graph. |
| Internal Links Out | Count of outbound internal links from this page | From crawl graph. |
| Issues | Comma-separated list of detected issues (e.g., "Title too long, Duplicate meta, Missing H1") | From crawl + GSC. "None" if clean. |

**Minimum Rows**: 10 pages (or all pages if site has fewer than 10).
**Quality Gate**: Every row must have a real URL. `[Data Missing]` is valid for GSC columns only when no key is configured. Do not fabricate URLs.

---

### Table 00-B: Social & Platform Presence

One row per platform where the company has or should have a presence.

**Data Source**: `[MANUAL]` from `about/profile.md` + `[SERPER: serper-miner]` brand search

| Column | Description | Quality Criteria |
| :--- | :--- | :--- |
| Platform | LinkedIn / Facebook / Instagram / YouTube / Twitter-X / Pinterest / TikTok / Reddit / Quora / Industry Forum | Real platform name. |
| Profile URL | Direct URL to company profile | Must be a valid URL or "Not Created". |
| Claimed / Active | YES / NO | Active = posted in last 30 days. |
| Followers / Subscribers | Number | Real count or `[Data Missing]`. |
| Posts Per Month | Estimated posting frequency | Real count from recent profile review. |
| Last Post Date | ISO date | Real date from profile or `[Not Active]`. |
| Avg Engagement Rate | Likes+Comments / Followers (%) | Estimate from recent 5 posts. `[Not Enough Data]` if fewer than 5 posts. |
| Content Focus | Brief description of what they post (e.g., "Product photos, customer testimonials") | 1-sentence description. |
| Platform Priority | HIGH / MEDIUM / LOW | Based on where target audience is most active for this industry. |
| Action Required | GROW / CLAIM / CREATE / MONITOR / DEPRIORITIZE | Single concrete action. |

**Minimum Rows**: 8 platforms checked (even if most are "Not Created").

---

### Table 00-C: Google Business Profile (GBP) Attribute Audit

Attribute-by-attribute audit of the GMB listing. One row per attribute.

**Data Source**: `[MANUAL]` from `about/profile.md` + `[gbp-optimizer]` if credentials configured

| Column | Description | Quality Criteria |
| :--- | :--- | :--- |
| Attribute | The specific GBP attribute being assessed | Use the standard GBP attribute names. |
| Current Value / Status | What is currently set or present | Exact value where possible; YES / NO / MISSING for flags. |
| Best Practice / Benchmark | What it should be or what top local competitors have | Specific target value. |
| Gap | Description of difference between Current and Benchmark | "None" if already optimal. |
| Priority | HIGH / MEDIUM / LOW | HIGH = directly impacts local pack ranking. |

**Required Attributes to Audit** (minimum 20 rows):
Business Name (NAP match), Primary Category, Secondary Categories (count), Description (length + keywords), Website URL, Phone Number, Address NAP, Service Area (if applicable), Hours of Operation, Special Hours, Business Attributes (accepted payments, parking, accessibility), Photos (Total count), Photos (Interior count), Photos (Exterior count), Photos (Product/Service count), Photos (Team count), Videos (count), Posts (last 30 days), Q&A Pairs (total + unanswered), Products/Services Listed, Booking Link, Review Count, Average Rating, Response Rate to Reviews, Response Time (avg), Messaging Enabled.

---

### Table 00-D: Existing Backlink Inventory

Known backlinks pointing to the domain, from any available tool or manual audit.

**Data Source**: `[MANUAL]` from Ahrefs/SEMrush/Moz export if available, otherwise `[INFERRED]` from brand searches

| Column | Description | Quality Criteria |
| :--- | :--- | :--- |
| Referring Domain | Root domain of the linking site (e.g., `industry-news.com`) | Domain only, no protocol. |
| Linking Page URL | Full URL of the page containing the link | Full URL. |
| Target URL | Which page on your site is being linked to | Full URL. |
| Anchor Text | The clickable text of the link | Exact text. "Image link" if no text. |
| Link Type | Editorial / Directory / Guest Post / Forum / Social / Sponsor / Broken | Must use one of these categories. |
| Domain Rating / Authority | DR or DA score from any tool (1–100) | Real number. `[Data Missing: No Tool Access]` if unavailable. |
| Follow Status | FOLLOW / NOFOLLOW / UGC / SPONSORED | Must be specified. |
| Date Acquired | Approximate date first discovered | ISO date or "Unknown". |
| Status | LIVE / LOST / TOXIC | Current link status. |
| Notes | Any relevant context | Optional; "None" if nothing notable. |

**Minimum Rows**: 10 known backlinks. If backlink data is entirely unavailable, include at least 5 inferred rows from brand searches annotated as `[Source: Inferred from SERP brand search]`.

---

### Table 00-E: Technical Baseline Snapshot

Key technical health metrics captured at audit time.

**Data Source**: `[CRAWL: crawl-firecrawl]` + `[PAGESPEED: pagespeed-fetch]` + `[SITEMAP: sitemap-parser]`

| Column | Description | Quality Criteria |
| :--- | :--- | :--- |
| Metric | Technical metric name | Must be a recognized technical SEO metric. |
| Current Value | Measured value | Real measurement. |
| Benchmark / Threshold | What good looks like | Standard threshold (e.g., LCP < 2.5s). |
| Status | PASS / FAIL / NEEDS REVIEW | Binary based on benchmark. |
| Tool / Source | How this was measured | Specific tool name. |
| Priority to Fix | HIGH / MEDIUM / LOW / N/A | If FAIL: how urgently it needs fixing. |

**Required Rows** (minimum 15):
Total Pages Crawled, Pages in Sitemap, Pages Indexed (GSC), Orphan Pages (crawlable but not in sitemap), 404 Errors, Redirect Chains (3xx), Canonical Issues, Duplicate Title Tags, Duplicate Meta Descriptions, Missing H1 Tags, Images Missing Alt Text (count), LCP Score (homepage), CLS Score (homepage), INP Score (homepage), Mobile Usability Issues, HTTPS Status, Robots.txt Present, Sitemap.xml Present, Sitemap Last Updated.

---

## 01 — Executive Summary

**Purpose**: A C-suite snapshot of entire SEO health and strategic direction. The first sheet a client reads.

### Required Tables

**Table 01-A: Property Overview** (above main table, as prose + structured list)

Required fields:
- Company Name | Website URL | Primary Entity (schema.org type) | Geographic Focus | Primary Products/Services | Target Demographic | Reporting Period | Report Author | Next Review Date

**Table 01-B: Core SEO Health Metrics**

| Column | Description | Quality Criteria | Data Source |
| :--- | :--- | :--- | :--- |
| Metric | KPI or health indicator name | Standard SEO metric name. | — |
| Current Value | Latest measured value | Real number or annotated estimate. | Varies per metric. |
| Benchmark | Industry or competitor average | Specific number with source reference. | `[INFERRED]` or `[SERPER]` |
| Delta vs Last Period | Change from previous report (% or absolute) | Must be calculated. `[First Report]` if no baseline. | `[gsc-fetch]` / `[ga4-fetch]` |
| Status | ON TRACK / AT RISK / CRITICAL / BASELINE | Based on comparison to benchmark. | — |
| Notes | Context or explanation | 1-sentence minimum. No blanks. | — |

**Required Metric Rows** (minimum 12):
Domain Authority / Rating, Organic Traffic (monthly), Organic Traffic vs Prior Period (%), Avg Position for Core Keyword Set, Total Indexed Pages, Crawl Errors Count, Core Web Vitals Pass Rate, Brand vs Non-Brand Traffic Split (ratio), Organic CTR (%), Conversion Rate from Organic (%), Total Referring Domains, Local Pack Visibility (if applicable), E-E-A-T Baseline Score (qualitative 1–10), GSC Coverage Errors.

**Table 01-C: Setup Hurdles** (mandatory if any API key is missing)

| Column | Description |
| :--- | :--- |
| Credential | API key or access name |
| Status | CONFIGURED / MISSING / PENDING VERIFICATION |
| Data It Unlocks | What this credential enables in the report |
| Impact of Missing | Which sheets are affected and how |
| Setup Steps | Numbered steps to configure it |
| Estimated Setup Time | In minutes |

**Table 01-D: Strategic Priorities (Top 5)**

| Rank | Priority | Rationale | Expected Impact | Target Sheet | Target Week |
| :--- | :--- | :--- | :--- | :--- | :--- |

**Strategic Narrative** (section after tables, 400+ words):
Must be a deeply synthesized, agentic analysis drawn explicitly from the Gap and Competitor sheets. It must NOT be a generic summary. You must construct a compelling, raw narrative explaining the current trajectory, surfacing specific semantic nuances and competitive threats, detailing exactly why the 12-week direction was chosen, and defining the specific methodologies to be used (e.g., Skyscraper Technique, Topical Authority silo). Written for a business owner, demonstrating raw intelligence and insight.

**Quality Gate**: No two rows in any table may have identical `Notes`. `Current Value` must never be blank — use `[Data Missing: No <API> Key]`.

---

## 02 — Gap Analysis

**Purpose**: Identify specific, prioritized content, technical, and competitive gaps. Sheet 02 answers TWO questions: (1) What are we missing that we need? (2) What are competitors doing that we are not — and how do we close that gap?

---

### Table 02-A: Our Gaps (Internal Analysis)

**Data Source**: `[CRAWL: crawl-firecrawl]` + `[GSC: gsc-fetch]` + `[MANUAL]` from Sheet 00

| Column | Description | Quality Criteria |
| :--- | :--- | :--- |
| Gap ID | Sequential ID for cross-referencing (e.g., GAP-001) | Numeric sequence only. |
| Gap Category | Content / Technical / Keyword / Backlink / Local / UX / Schema / E-E-A-T | Must use one of these 8 canonical categories. |
| Specific Gap | Exact, detailed description of the gap | Must be specific enough that a content writer or developer can act immediately. No "improve content quality." |
| Affected URL(s) | Which page(s) are affected | Specific URL paths. "Site-wide" only for universal issues. |
| UX Friction Point | How this gap harms the user journey | Describe the specific moment a user would be frustrated or leave. "N/A" for non-UX gaps. |
| E-E-A-T Dimension | Experience / Expertise / Authoritativeness / Trust / N/A | If E-E-A-T related, which dimension specifically. |
| Priority | CRITICAL / HIGH / MEDIUM / LOW | CRITICAL = actively harming rankings or conversions now. |
| Potential Impact | Estimated traffic / rank / conversion uplift from fixing | Must include a number or range (e.g., "+15–25% organic CTR", "+3 rank positions"). |
| Effort | LOW (<1 day) / MEDIUM (1–5 days) / HIGH (>5 days) | Realistic implementation effort. |
| Target Week | Which week in the 12-week plan this should be addressed | Week 1–12 or "Ongoing". |
| Owner | SEO Lead / Content Writer / Developer / AI Agent | Role responsible for fixing. |

**Minimum 30 unique rows**. Must cover at least 6 of 8 gap categories. At least 5 must be E-E-A-T specific. At least 5 must describe UX Friction Points.

---

### Table 02-B: Competitor Gap Matrix

For each of 7–10 top competitors, document what they are doing that we are not — and whether that gap hurts us.

**Data Source**: `[SERPER: serper-miner]` + `[CRAWL: crawl-browser]` + `[MANUAL]` from competitors.md

| Column | Description | Quality Criteria |
| :--- | :--- | :--- |
| Competitor | Competitor name | Real company name from Sheet 03. |
| Capability / Tactic | What they are doing well that we lack (e.g., "Author schema on every blog post", "YouTube product demos 2x/month") | Specific, observable tactic. Not "better content." |
| Gap Category | Content / Technical / Local / Authority / UX / Schema / Social / Video | Category of the gap this represents for us. |
| Their Execution Quality | BASIC / GOOD / EXCELLENT | Assessed from crawl/observation. 1-sentence justification required. |
| Our Current Status | NOT DOING / DOING POORLY / PARTIAL / MATCHING | Our equivalent status. |
| Competitive Harm | How much this gap currently costs us in rankings/traffic (LOW / MEDIUM / HIGH) | Qualitative assessment. |
| Recommended Action | Specific tactic to close this gap or differentiate | Actionable within 12 weeks. |
| Gap ID Reference | The corresponding GAP-XXX row in Table 02-A, if applicable | Cross-reference or "New Gap". |
| Priority | HIGH / MEDIUM / LOW | Based on competitive harm and effort. |

**Minimum rows**: 7 competitors × 3 tactics each = 21 rows minimum. Aim for 4–6 tactics per competitor = 28–60 rows.

**Quality Gate**: Every row must name a real competitor with a specific, observable tactic. No generic "better SEO strategy." No two rows for the same competitor may describe the same tactic.

---

## 03 — Competitor Analysis

**Purpose**: A comprehensive, multi-dimensional SEO profile of every relevant competitor. This is the deep research document that feeds Gap Analysis, Keyword Research, and Strategic Planning.

### Required Columns

| Column | Description | Quality Criteria | Data Source |
| :--- | :--- | :--- | :--- |
| Competitor | Brand / company name | Real company. No generic labels. | `[MANUAL]` |
| Website | Root domain | Valid URL. | `[MANUAL]` |
| Market Segment | Budget / Mid-Market / Premium / Enterprise | Position in the market. | `[MANUAL]` / `[INFERRED]` |
| Geographic Coverage | Local / Regional / National / Global + specific markets | How broadly they operate. | `[MANUAL]` |
| Type | Direct / Indirect / Aspirational | Direct = same product+market. Indirect = overlapping audience. Aspirational = where you want to be. | `[MANUAL]` |
| Domain Authority (DA) | 0–100 authority score | Real number from any tool. Tool name must be in Notes. `[Data Missing: No Tool]` if unavailable. | `[MANUAL]` |
| Estimated Monthly Organic Traffic | Organic visits/month | Number or range with source (e.g., "8K–12K/mo via Semrush estimate"). | `[SERPER: serper-miner]` / `[INFERRED]` |
| Total Backlink Count | Estimated referring domain count | Number. "Unknown" only if completely unresearchable. | `[MANUAL]` / `[INFERRED]` |
| Top Ranking Keywords (Top 10) | Count of keywords ranked in positions 1–10 | Number or range. | `[SERPER: serper-miner]` / `[INFERRED]` |
| Top 3 Ranking Keywords (Examples) | 3 specific keywords they rank for, with positions | Must name real keywords with estimated positions. | `[SERPER: serper-miner]` |
| Content Frequency | Blog posts / content pieces published per month | Number. "Unknown" only if truly unverifiable. | `[CRAWL: crawl-browser]` / `[MANUAL]` |
| Avg Content Depth | Estimated average word count per article | THIN (<500) / STANDARD (500–1500) / DEEP (1500–3000) / PILLAR (3000+) | `[CRAWL: crawl-browser]` / `[INFERRED]` |
| Content Quality Score | Overall content quality assessment | Thin / Basic / Good / Excellent — with 1-sentence justification. | `[MANUAL]` |
| YouTube Presence | Channel subscribers + total video count | "None" if no channel. Real numbers if channel exists. | `[MANUAL]` |
| Social Follower Estimate | Total combined followers across primary platforms | Number or range. Specify which platforms included. | `[MANUAL]` |
| GBP / Local Pack Rank | Position in local map pack for primary service keyword | 1–3 / NOT IN PACK / N/A (non-local business) | `[SERPER: serper-miner]` |
| GBP Review Count | Total reviews on Google Business Profile | Real number. `[Data Missing]` if unresearchable. | `[MANUAL]` / `[SERPER]` |
| GBP Avg Rating | Star rating 1.0–5.0 | Real number. | `[MANUAL]` |
| Schema Coverage | Schema types they implement (comma-separated) | Must list specific types (e.g., "Organization, FAQPage, Product"). "None" if no schema. | `[CRAWL: crawl-browser]` / `[INFERRED]` |
| E-E-A-T Markers | Specific trust signals present (e.g., "Author bio pages, Case studies with client names, Industry awards, Press mentions") | Must list specific, observable markers. "None identified" if none. | `[MANUAL]` |
| Featured Snippets Owned | Estimated count of featured snippets they hold | Number or `[Data Missing]`. | `[SERPER: serper-miner]` / `[INFERRED]` |
| Paid Search Presence | YES (+ estimated budget tier) / NO | Budget tiers: Low (<$1K/mo), Mid ($1K–$5K/mo), High (>$5K/mo). | `[INFERRED]` from SERP observation. |
| Mobile Performance | FAST / AVERAGE / SLOW (with LCP estimate if available) | Based on spot-check via PageSpeed or inference. | `[PAGESPEED: pagespeed-fetch]` / `[INFERRED]` |
| Key SEO Strengths | 2–4 specific, observable strengths | Must be specific enough to quote in a client presentation (e.g., "50+ technical guides with engineer author schema, 3.2K YouTube subs"). | `[MANUAL]` |
| Key SEO Weaknesses | 2–4 specific vulnerabilities we can exploit | Must include why it's a weakness (e.g., "No mobile optimization — estimated 5.4s LCP on product pages"). | `[MANUAL]` |
| Threat Level | LOW / MEDIUM / HIGH / CRITICAL | Based on overlap with our keyword targets and their authority/resources. | `[INFERRED]` |
| Our Exploitable Opportunity | One specific action we should take to capitalize on their weakness | Must be concrete (e.g., "Create 3 comparison pages targeting '[Competitor] vs [Us]' keywords"). | `[MANUAL]` |

**Minimum 10 competitors**. Must include at least 2 indirect competitors. Must include at least 1 aspirational competitor (where we want to be in 12+ months).

**Quality Gate**: No two competitors may have identical `Key SEO Strengths`, `Key SEO Weaknesses`, or `Top 3 Ranking Keywords`. `Domain Authority` must vary across rows. `Threat Level` must vary.

---

## 04 — 12-Week Plan

**Purpose**: A phased, week-by-week execution roadmap with measurable deliverables, task assignments, and clear success criteria. This is the master operations document for the engagement.

### Required Columns

| Column | Description | Quality Criteria |
| :--- | :--- | :--- |
| Week | Week number 1–12 | All 12 weeks must be present. |
| Phase | Foundation (1–3) / Growth (4–6) / Scale (7–9) / Optimization (10–12) | Must follow the standard phase model. |
| Focus Area | Primary strategic focus for this week | Must be specific (e.g., "Technical Audit + GSC Baseline" not "Technical"). |
| Class of Problem | Technical SEO / Content Gap / Authority Building / Local SEO / Conversion Optimization / Brand Building | Which primary SEO lever is being pulled this week. Must use one of these 6 classes. |
| Key Deliverables | Concrete outputs that will exist at end of week | Must list 2–4 specific deliverables (e.g., "GSC verified, 5 crawl errors fixed, robots.txt updated"). |
| Detailed Tasks | Full task breakdown | Must contain 4–8 specific tasks, each actionable by a junior team member. Numbered list. Include the specific tool or skill for each task. |
| Owner | Strategic owner for the week | Must be a role: SEO Lead / Content Strategist / Developer / Local SEO Specialist. |
| Worker | Who executes the tasks day-to-day | Must be specific: SEO Lead / Content Writer / Developer / AI Agent (seo-orchestrator) / AI Agent (research-analyst) / AI Agent (data-intelligence) / Freelancer. Where AI Agents are the worker, name the specific agent. |
| Estimated Hours | Total time budget for the week | Realistic number 5–40 hours. |
| Success Metrics | How to objectively measure if this week was successful | Must include at least 2 measurable outcomes (e.g., "GSC showing impressions data, 0 critical crawl errors in Screaming Frog output"). |
| Gap IDs Addressed | Which GAP-XXX items from Sheet 02 this week closes | Must reference specific Gap IDs. "None" only for pure monitoring weeks. |

**Phase Definitions** (non-negotiable):
- **Foundation (Weeks 1–3)**: Technical crawl, GSC/GA4 verification, crawl error fixes, robots.txt, schema baseline, GMB optimization, sitemap submission, benchmark snapshot.
- **Growth (Weeks 4–6)**: First content pieces targeting Quick Win keywords, initial citation building, location page creation, on-page optimization of top 5 existing pages, first link outreach.
- **Scale (Weeks 7–9)**: Systematic link building, social amplification cadence, video content production, content cluster expansion, schema rollout across all product/service pages.
- **Optimization (Weeks 10–12)**: A/B testing CTR elements (title tags, meta descriptions), conversion rate optimization on high-traffic pages, content refresh for declining pages, performance reporting and Q2 planning.

**Quality Gate**: No two weeks may have identical `Key Deliverables` or `Detailed Tasks`. Total hours across 12 weeks must be 120–400. Each week's tasks must logically build on the prior week. `Gap IDs Addressed` must not be empty for weeks 1–9.

---

## 05 — Keyword Research

**Purpose**: A comprehensive keyword universe (50–500 keywords) covering all intent types, funnel stages, topic clusters, and geographic variations. The master keyword list that all content, location pages, and targeting decisions reference.

### Required Columns

| Column | Description | Quality Criteria | Data Source |
| :--- | :--- | :--- | :--- |
| Keyword | Exact search query | Real search term. No fabricated terms. No duplicates. | `[SERPER: serper-miner]` / `[MANUAL]` |
| Topic Cluster | Which content cluster this keyword belongs to (e.g., "Product-Hydraulic-Press", "Blog-Manufacturing-Tips", "Local-Mumbai") | Must organize keywords into 5+ named clusters. | `[MANUAL]` |
| Search Intent | Informational / Navigational / Commercial / Transactional | Correctly classified based on query structure. | `[MANUAL]` |
| Funnel Stage | TOFU (Awareness) / MOFU (Consideration) / BOFU (Decision) | Maps to buyer journey. | `[MANUAL]` |
| Current Position | Rank on Google | 1–100+, `Not Ranking`, or `[Data Missing: No GSC Key]`. | `[GSC: gsc-fetch]` / `[SERPER: serper-miner]` |
| GSC Impressions (L90d) | Impressions over last 90 days | Real number or `[Data Missing: No GSC Key]`. | `[GSC: gsc-fetch]` |
| GSC CTR (L90d) | Click-through rate from GSC | Percentage or `[Data Missing: No GSC Key]`. | `[GSC: gsc-fetch]` |
| Search Volume | Monthly search volume (global or market-specific) | Realistic number for the industry and geography. Natural variation required. | `[SERPER: serper-miner]` / `[INFERRED]` |
| Keyword Difficulty | 0–100 difficulty score | Must vary across keywords. No constant values. | `[SERPER: serper-miner]` / `[INFERRED]` |
| CPC (USD) | Estimated cost-per-click | Number or `N/A`. Helps gauge commercial value. | `[SERPER: serper-miner]` / `[INFERRED]` |
| SERP Features Present | Featured Snippet / People Also Ask / Local Pack / Video Carousel / Knowledge Panel / Shopping / None | Comma-separated if multiple. Indicates CTR competition. | `[SERPER: serper-miner]` |
| LSI Context Words | Semantically related entities and NLP concepts necessary for comprehensive coverage | Must list 3-5 specific LSI terms (e.g., "tonnage yield, hydraulic PSI, scrap grades"). | `[MANUAL]` |
| Suggested H2/H3 Structure | A brief hierarchical outline for content targeting this keyword | Must provide explicit H2/H3 headings that answer the deep intent, showing semantic understanding. | `[MANUAL]` |
| Seasonal Trend | Evergreen / Seasonal: [months] / Growing / Declining / Volatile | Based on search trend patterns. | `[MANUAL]` / `[INFERRED]` |
| Competitor Ranking #1 | Which competitor currently dominates this keyword | Real competitor name or "Unknown". Helps prioritize attack strategy. | `[SERPER: serper-miner]` |
| Standing | Quick Win / Growth Target / Long-Term / Defensive / Brand | Classification of strategic standing. Quick Win = pos 8–20 + low KD. Defensive = we rank #1–3, must protect. Long-Term = high value but KD >60. | `[MANUAL]` |
| Priority | HIGH / MEDIUM / LOW | Based on volume × intent × difficulty triangle. | `[MANUAL]` |
| Target URL | Which page should rank for this keyword | Specific URL path. Must be unique per topic cluster anchor. | `[MANUAL]` |
| Content Action | New Page / Optimize Existing / Blog Post / FAQ Entry / Location Page / Schema Addition | Specific action needed. | `[MANUAL]` |
| Target Week | Which week in the 12-week plan this keyword's content/optimization should be live | Week 1–12. "Ongoing" for evergreen monitoring. Must align with Sheet 04. | `[MANUAL]` |

**Scale Requirements**:
- **Minimum 50 keywords** for initial report; target 200–500 for full engagement.
- All 4 intent types must be represented.
- Minimum 15 long-tail keywords (4+ words). Long-tail keywords MUST be deeply researched, highly specific queries representing bottom-of-funnel intent. Do NOT just append generic modifiers to short-tail keywords.
- Minimum 8 "Quick Win" keywords (pos 8–20, low KD, decent volume).
- Minimum 5 topic clusters.
- Minimum 5 keywords tagged "Local Pack" in SERP Features (for local businesses).
- Keywords must span the full product/service range — not all from one cluster.

**Quality Gate**: No duplicate keywords. `Search Volume` and `Keyword Difficulty` must show genuine variation (not arithmetic sequences). At least 3 keywords must be `Standing: Defensive` (protecting existing rankings).

---

## 06 — Location Pages

**Purpose**: Strategy and template blueprint for every local, regional, or service-area landing page. Each row represents one page that either exists or should be created.

### Required Columns

| Column | Description | Quality Criteria | Data Source |
| :--- | :--- | :--- | :--- |
| Location | City, region, district, or service area name | Real geographic location relevant to the business. | `[MANUAL]` |
| Target URL Slug | URL path (e.g., `/service-areas/mumbai`) | Consistent pattern across all location pages. | `[MANUAL]` |
| Primary Keyword | Main target keyword including location (e.g., "hydraulic press manufacturer Mumbai") | Must include the location name. Must be in Sheet 05. | `[MANUAL]` / `[Sheet 05]` |
| Secondary Keywords | 2–3 supporting keywords for this location | Unique per location. Comma-separated. | `[Sheet 05]` |
| Estimated Local Search Volume | Monthly searches for the primary keyword in this specific location | Real number or `[Data Missing: No Local Rank Tool]`. | `[SERPER: serper-miner]` / `[INFERRED]` |
| Local Pack Present? | Is there a Google local map pack on the SERP for this query? | YES / NO / VARIES. If YES, note current pack composition. | `[SERPER: serper-miner]` |
| Our Local Pack Position | Current position in the local map pack | 1 / 2 / 3 / NOT IN PACK / N/A | `[SERPER: serper-miner]` / `[INFERRED]` |
| GBP Connection | Which Google Business Profile listing serves this location | Business name + GBP category, or "No GBP for this area". | `[MANUAL]` |
| Local Competitors | 2–3 real local businesses competing for this exact location query | Must name real local competitors. Not the same names as Sheet 03 (which covers national/industry competitors). | `[SERPER: serper-miner]` / `[MANUAL]` |
| Word Count Target | Minimum word count for this page | Realistic: 800 for service areas, 1200+ for primary markets. | `[MANUAL]` |
| H1 Title | Proposed H1 header | Must include the location and primary service/product. | `[MANUAL]` |
| Key Sections | H2 headings to include | Must specify 4–6 unique section names. Not "About Us, Contact Us, Services" — those are generic. | `[MANUAL]` |
| Unique Content Hook | What makes this location page non-generic | Specific local statistic, case study, testimonial, or local partnership that differentiates this page. "Swap city name" is a CRITICAL failure. | `[MANUAL]` |
| Schema Type | Schema type for this page | LocalBusiness / ServiceArea / GeoCoordinates / Place | `[MANUAL]` |
| Internal Link Sources | Which existing pages should link to this location page | 2–3 specific page URLs that should link here. | `[Sheet 00-A]` |
| Status | LIVE / NEEDS UPDATE / DRAFT / PLANNED | Current page status. | `[MANUAL]` |
| Target Week | When to create or optimize this page | Week 1–12. | `[Sheet 04]` |

**Minimum Rows**: 8 locations for businesses with physical presence; 5 for purely online. Must include a mix of primary markets (high volume) and expansion opportunities (lower competition, growth areas).

**Quality Gate**: No two rows may have identical `Unique Content Hook`, `H1 Title`, or `Key Sections`. `Primary Keyword` must include the location name in every row.

---

## 07 — Citations, Backlinks & Digital Footprint

**Purpose**: A complete map of the company's existing and target citation profile, backlink acquisition pipeline, and digital asset inventory. Answers: "Where do we exist online, where should we exist, and what links are we building?"

This sheet contains three sub-tables.

---

### Table 07-A: Citation & NAP Consistency Audit

One row per directory or listing where the company appears or should appear.

| Column | Description | Quality Criteria | Data Source |
| :--- | :--- | :--- | :--- |
| Platform | Directory, listing site, or review platform name | Real, active platform. | `[MANUAL]` |
| Platform Category | General Directory / Industry-Specific / Local Directory / Social / Review Platform / Map / Trade Directory | Must use one of these categories. | `[MANUAL]` |
| Profile URL | Direct link to the listing | Valid URL or "Not Listed Yet". | `[MANUAL]` |
| NAP — Name | Exact business name as listed | Must match canonical NAP. Flag inconsistency. | `[MANUAL]` |
| NAP — Address | Exact address as listed | Must match canonical NAP. "N/A" for online-only. | `[MANUAL]` |
| NAP — Phone | Phone number as listed | Must match canonical NAP. | `[MANUAL]` |
| NAP Consistency Score | 1.0 (exact match) / 0.8 (minor variation) / 0.5 (significant mismatch) / 0.0 (wrong data) / Not Listed | Based on comparison to canonical NAP in file header. | `[MANUAL]` |
| Current Reviews | Total review count on this platform | Real number. `[Data Missing]` if unverified. | `[MANUAL]` |
| Current Rating | Average star rating | Number 1.0–5.0 or "N/A". | `[MANUAL]` |
| Photos Uploaded | Count of photos on this listing | Number or "None". | `[MANUAL]` |
| Posts / Activity | Whether the listing has active posts or updates | ACTIVE (last 30 days) / STALE (30–90 days) / INACTIVE / N/A | `[MANUAL]` |
| Status | VERIFIED / CLAIMED / ACTIVE / PENDING / NOT LISTED / DUPLICATE FOUND | Current state. | `[MANUAL]` |
| Priority | HIGH / MEDIUM / LOW | HIGH = high-authority platform with significant local ranking impact. | `[MANUAL]` |
| Action Required | VERIFY / CLAIM / UPDATE NAP / ADD PHOTOS / CREATE LISTING / SOLICIT REVIEWS / REMOVE DUPLICATE | Single specific next action. | `[MANUAL]` |

**Canonical NAP Block** (above table, as prose):
State the exact canonical Name, Address, Phone Number that all listings must match.

**Minimum 15 citations** covering: Google Business Profile, Bing Places, Apple Maps, Facebook Business, 3+ industry-specific directories, 2+ local directories, 1+ trade directory (IndiaMart / ThomasNet / Alibaba / etc. per industry), 2+ review platforms, Yelp/equivalent.

---

### Table 07-B: Backlink Acquisition Pipeline

Target domains for link building — not existing links. This is the prospecting plan.

| Column | Description | Quality Criteria | Data Source |
| :--- | :--- | :--- | :--- |
| Target Domain | Root domain of the link target | Real, reachable domain. | `[SERPER: serper-miner]` / `[MANUAL]` |
| Domain Rating / Authority | DR or DA of target site | Real number or `[Data Missing: No Tool]`. | `[MANUAL]` |
| Relevance | Topic relevance to the business (HIGH / MEDIUM / LOW) | Based on the target domain's content focus. | `[MANUAL]` |
| Link Type | Guest Post / Resource Page / Broken Link / Unlinked Mention / Directory / Forum Profile / Competitor Backlink / Press Mention | Must use one of these types. | `[MANUAL]` |
| Acquisition Strategy | Specific outreach approach (e.g., "Offer to write guest post on [specific topic] targeting [contact name/role]") | Specific enough to execute. | `[MANUAL]` |
| Target Anchor Text | Preferred anchor text for the link | Real keyword or branded term. | `[Sheet 05]` |
| Status | IDENTIFIED / RESEARCHING / CONTACTED / AGREED / PUBLISHED / REJECTED / LOST | Current pipeline stage. | `[MANUAL]` |
| Contact | Contact name + email/LinkedIn URL | Real contact info or "To Research". | `[MANUAL]` |
| Priority | HIGH / MEDIUM / LOW | HIGH = high DR + high relevance + link type with direct ranking impact. | `[MANUAL]` |
| Target Week | When outreach should begin | Week 1–12. | `[Sheet 04]` |
| Notes | Any context about the relationship, prior contact, or special conditions | Optional. | `[MANUAL]` |

**Minimum 15 target domains** across at least 4 link types. Must include at least 3 competitor backlink opportunities (domains linking to competitors but not to us). `[Source: serper-miner]` for competitor backlink discovery.

---

### Table 07-C: Digital Asset Inventory

A registry of every public digital asset the company owns or has been mentioned in.

| Column | Description | Quality Criteria |
| :--- | :--- | :--- |
| Asset Type | Website Page / Blog Post / PDF / Video / Podcast / Press Release / News Mention / Interview / Award / Case Study / Social Post / GBP Post | Must use one of these types. |
| Asset URL / Location | Where the asset lives | Full URL or "Offline". |
| Platform / Host | Where it's published (Company Website / YouTube / LinkedIn / News Site / etc.) | Specific platform name. |
| Description | Brief description of the asset | 1 sentence. |
| Backlink Value | Does this asset attract or deserve backlinks? YES / NO / POTENTIAL | Assessed based on content type. |
| Indexed by Google? | YES / NO / UNKNOWN | From GSC or spot-check. |
| Last Updated | Date | ISO date or "Unknown". |
| Action | PROMOTE / UPDATE / REPURPOSE / ARCHIVE / NONE | Single recommended action. |

**Minimum 10 assets** across at least 4 asset types.

---

## 08 — YouTube Strategy

**Purpose**: Video content plan mapped to SEO keywords and sales funnel stages. Each concept is production-ready with enough detail to brief a videographer or AI video tool.

### Required Columns

| Column | Description | Quality Criteria | Data Source |
| :--- | :--- | :--- | :--- |
| Video Title | Proposed SEO-optimized video title | Must naturally include target keyword. Must be enticing. Max 70 chars. | `[MANUAL]` |
| Target Keyword | Primary keyword this video targets | Must exist in Sheet 05. | `[Sheet 05]` |
| Funnel Stage | TOFU (Awareness) / MOFU (Consideration) / BOFU (Decision) | Must represent all 3 stages across the full sheet. | `[MANUAL]` |
| Video Type | Tutorial / Demo / Testimonial / Behind-the-Scenes / Comparison / FAQ / Case Study / Industry Trend | Must specify format. | `[MANUAL]` |
| Estimated Monthly Search Volume | YouTube search volume estimate for the target keyword | Number or `[Data Missing: No YouTube Keyword Tool]`. | `[INFERRED]` |
| Estimated Length | Duration in minutes | Realistic: Tutorial 5–15 min, FAQ 2–5 min, Testimonial 2–4 min. | `[MANUAL]` |
| Script Outline | 4–6 specific talking points or sections | Must be detailed enough for a writer to produce a first draft. | `[MANUAL]` |
| Thumbnail Concept | Brief description of the thumbnail design | Specific visual direction. | `[MANUAL]` |
| SEO Description Hook | First 2 sentences of the YouTube description | Front-load the keyword. Must be compelling. | `[MANUAL]` |
| CTA | Call-to-action at end of video | Specific (e.g., "Visit /services/baling-press for full spec sheet"). Not "Like and subscribe." | `[MANUAL]` |
| Internal Link Opportunity | Which website page to link in description | Specific URL. | `[Sheet 05 — Target URL]` |
| Schema Type | VideoObject schema to implement on an embedded page | Must specify: name, description, thumbnailUrl, uploadDate, duration properties. | `[MANUAL]` |
| Status | PUBLISHED / FILMING / SCRIPTED / PLANNED | Current production status. | `[MANUAL]` |
| Target Week | When to publish | Week 1–12. | `[Sheet 04]` |

**Minimum 8 video concepts**. All 3 funnel stages required. At least 2 Comparison/vs videos. At least 1 Testimonial/Case Study video. At least 1 Tutorial.

**Quality Gate**: No two videos may target the same keyword. `Script Outline` must contain at least 4 unique points. `CTA` must link to a specific page, not a generic homepage.

---

## 09 — Reddit & Quora

**Purpose**: Systematic community engagement plan for building entity authority, generating referral traffic, and earning organic mentions across discussion platforms.

### Required Columns

| Column | Description | Quality Criteria | Data Source |
| :--- | :--- | :--- | :--- |
| Platform | Reddit / Quora / LinkedIn Pulse / Stack Exchange / Industry Forum / Hacker News | Real platform name. | `[MANUAL]` |
| Community / Topic | Specific subreddit, Quora topic, or forum section | Must be a real, active community (verifiable). For Reddit, include member count estimate. | `[SERPER: serper-miner]` / `[MANUAL]` |
| Community Size | Estimated member / follower count | Real number or `[Data Missing]`. Helps prioritize engagement. | `[MANUAL]` |
| Target Keyword | The SEO keyword or topic this engagement supports | Must align with Sheet 05. | `[Sheet 05]` |
| Engagement Type | Answer Question / Start Discussion / Share Case Study / Comment on Thread / Host AMA / Share Resource | Must be specific. | `[MANUAL]` |
| Content Angle | The unique perspective or value to provide | Must be genuinely helpful, not promotional. Describe the actual insight or data to share. | `[MANUAL]` |
| Example Post Title / Thread | A draft title for the planned post or the specific existing thread to answer | Real example. Not "TBD." | `[MANUAL]` |
| Karma / Account Requirement | Minimum karma or account age required to post in this community | Number or "No requirement." | `[MANUAL]` |
| Link Opportunity | Whether a natural link back to site is possible | YES (contextual — describe the context) / NO (pure brand building) | `[MANUAL]` |
| Frequency | How often to engage in this community | Daily / 2x Weekly / Weekly / Monthly | `[MANUAL]` |
| Status | ACTIVE / PLANNED / PAUSED | Current engagement status. | `[MANUAL]` |
| Notes | Any special rules for this community (no self-promotion, required flair, etc.) | Must note community rules relevant to engagement strategy. | `[MANUAL]` |

**Minimum 8 entries**. Must include both Reddit and Quora. At least 3 must be "Answer Question" type. No entry may be purely promotional.

---

## 10 — Review Strategy

**Purpose**: Systematic plan to generate, monitor, and respond to customer reviews across all relevant platforms. Includes response protocols and escalation SOPs.

### Required Columns

| Column | Description | Quality Criteria | Data Source |
| :--- | :--- | :--- | :--- |
| Platform | Review platform name | Real platform relevant to the industry. | `[MANUAL]` |
| Platform Type | Search (Google/Bing Maps) / Industry Review (G2, Capterra) / Travel (TripAdvisor, Booking.com) / Trade (IndiaMart, Alibaba) / Social (Facebook) / General (Yelp, Trustpilot) | Must be categorized. | `[MANUAL]` |
| Current Review Count | Total reviews currently | Real number or `[Data Missing]`. | `[MANUAL]` |
| Current Rating | Average star rating 1.0–5.0 | Real number. | `[MANUAL]` |
| Review Velocity | Reviews per month (trailing 3 months) | Number. | `[MANUAL]` |
| Target Reviews (Q+1) | Goal for next quarter | Realistic: 20–50% growth from current count. | `[MANUAL]` |
| Target Rating | Minimum acceptable rating to maintain | Typically 4.5+ for most industries. | `[MANUAL]` |
| Review Generation Tactic | Specific method to generate reviews | Must be specific and unique per platform (e.g., "QR code on invoice linking to Google review form, sent with every delivery confirmation"). Not "ask for reviews." | `[MANUAL]` |
| Review Request Touchpoint | Where / when in the customer journey to request the review | Specific: post-purchase email / in-person at checkout / follow-up call / delivery receipt | `[MANUAL]` |
| Negative Review SOP | How to handle negative reviews on this platform | Must describe: (1) response time target, (2) who responds, (3) what to say, (4) when to escalate offline. | `[MANUAL]` |
| Key Review Themes to Encourage | What aspects of service to prompt customers to mention | Must be specific to the platform's typical search behavior (e.g., for Google: mention specific services and location). | `[MANUAL]` |
| Monitoring Tool | How this platform is monitored | Must name a specific tool or method. | `[MANUAL]` |
| Status | ACTIVE / NEEDS ATTENTION / NOT LISTED / UNCLAIMED | Current monitoring status. | `[MANUAL]` |

**Minimum 5 platforms**. Must include the primary review platform for the industry. Each platform must have a unique `Review Generation Tactic`. Must include a Negative Review SOP for top 2 platforms.

---

## 11 — Schema Markup

**Purpose**: Structured data implementation roadmap that prioritizes CTR-lifting rich results and E-E-A-T signals.

### Required Columns

| Column | Description | Quality Criteria | Data Source |
| :--- | :--- | :--- | :--- |
| Page / Section | Which page or page type this schema applies to | Specific page URL or page type (e.g., "All /blog/* posts"). | `[CRAWL: crawl-firecrawl]` |
| Schema Type | schema.org type | Must be a valid schema.org type. | `[MANUAL]` |
| Current Status | IMPLEMENTED / PARTIALLY IMPLEMENTED / NOT IMPLEMENTED / ERRORS | From Google Rich Results Test or validator. | `[MANUAL]` / `[schema-auditor]` |
| Key Properties to Implement | Specific properties for this schema | Must list 4+ specific properties with example values (e.g., `"name": "Industrial Baling Press", "offers": {...}`). | `[MANUAL]` |
| Implementation Method | JSON-LD / Microdata / Plugin (specify plugin name) | JSON-LD preferred. | `[MANUAL]` |
| Expected Rich Result | What Google rich result this enables | Must be a real Google rich result type (FAQ accordion, Star ratings, Product snippet, Breadcrumb trail, Video thumbnail, etc.). | `[MANUAL]` |
| E-E-A-T Impact | How this schema improves E-E-A-T signals | Specific explanation (e.g., "Person schema on author pages signals Expertise to Google"). | `[MANUAL]` |
| CTR Impact Estimate | Expected CTR lift from this rich result | LOW (<5%) / MEDIUM (5–15%) / HIGH (>15%) | `[INFERRED]` |
| Validation URL | Link to Google Rich Results Test result | Real URL or "To Validate". | `[MANUAL]` |
| Priority | HIGH / MEDIUM / LOW | HIGH = currently unimplemented + high CTR impact. | `[MANUAL]` |
| Target Week | When to implement | Week 1–12. | `[Sheet 04]` |

**Minimum 6 schema implementations**. Must include: Organization (homepage), BreadcrumbList (site-wide), and at least one product/service-specific schema. Must include at least 1 E-E-A-T schema (Person, Review, or Certification).

---

## 12 — Weekly Tasks

**Purpose**: Recurring operational SEO checklist. These are the standing operating procedures that run every week/month regardless of the 12-week plan state.

### Required Columns

| Column | Description | Quality Criteria | Data Source |
| :--- | :--- | :--- | :--- |
| Task ID | Unique identifier (e.g., WT-001) | Sequential. Used for SOP cross-referencing. | — |
| Frequency | Daily / 2x Week / Weekly / Bi-Weekly / Monthly / Quarterly | Must be a specific cadence. | `[MANUAL]` |
| Category | Technical / Content / Outreach / Local / Monitoring / Social / Reporting | Must use one of these 7 categories. | `[MANUAL]` |
| Task | The specific recurring task | Must be specific and immediately executable by a junior team member or AI Agent. | `[MANUAL]` |
| AI Agent | Which OpenClaw agent executes this (if automated) | seo-orchestrator / research-analyst / data-intelligence / content-writer / excel-porter / HUMAN | `[MANUAL]` |
| Skill / Tool Used | Which skill or tool is invoked | Must name the specific OpenClaw skill or external tool. | `[MANUAL]` |
| Estimated Time | Time per occurrence | Realistic (e.g., "15 min", "2 hours"). | `[MANUAL]` |
| Owner | Role responsible for oversight | Must be a role even if AI executes. | `[MANUAL]` |
| Success Criteria | How to know this task was done correctly | Specific output or metric threshold. | `[MANUAL]` |
| SOP Reference | Link or filename for the SOP | URL or filename. "To Create" if not yet documented. | `[MANUAL]` |

**Minimum 15 recurring tasks**. Must cover at least 5 of 7 categories. Must include: at least 2 Daily tasks, 4 Weekly tasks, 2 Monthly tasks, 1 Quarterly task. At least 5 tasks must name an AI Agent as the Worker.

**Quality Gate**: Each task must specify a Skill/Tool. No two tasks may be identical. `Success Criteria` must be a measurable outcome.

---

## 13 — KPIs & Metrics

**Purpose**: Performance tracking dashboard with progressive targets. The single source of truth for measuring if the strategy is working.

### Required Columns

| Column | Description | Quality Criteria | Data Source |
| :--- | :--- | :--- | :--- |
| KPI | Metric name | Must be a recognized, measurable SEO or business metric. | — |
| Category | Traffic / Rankings / Engagement / Conversions / Technical / Authority / Local | Must use one of these 7 categories. | `[MANUAL]` |
| Sub-Category | More specific grouping (e.g., "Organic Traffic", "Local Pack", "Page Speed") | Optional but recommended. | `[MANUAL]` |
| Baseline | Value at start of engagement or last report period | Real number. `[Data Missing: No <API> Key]` if unavailable. | `[GSC: gsc-fetch]` / `[GA4: ga4-fetch]` |
| Current | Latest measured value | Real number. Must be from the same tool as Baseline. | `[GSC: gsc-fetch]` / `[GA4: ga4-fetch]` |
| Target (Week 4) | 4-week milestone target | Realistic, achievable. Must be greater than Baseline (or smaller for negative metrics like bounce rate). | `[MANUAL]` |
| Target (Week 8) | 8-week milestone target | Must be greater than Target Week 4. | `[MANUAL]` |
| Target (Week 12) | 12-week final target | Ambitious but achievable. Must be greater than Target Week 8. | `[MANUAL]` |
| Delta (Baseline → Current) | Change expressed as % or absolute | Must be calculated: `(Current - Baseline) / Baseline * 100`. `[First Report]` if no prior baseline. | Calculated |
| Status | ON TRACK / AT RISK / BEHIND / ACHIEVED / BASELINE | Based on comparing Current to nearest Target. | Calculated |
| Tracking Tool | Which tool or skill measures this KPI | Must name specific tool (GSC, GA4, Ahrefs, etc.) or OpenClaw skill. | `[MANUAL]` |
| Reporting Cadence | How often this KPI is updated | Weekly / Monthly / Quarterly | `[MANUAL]` |
| Notes | Context, anomalies, or explanations | 1 sentence minimum. No blank cells. | `[MANUAL]` |

**Required KPIs** (minimum 15 across at least 5 categories):
Organic Traffic (monthly sessions), Organic Traffic YoY (%), Total Keywords Ranking (Top 3), Total Keywords Ranking (Top 10), Total Keywords Ranking (Top 50), Average Position (Core Keyword Set), Click-Through Rate / CTR (Organic), Domain Authority / Rating, Total Referring Domains, New Backlinks Acquired (monthly), Local Pack Impressions (if local), Local Pack Clicks (if local), Google Business Profile Views, GBP Direction Requests / Calls, Conversion Rate (Organic), Avg Page Load Time (LCP), Crawl Errors Count, Core Web Vitals Pass Rate, GSC Coverage Errors.

**Quality Gate**: All Target columns must show progressive improvement. No KPI may have identical Baseline and Target values. `Status` must be justified by the Delta. Total KPI count must be at least 15.

---

## Cross-Sheet Data Dependencies

The following table maps which sheets depend on data from other sheets. Agents must generate sheets in order, or at minimum ensure dependency sheets are complete before the dependent.

| Sheet | Depends On | What It Needs |
| :--- | :--- | :--- |
| 01 Executive Summary | 00 Baseline | Technical metrics, GBP status, backlink baseline |
| 02 Gap Analysis | 00, 03 | Baseline state for gap identification; competitor data for 02-B |
| 03 Competitor Analysis | 05 (partial) | Keyword overlaps with competitors |
| 04 12-Week Plan | 02, 05, 06 | Gap IDs to address; keywords to target each week; location pages to create |
| 05 Keyword Research | 03 | Competitor keyword intelligence informs keyword selection |
| 06 Location Pages | 05 | Location keywords must exist in Sheet 05 |
| 07 Citations | 00-C, 00-D | GBP status + existing backlinks as baseline |
| 08 YouTube | 05 | Each video must target a keyword from Sheet 05 |
| 09 Reddit/Quora | 05 | Engagement topics must align with Sheet 05 keywords |
| 11 Schema | 00-A, 05 | Page inventory from 00-A; keyword targets inform schema priority |
| 13 KPIs | All | Baseline values derived from 00, targets set against 04's milestones |

**Recommended generation order**: 00 → 03 → 05 → 02 → 06 → 07 → 04 → 01 → 08 → 09 → 10 → 11 → 12 → 13

---

## Skill-to-Column Mapping Reference

| Skill | Columns It Populates |
| :--- | :--- |
| `crawl-firecrawl` | 00-A (Page URL, Type, Title, Word Count, Issues), 11 (Page/Section), Internal link data |
| `gsc-fetch` | 00-A (GSC Impressions/Position/Clicks), 05 (Current Position, GSC Impressions, GSC CTR), 13 (Organic Traffic, CTR, Avg Position) |
| `ga4-fetch` | 13 (Conversion Rate, Bounce Rate, Session data) |
| `serper-miner` | 03 (Top Ranking Keywords, GBP Pack Rank), 05 (Competitor Ranking #1, SERP Features), 07-B (Target Domain discovery) |
| `rank-track` | 05 (Current Position — sustained tracking), 13 (Keyword Rankings) |
| `pagespeed-fetch` | 00-E (LCP/CLS/INP), 03 (Mobile Performance), 13 (Avg Page Load Time) |
| `schema-auditor` | 11 (Current Status, Validation URL), 00-A (Schema Types Present) |
| `index-checker` | 00-A (Indexing Status), 00-E (Indexed Pages count) |
| `sitemap-parser` | 00-E (Sitemap present, URL count), 00-A (Not In Sitemap flag) |
| `gbp-optimizer` | 00-C (GBP attributes), 10 (Review counts, ratings) |
| `snapshot-generator` | 13 (Baseline and Current values for traffic KPIs) |
| `auth-manager` | 01 (Setup Hurdles table — which keys are configured) |
