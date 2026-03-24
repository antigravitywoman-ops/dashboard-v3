---
name: content-gate
description: "Validates a pending-publish or approved draft against structural, quality, and semantic SEO standards before releasing it to the content-publisher. Acts as the automated checkpoint between Brain (content-writer) and Hands (content-publisher). Returns a structured pass/fail JSON. Use when: the orchestrator needs to evaluate a completed draft before routing a content-publish task, OR when a manual dashboard publish triggers the gate for content in approved/. NOT for: evaluating live published pages (use verification-agent), generating content (use blog-generate)."
metadata:
  {
    "openclaw": {
      "emoji": "🚦",
      "requires": { "bins": ["node"] }
    }
  }
---

# CONTENT GATE Skill

Validates a draft file and returns a structured pass/fail result. This is the quality checkpoint between the Brain (content-writer) and the Hands (content-publisher). No draft may be published without a gate result of pass: true.

**Supports two draft locations**:
- `companies/<slug>/content/pending-publish/<task-id>.md` — automated pipeline (content-writer output)
- `companies/<slug>/content/approved/<task-id>.md` — manual dashboard publish

## Quick Start

Automated pipeline (default — reads from pending-publish):
    cd scripts/ && node content-gate.js <company-slug> --task-id=<task-id>

Manual dashboard publish (reads from approved/):
    cd scripts/ && node content-gate.js <company-slug> --task-id=<task-id> --draft-path=approved/<task-id>.md

**Parameters**:
- `--task-id` (required): The task ID (used to name the gate result file as `<task-id>-gate.json`)
- `--draft-path` (optional): Relative path from `companies/<slug>/content/`, e.g. `pending-publish/<task-id>.md` or `approved/<task-id>.md`. Defaults to `pending-publish/<task-id>.md` if not specified.

## When NOT to Use

Do NOT use this skill when:
- Evaluating a live published page — use verification-agent instead
- Generating content — use blog-generate
- Refreshing metadata only (no content body) — gate is not required for meta-only changes

## Input

Reads from `companies/<slug>/content/<draft-path>` (default: `pending-publish/<task-id>.md`)

The draft file must have valid frontmatter including:
- task_id
- company
- target_keyword
- cms_type
- meta_title
- meta_description
- word_count_target (optional — falls back to defaults)

## Output

Writes gate result to: companies/<slug>/content/gate-results/<task-id>-gate.json
(Gate result file name is always based on task_id, regardless of which folder the draft is in)

Returns a JSON object:

    {
      "task_id": "<task-id>",
      "company": "<slug>",
      "timestamp": "<ISO>",
      "pass": true,
      "word_count": 1842,
      "h2_count": 4,
      "h3_count": 7,
      "internal_link_count": 3,
      "has_cta": true,
      "meta_title_length": 58,
      "meta_description_length": 152,
      "keyword_in_title": true,
      "keyword_in_first_paragraph": true,
      "findings": []
    }

If pass: false, the findings array contains one or more failure objects:

    {
      "rule": "word_count_minimum",
      "severity": "critical",
      "detail": "Draft is 980 words. Minimum for informational intent is 1200."
    }

## Validation Rules

### Critical Failures (any one causes pass: false)

| Rule | Check | Threshold |
|---|---|---|
| word_count_minimum | Body word count | Informational: >= 1200. Commercial: >= 1800 |
| h2_structure | Number of H2 headings | Minimum 3 H2s |
| cta_present | Post contains a specific, non-generic CTA | Must not be only "Contact us" or "Learn more" without context |
| meta_title_length | meta_title character length | 10–60 characters |
| meta_description_length | meta_description character length | 50–160 characters |
| keyword_in_title | target_keyword or close variant in meta_title | Required |
| draft_file_valid | File exists, has frontmatter, has body content | Required |

### Warning Findings (do not block publish, but written to findings)

| Rule | Check |
|---|---|
| internal_links_low | Fewer than 2 internal links detected in body |
| keyword_in_first_paragraph | target_keyword not found in first 150 words |
| h3_depth | No H3 headings under any H2 (shallow structure) |
| no_schema_candidates | No Q&A patterns detected when FAQPage could apply |
| word_count_thin | Under 1500 words for a commercial intent post |

## Rules

- This skill only reads files. It does NOT modify the draft.
- After writing the gate result JSON, update the task in `companies/<slug>/memory/tasks/queue.json` (per-company queue — source of truth):
  - If pass: true — set gate_status: passed in the task context
  - If pass: false — set gate_status: failed and add gate_findings to context
- The orchestrator reads gate_status to decide whether to route to content-publisher or back to content-writer
- Never pass a draft that fails any critical rule, even if the failure seems minor
- A warning-only result is still pass: true — warnings are informational only

## Retry Logic (for orchestrator)

If gate returns pass: false:
- Iteration 1: Route back to content-writer with gate_findings in context — content-writer fixes and re-saves. For automated pipeline: save to pending-publish/. For manual dashboard publish: save back to the same folder (approved/).
- Iteration 2: Same as iteration 1
- Iteration 3: Route to human-review — the content-writer could not produce a gate-passing draft in 3 attempts

**For manual dashboard publishes**: The gate_findings context is still useful — a human editor can fix the issues directly in the approved/ folder before re-triggering publish.
