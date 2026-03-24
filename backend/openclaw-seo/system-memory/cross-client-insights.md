# Cross-Client SEO Insights — System Memory

This file captures recurring patterns, winning tactics, and failure modes observed across all active client companies. Updated by the seo-orchestrator when patterns emerge across 2+ clients. All insights are company-agnostic — never reference a client by name; describe the pattern.

---

## Insight 01 — Schema Drives Quick Wins Before Authority Builds

**Observed across**: Multiple clients in local service and B2B manufacturing sectors
**Pattern**: Clients with low domain authority (DA < 20) that implement FAQPage and LocalBusiness schema within the first 4 weeks see measurable CTR improvements (0.5–1.5pp) without ranking position changes. Schema-driven rich results provide SERP real estate parity with high-DA competitors on specific query types.
**Agent Rule**: Always prioritize schema implementation in Weeks 1-2 of the 12-Week Plan, regardless of DA. Schema is a quick win that does not depend on link equity.

---

## Insight 02 — B2B Industrial Clients Have Higher Value per Session, Lower Volume

**Observed across**: Manufacturing and industrial equipment clients
**Pattern**: These clients rarely have >5K monthly organic sessions but each conversion (quote request, contact form) has extremely high lifetime value. Standard traffic-growth KPIs undervalue their SEO ROI.
**Agent Rule**: For B2B industrial clients, weight conversion rate and lead quality metrics more heavily than raw traffic volume in the KPIs sheet. Always include "Quote Requests (Organic)" and "Contact Form Submissions (Organic)" as primary KPIs.

---

## Insight 03 — Hospitality Clients Are Highly Sensitive to Review Velocity

**Observed across**: Resort and hotel clients
**Pattern**: In the hospitality sector, a drop in review velocity (fewer new reviews per week) correlates with local pack ranking drops within 2-3 weeks, faster than any other signal type.
**Agent Rule**: For hospitality clients, review generation is a TOP-3 weekly task, not an afterthought. Monitor review velocity in the weekly snapshot. A drop of >30% in review velocity week-over-week is a CRITICAL signal requiring immediate review generation campaign activation.

---

## Insight 04 — Community-First Reddit Strategy Outperforms Link-Drop Approach

**Observed across**: All client types
**Pattern**: Reddit posts that provide genuine value (data, expert insight, personal experience) without immediate links generate 3-5x more engagement and referral traffic than posts that lead with a link. Accounts that build karma before linking are not flagged or shadow-banned.
**Agent Rule**: For new Reddit accounts, mandate 4+ karma-building value posts before any linked post. Track subreddit account age and karma in `about/profile.md` → `social_accounts` field.

---

## Insight 05 — GSC Data Lag Causes Planning Errors

**Observed across**: All clients
**Pattern**: Google Search Console data lags 2-4 days behind real-world performance. Weekly snapshot data taken on Sunday may reflect Thursday's reality. Drastic one-week drops that recover within 24-48 hours are often GSC indexing lag, not actual performance drops.
**Agent Rule**: Before flagging a GSC metric drop as CRITICAL, check if the drop began within the last 72 hours. If yes, reclassify as WARNING and re-check in the next daily snapshot cycle before creating a response task.

---

## Insight 06 — Long-Tail Keywords Convert at Higher Rates for Low-DA Sites

**Observed across**: New clients (DA < 25)
**Pattern**: For low-DA sites unable to compete on head terms, long-tail keywords (4+ words, KD < 30) consistently drive higher conversion rates despite lower volume. A visitor searching "hydraulic baling press manufacturer in Rajkot for paper waste" is 10x more likely to convert than one searching "baling press".
**Agent Rule**: For clients with DA < 25, Sheet 05 must have at least 15 long-tail keywords (not 10 minimum). The 12-Week Plan must prioritize long-tail content in Weeks 1-6.

---

## Insight 07 — Missing Business-Goals.md Causes Generic Strategy Output

**Observed across**: All clients
**Pattern**: When the research-analyst generates a strategy without a fully populated `memory/business-goals.md`, the output defaults to generic SEO tactics that don't reflect the client's actual competitive situation, geographic focus, or business model.
**Agent Rule**: `wf-company-onboarding` must not complete until `memory/business-goals.md` is populated with: actual KPI targets, identified local competitors (named), geographic target markets, and primary conversion events. The orchestrator must verify this file exists before triggering any strategy generation.

---

## Insight 08 — API-Missing Reports Are Not Useless

**Observed across**: All new clients during onboarding
**Pattern**: When GA4/GSC credentials are not yet set up, first reports are annotated with `[Data Missing]` throughout but are still valuable for strategic direction. Clients can begin technical fixes, content creation, and schema work immediately while credentials are being configured.
**Agent Rule**: Never block strategy report generation due to missing API credentials. An annotated report is better than no report. The Setup Hurdles table in Sheet 01 ensures the client sees exactly what to configure.
