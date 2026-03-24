---
name: wf-auto-remediate
description: "MANUAL WORKFLOW: Guides the SEO Lead (Human) or Web Developer through executing the fixes flagged by the weekly data-intelligence audits. Focuses on resolving 404s, redirect chains, and schema markup gaps."
trigger: manual
---

# MANUAL Workflow: Auto-Remediate (Technical Execution)

This is a human-in-the-loop workflow. Automated agents identify the exact technical breakpoints on the website (like 404 links or schema missing required fields), but a human must execute the server-side fixes or CMS adjustments to ensure safe deployment.

---

## Step 1 — Review the Issues Log

**Actor**: `SEO Lead / Web Developer (Human)`
**Source**: `companies/<slug>/technical/issues-log.md`

1. Open the issues log generated during the `wf-technical-audit` run.
2. Filter for items marked as `CRITICAL` or `WARNING`. Look specifically for:
    - 404 Not Found (Internal Links).
    - Missing JSON-LD properties (Schema Errors).
    - Broken External Links (Found by `broken-link-scanner`).

---

## Step 2 — Execute Redirects

**Actor**: `SEO Lead / Web Developer (Human)`
**Tools**: CMS Dashboard, Redirection Plugin (WordPress), `.htaccess`, or NGINX config.

1. **Internal 404s**: 
    - Determine if the page moved (requires a 301 Redirect to the new URL) or if the link should be removed.
    - Implement the 301 redirect via the server configuration or CMS plugin. Test the old URL to confirm it loops to the new destination.
2. **Redirect Chains**: 
    - Identify chains of 3+ hops.
    - Point the origin URL directly to the final destination URL, stripping out the intermediate hops to preserve Server Crawl Budget.

---

## Step 3 — Patch Schema Gaps

**Actor**: `Web Developer (Human)`
**Tools**: CMS Dashboard, Code Editor, or Schema Generator Tool.

1. Locate the pages flagged by the `schema-auditor` as missing `@type` or required fields (like `price` for Product, or `acceptedAnswer` for FAQPage).
2. Generate the corrected JSON-LD payload.
3. Inject the corrected schema into the `<head>` of the specific page via the CMS or page template.
4. Pass the URL through the Google Rich Results Test tool manually to verify validation passes.

---

## Step 4 — Log Completions

**Actor**: `SEO Lead (Human)`
**Target**: `companies/<slug>/technical/issues-log.md`

1. Strike through the resolved issues in the `issues-log.md`.
2. Append `[RESOLVED + Date]` next to the line item.
3. This signals to the next `wf-technical-audit` run that the issue was actively patched, providing cleaner tracking metrics.
