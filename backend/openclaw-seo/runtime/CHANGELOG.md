# OpenClaw SEO Platform — Changelog

> All changes to the platform itself (agent runtime, API, frontend) must be logged here.
> Changes to company workspace files (content, plans, tasks) do NOT go here.

Format:
```markdown
## YYYY-MM-DD — [platform-dev] <brief description>

**Files changed**: comma-separated list of relative paths
**Reason**: why this was needed
**Before**: what existed before
**After**: what was changed
```

---

## 2026-03-24 — [platform-dev] Added platform-dev and code-review platform development agents

**Files changed**: agents/platform-dev.md, agents/code-review.md, skills/platform-dev/SKILL.md, skills/code-review/SKILL.md, runtime/CHANGELOG.md, runtime/heartbeat.js, AGENTS.md, .claude/settings.json (project), CLAUDE.md (project)
**Reason**: New platform development workflow with dedicated internal developer and code review agents
**Before**: No internal developer agent existed; platform changes required manual editing
**After**: Two new platform agents — platform-dev (invoked via /platform-dev slash) for development, code-review (invoked via /code-review slash or heartbeat task) for architecture validation. Registered as custom agents in project-level .claude/settings.json. CLAUDE.md at project root documents the workflow.
