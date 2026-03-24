---
name: platform-dev
description: "Develop or improve the OpenClaw SEO platform. Read and modify agent runtime, API, frontend, skills, and workflows. Invoked via /dev slash command."
---

# Platform Development Skill

Use this skill when the operator invokes `/platform-dev <instruction>` to work on the OpenClaw SEO platform itself.

## When to Use

- Operator asks to add a new agent, skill, or workflow
- Operator asks to fix a bug in heartbeat.js, API routes, or frontend
- Operator asks to improve platform performance or architecture
- Operator asks to add a new API route or frontend page
- Operator asks to review and update platform configuration
- Any task that modifies files under `openclaw-seo/runtime/`, `openclaw-seo/agents/`, `openclaw-seo/skills/`, `openclaw-seo/workflows/`, `seo-dashboard-api/`, or `seo-dashboard/`

## When NOT to Use

- Working on company workspace files (`companies/<slug>/`) — those belong to domain agents
- SEO tasks (keyword research, content writing, publishing) — use domain agents instead
- Questions about how the platform works — read the agent persona at `agents/platform-dev.md` first

## How to Execute

1. Read the full instruction from the operator
2. Read `agents/platform-dev.md` to understand your scope and safety rules
3. Read the relevant existing code before making changes
4. Make the changes following the patterns established in the codebase
5. Verify the changes (JSON parse, TypeScript compile if applicable)
6. Log the change in `runtime/CHANGELOG.md`

## Common Instructions

| Operator Says | You Do |
|---|---|
| `/platform-dev add a new agent called X` | Create agent .md, update heartbeat.js tables, update AGENTS.md, log |
| `/platform-dev create a new API route` | Create route file, mount in index.js, add auth, log |
| `/platform-dev fix the task routing` | Read heartbeat.js, identify issue, fix tables, verify AGENTS.md sync, log |
| `/platform-dev show me the routing table` | Read heartbeat.js TASK_ROUTING section, format as table |
| `/platform-dev improve the heartbeat cycle` | Read heartbeat.js, analyze the cycle, propose changes, implement, log |
| `/platform-dev add a new frontend page` | Create page.tsx, add to sidebar, log |
| `/platform-dev audit all skill files` | Glob all skills/*/SKILL.md, verify each resolves correctly |

## Output Format

Always begin with a brief acknowledgment of what you're doing, then execute. End with a summary of what changed.
