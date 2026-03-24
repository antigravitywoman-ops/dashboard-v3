---
name: code-review
description: "Review OpenClaw SEO platform code for architectural consistency and system invariants. Invoked via /code-review slash command or heartbeat-dispatched code-review task."
---

# Code Review Skill

Use this skill when the operator invokes `/code-review <description>` or when a `code-review` task is dispatched from heartbeat.

## When to Use

- `/code-review heartbeat.js` — validate all dispatch tables for consistency
- `/code-review AGENTS.md` — verify routing table matches heartbeat.js
- `/code-review <file>` — review a specific platform file
- `code-review` task from heartbeat — full platform audit
- Before merging any platform change (if there was a merge workflow)

## How to Execute

1. Read `agents/code-review.md` for the full review checklist
2. Read the specified file(s)
3. Run through each checklist item
4. Output the review report in the format defined by the agent persona
5. If asked to fix issues, fix one at a time and log each fix to `runtime/CHANGELOG.md`

## Review Priorities

| Priority | Issue Type | Action |
|---|---|---|
| ERROR | Missing model entry, broken skill path, orphaned task type | Must fix before continuing |
| WARN | Inconsistent naming, suboptimal pattern, missing error handling | Should fix |
| INFO | Intentional unusual pattern, minor style difference | Note and explain |

## Output

Always produce the structured review report defined in `agents/code-review.md`.
