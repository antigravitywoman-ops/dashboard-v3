# Metadata Schemas Reference

> This document defines the `.meta.json` schema for every file type in the company folder.
> All agents MUST generate these metadata files when creating or modifying content.

## Quick Reference Table

| Folder | File Pattern | Metadata File | When to Generate |
|--------|-------------|--------------|-----------------|
| `content/{status}/` | `*.md` | `*.meta.json` | On content creation |
| `technical/audits/` | `*.json` | `*.meta.json` | After audit completes |
| `reports/{period}/sheets/` | `*.md` | `*.meta.json` | After sheet validation |
| `plans/active/` | `*.md` | `*.meta.json` | After plan generation |
| `about/` | `*.md` | `*.meta.json` | During onboarding |
| `reviews/` | `*.md` | `*.meta.json` | After review completion |
| `memory/chat/sessions/` | `*.json` | `*.meta.json` | After each chat session |
| `memory/tasks/` | `*.json` | - | Created by orchestrator |

---

## 1. Content Metadata (`content/{status}/*.meta.json`)

**When to generate:**
- `content-writer` creates this when writing a new draft
- `content-publisher` updates this when status changes

```json
{
  "title": "string - extracted from first H1 or task context",
  "type": "string - blog-post|landing-page|product-page|service-page|location-page",
  "status": "string - pending-publish|in-review|approved|published|rejected",
  "word_count": "number - actual word count of content",
  "seo_score": "number|null - 0-100, set after SEO analysis",
  "target_url": "string|null - URL where content will be published",
  "author": "string - content-writer or team name",
  "gap_id": "string|null - associated gap from gap-analysis sheet",
  "week_target": "string|null - e.g., 'Week 1' from twelve-week-plan",
  "priority": "string|null - CRITICAL|HIGH|MEDIUM|LOW from task context",
  "keywords": "array - target keywords from task context",
  "summary": "string|null - One-sentence description (max 150 chars) of the content's topic and purpose. Displayed in dashboard content cards.",
  "highlights": "array - Key takeaways from this piece (3-5 items, max 80 chars each). Displayed as badges in dashboard content cards.",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp",
  "published_at": "ISO 8601 timestamp|null - set when published",
  "gate_status": "string - pending|passed|failed",
  "gate_notes": "string|null - notes from gate validation",
  "publishing_status": "string|null - pipeline progress: idle|pending|gate-checking|publishing|verifying|done",
  "publishing_task_id": "string|null - task ID of the active publish task",
  "publishing_error": "string|null - error message if publish fails"
}
```

> **Important**: Always populate `summary` and `highlights` when creating content metadata. These are the primary fields the SEO dashboard uses to display content cards. Extract `summary` from the article's main angle in 1 sentence. Extract `highlights` from the 3-5 most important points or sections.

---

## 2. Technical Audit Metadata (`technical/audits/*.meta.json`)

**When to generate:**
- `audit-enricher` skill (run automatically after `crawl-browser` or `crawl-firecrawl` completes)
- `seo-orchestrator` or `data-intelligence` after technical audit task completes

