# OpenClaw SEO — Developer Context

**IMPORTANT:** Read this file before working on the platform.

## Quick Reference

| Item | Location |
|------|----------|
| Platform dev instructions | `CLAUDE.md` |
| Runtime changelog | `backend/openclaw-seo/runtime/CHANGELOG.md` |
| Dev changelog | `dev/CHANGELOG.md` |
| Agent registry | `backend/openclaw-seo/AGENTS.md` |
| Frontend redesign plan | `dev/plans_v3_frontend_redesign.md` |

## Key Commands

```bash
# Start dashboard API (port 3456)
cd backend/seo-dashboard-api && npm start

# Start frontend (port 3000)
cd frontend/seo-dashboard && npm run dev

# Run heartbeat manually
cd backend/openclaw-seo && node runtime/heartbeat.js
```

## Critical Tables in heartbeat.js
All 6 tables must stay in sync when adding/modifying agents:
- `MODEL_BY_AGENT`
- `BUDGET_BY_AGENT`
- `SKILLS_BY_AGENT`
- `TOOLS_BY_AGENT`
- `TASK_LABELS`
- Routing entries in `AGENTS.md`

## Adding a Heartbeat Agent (5 steps)
1. Create `agents/<name>.md`
2. Create `skills/<name>/SKILL.md`
3. Add to heartbeat.js: all 6 tables above
4. Update `AGENTS.md` — routing table + YAML entry
5. Log in both CHANGELOG.md files

## Adding an API Route (5 steps)
1. Create `seo-dashboard-api/src/routes/<name>.js`
2. Map URL → filesystem path: `path.join(OPENCLAW_DIR, 'companies', slug, ...)`
3. Add auth middleware
4. Mount in `seo-dashboard-api/src/index.js`
5. Log in both CHANGELOG.md files
