---
name: wf-website-execution
description: "Master workflow for applying targeted website edits (content, schemas, or structural fixes). Features mandatory state-capture before the edit and pipes the completed edit into the pending-verification state."
trigger: task-driven (via seo-orchestrator)
---

# Workflow: Careful Website Execution

This workflow is injected into the executing worker agent (typically `content-writer`) whenever a technical fix or content refresh task is issued by the orchestrator.

## Step 1 — Pre-Edit State Capture
**Agent**: executing worker

Before initiating any changes to the target URL or CMS:
- Fetch the exact current live content or CMS data.
- Save this state verbatim to `companies/<slug>/memory/change-log/<YYYY-MM-DD-HHMM>-<url-slug>-before.md`.
- Ensure this backup contains meta properties, main body text, and any JSON-LD active on the page.

If you fail to capture this state, **abort** the task immediately and write `blocked: no-state-capture` to the task log. Do NOT proceed to edit without a snapshot.

## Step 2 — Careful Execution
**Agent**: executing worker

- Execute the changes mandated by the task context (e.g., adding a specific FAQ section, rewriting the title tag, injecting schema).
- Use the provided deep skills (`cms-wordpress`, `blog-update`, etc.).
- Ensure your changes strictly follow the "Deep Semantic Execution" protocols required by your agent definition. Do not use procedural loops or filler text.

## Step 3 — Verification Handoff
**Agent**: executing worker

- Once the edit is successfully pushed, DO NOT mark the task as `completed`.
- Instead, update the task in `companies/<slug>/memory/tasks/queue.json` as follows:
  - `"status": "pending-verification"`
  - `"result_path": "<url of the modified page>"`
  - `"backup_path": "companies/<slug>/memory/change-log/<timestamp>-before.md"`
  - `"assigned_to": "verification-agent"`
- Write a short summary of the execution to `memory/episodic-log.txt`.

## Step 4 — Rollback Reversion (Triggered by Orchestrator)
**Agent**: executing worker (or orchestrator)

If the Verification Agent rejects the execution (changes the task to `rolling-back`):
- Read the content stored in the `backup_path` created during Step 1.
- Push the exact, unmodified backup data back to the CMS to restore the page to its original form.
- Mark the task `status: failed-validation-rolled-back`.
- Add an explicit alert entry to the episodic log for the human owner to review.