```json
{
  "audit_type": "string - full-site|page-specific|schema|page-speed",
  "crawl_timestamp": "ISO 8601 timestamp",
  "pages_crawled": "number — from crawl output (pages.length or crawl_meta.total_pages)",
  "total_issues": "number",
  "critical": "number",
  "high": "number",
  "medium": "number",
  "low": "number",
  "fixed": "number",
  "health_score": "number - 0-100 (0=critical, 70+=good)",
  "meta_summary": "string - one-sentence health summary (max 200 chars). Used in dashboard health card.",
  "highlights": "array - 3-5 key findings as short phrases (max 80 chars each). Displayed as badges in dashboard.",
  "scope_flags": {
    "linkedin_active": "boolean",
    "reddit_active": "boolean",
    "quora_active": "boolean",
    "medium_syndication_active": "boolean",
    "gbp_posts_active": "boolean",
    "youtube_active": "boolean",
    "image_generation_active": "boolean",
    "ahrefs_active": "boolean"
  },
  "tool": "string - firecrawl|pagespeed|schema-auditor|crawl-browser",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

> **Important**: The `health_score`, `meta_summary`, and `highlights` fields are produced by the `audit-enricher` skill and are required by the SEO dashboard. The raw crawl output from `crawl-browser` does not include these fields — always run `audit-enricher` after a crawl completes.

---

## 3. Report Sheet Metadata (`reports/{period}/sheets/*.meta.json`)

**When to generate:**
- `research-analyst` after generating each sheet
- Updated after `sheet-validator` passes

```json
{
  "sheet_number": "number - 0-13",
  "sheet_name": "string - full sheet name",
  "sheet_id": "string - e.g., '02-gap-analysis'",
  "period": "string - YYYY-MM format",
  "content_hash": "string|null - MD5 hash for change detection",
  "validation_status": "string - pending|passed|failed",
  "validation_errors": "array|null - list of validation errors",
  "summary": "string|null - One-sentence description (max 150 chars) of what this sheet covers. Displayed in dashboard report cards.",
  "highlights": "array - Key findings or data points from this sheet (3-5 items, max 80 chars each). Displayed as badges in dashboard.",
  "keywords_count": "number|null - from keyword research sheet",
  "competitors_analyzed": "number|null - from competitor analysis",
  "gaps_identified": "number|null - from gap analysis",
  "tasks_generated": "number|null - from twelve-week-plan",
  "data_sources": "array - skills used to generate content (e.g. ['ga4', 'gsc', 'serper-miner'])",
  "linked_sheets": "array - sheet IDs cross-referenced in this sheet",
  "generated_at": "ISO 8601 timestamp|null - when the sheet was generated",
  "generated_by": "string|null - agent/script that generated this sheet",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

> **Important**: Always populate `summary` and `highlights` when generating sheet metadata. These are the primary fields the SEO dashboard uses to display report sheet cards. Extract `summary` from the sheet's main topic in 1 sentence. Extract `highlights` from the 3-5 most notable data points or insights.

---

## 4. Weekly Plan Metadata (`plans/active/*.meta.json`)

**When to generate:**
- `seo-orchestrator` after `build-plan` task completes

```json
{
  "week": "string - YYYY-WNN format, e.g., '2026-W12'",
  "week_start": "ISO 8601 timestamp|null",
  "week_end": "ISO 8601 timestamp|null",
  "status": "string - draft|active|completed|archived",
  "total_tasks": "number",
  "completed_tasks": "number",
  "pending_tasks": "number",
  "blocked_tasks": "number",
  "focus_areas": "array - primary focus areas",
  "gaps_addressed": "array - gap IDs being worked on",
  "priority_tasks": "array - critical task IDs",
  "summary": "string|null - One-sentence description (max 150 chars) of this week's main objective and approach. Displayed in dashboard plans cards.",
  "highlights": "array - Key task highlights or milestones for this week (3-5 items, max 80 chars each). Displayed as badges in dashboard.",
  "notes": "string|null",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp",
  "last_heartbeat_at": "ISO 8601 timestamp|null"
}
```

> **Important**: Always populate `summary` and `highlights` when creating or updating weekly plan metadata. Extract `summary` from the plan's `## This Week's Focus` section (first sentence). Extract `highlights` from the top 3-5 priority tasks or focus areas. The `summary` feeds the dashboard's plans card display.

---

## 5. About File Metadata (`about/*.meta.json`)

**When to generate:**
- During company onboarding
- When about files are updated

> **Important**: The `summary` and `highlights` fields are used by the dashboard frontend to display
> file previews in card format. Always populate these when generating or updating about files.

```json
{
  "category": "string - profile|brand-voice|audience|competitors|keywords|goals|scope|access",
  "last_reviewed": "ISO 8601 timestamp|null",
  "review_status": "string - pending|approved|needs-update",
  "linked_sheets": "array - sheet IDs this file relates to",
  "version": "number",
  "author": "string|null",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp",
  "summary": "string|null - One-sentence description of this file's content. Displayed in dashboard cards.",
  "highlights": "array - Key bullet points (3-5 items) extracted from the file. Displayed as badges in dashboard."
}
```

### About File Summary & Highlights Extraction

When generating or updating an about file, extract:

**`summary`**: A single sentence (max 150 chars) summarizing what the file contains.
**`highlights`**: An array of 3-5 key takeaways, formatted as short phrases (max 80 chars each).

Example for `audience.md`:
```json
{
  "summary": "Three target audience personas covering aspirational achievers, UPSC candidates, and personal growth readers.",
  "highlights": [
    "Primary: Overwhelmed achievers 26-35 seeking purpose",
    "High-intent: UPSC aspirants needing structured mentorship",
    "Secondary: Voracious non-fiction readers seeking authentic voices"
  ]
}
```

---

## 6. Review Metadata (`reviews/*.meta.json`)

**When to generate:**
- `verification-agent` after completing review
- `content-publisher` after human review
- Dashboard frontend on human approval/rejection

```json
{
  "review_type": "string - content-review|technical-review|on-page-review|schema-review",
  "target_url": "string|null",
  "status": "string - pending|approved|rejected|needs-changes",
  "score": "number|null - 0-100",
  "issues_found": "number",
  "issues_resolved": "number",
  "reviewer": "string - agent name or 'human'",
  "target_item": "string|null - associated content file or task ID",
  "summary": "string|null - One-sentence description (max 150 chars) of what this review found overall. Displayed in dashboard review cards.",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp",
  "highlights": "array - Key findings extracted from the review (3-6 items, max 120 chars each)",
  "humanReadableSummary": {
    "whatWasChecked": "string - Brief description of what was verified (plain language)",
    "whatPassed": "array - List of items that passed verification (max 3, max 60 chars each)",
    "whatFailed": "array - List of items that failed (max 3, max 60 chars each)",
    "nextAction": "string - Single action-oriented sentence on what needs to happen"
  },
  "human_decision": "string|null - 'approved'|'rejected'|null - Set by human reviewer via dashboard",
  "human_comment": "string|null - Rejection reason provided by human reviewer",
  "human_reviewer": "string|null - Name/email of human reviewer",
  "human_decision_at": "string|null - ISO 8601 timestamp of human decision",
  "decision_processed_at": "string|null - ISO 8601 timestamp - Set by seo-orchestrator after processing the decision",
  "decision_processed_by": "string|null - 'seo-orchestrator'|null - Set by seo-orchestrator to prevent re-processing"
}
```

### Human-Readable Summary Guidelines

The `humanReadableSummary` field provides a non-technical summary for dashboard display. It should:

- **whatWasChecked**: One to two sentences in plain language describing the verification scope
- **whatPassed**: Maximum 3 items, each under 60 characters, non-technical
- **whatFailed**: Maximum 3 items, each under 60 characters, focused on the key issues
- **nextAction**: Single action-oriented sentence indicating what needs to happen next

This enables stakeholders to understand review results without reading the full technical report.

---

## 7. Chat Session Metadata (`memory/chat/sessions/*.meta.json`)

**When to generate:**
- After each chat session ends
- Updated during streaming for real-time context

```json
{
  "session_id": "string - unique session identifier",
  "initiator": "string - human|agent",
  "participant": "string - agent name or 'human'",
  "company": "string - company slug",
  "message_count": "number - total messages in session",
  "started_at": "ISO 8601 timestamp",
  "ended_at": "ISO 8601 timestamp|null",
  "status": "string - active|completed|interrupted",
  "context_used": "array - memory files accessed during session",
  "tasks_created": "array - task IDs created from this session",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

### Chat Session File Structure

```
memory/chat/
├── sessions/
│   ├── <session-id>.json       # Full conversation log
│   └── <session-id>.meta.json # Session metadata
├── context.json                 # Current active context
└── history.md                  # Summary of recent sessions
```

### Individual Chat Message Format (`sessions/<session-id>.json`)

```json
{
  "session_id": "string",
  "messages": [
    {
      "id": "uuid",
      "role": "user|assistant|system",
      "content": "string",
      "timestamp": "ISO 8601 timestamp",
      "attachments": ["array of file paths if any"]
    }
  ],
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

---

## 8. Task History (`memory/tasks/*.json`)

**When to generate:**
- When task queue changes state
- Created and managed by seo-orchestrator

### Task Queue (Current Tasks)

`memory/tasks/queue.json`:
```json
{
  "company": "string - company slug",
  "pending": ["array of task IDs"],
  "in_progress": ["array of task IDs"],
  "updated_at": "ISO 8601 timestamp"
}
```

### Task History File

`memory/tasks/history/<YYYY-MM>/all.json`:
```json
{
  "period": "2026-03",
  "company": "string",
  "tasks": [
    {
      "id": "task-<company>-<type>-<timestamp>",
      "type": "string",
      "status": "pending|in-progress|pending-verification|completed|blocked|cancelled",
      "assigned_to": "string",
      "priority": "string",
      "created_at": "ISO 8601 timestamp",
      "completed_at": "ISO 8601 timestamp|null",
      "result": "string|null"
    }
  ],
  "created_at": "ISO 8601 timestamp"
}
```

---

## Agent Responsibilities

| Agent | Creates | Updates |
|-------|---------|---------|
| `content-writer` | Content metadata | - |
| `content-publisher` | - | Content metadata on publish/status change |
| `research-analyst` | Sheet metadata | Sheet metadata on validation |
| `verification-agent` | Review metadata (initial), humanReadableSummary | Review metadata on human decision |
| `seo-orchestrator` | Audit metadata, Plan metadata, Task queue | Plan metadata, Task history on completion, Review metadata (decision_processed_at/by after processing human decisions) |
| `dashboard-frontend` | - | Review metadata on human approval/rejection via PATCH API |
| `onboarding` | About metadata, Chat folder | - |
| `any agent` | Chat session metadata | Chat context during execution |
| `meta-audit` | — | Sheet, content, audit, and review metadata (fixes missing fields, stale timestamps, invalid formats) |

---

## Auto-Generation

For bulk operations or recovery, use the meta-generator skill:

```bash
# Generate metadata for all files in a company
python skills/meta-generator/scripts/meta-generator.py <company-slug>

# Create folder structure only
python skills/meta-generator/scripts/meta-generator.py <company-slug> --folders
```

---

## Timestamps

All timestamps MUST be in ISO 8601 format:
- ✅ `"2026-03-18T12:00:00Z"`
- ❌ `"March 18, 2026"`
- ❌ `"2026-03-18 12:00:00"` (missing timezone)
