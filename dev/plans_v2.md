# OpenClaw SEO — Development Plan v2

**Created:** 2026-03-24
**Status:** Active — Platform Maintenance
**Supersedes:** plans_v1.md

> **Frontend work is in `plans_v3_frontend_redesign.md`** — that is the current priority.

## Goals
Maintain and extend the three-subsystem platform (backend/API).

## In Progress
- [ ] Dev tooling improvements (dev/ folder for platform versioning)

## Planned (Backend)
- [ ] Performance improvements to heartbeat cycle
- [ ] Additional API routes for analytics
- [ ] Frontend review inbox page

## Development Rules
1. **NEVER modify `companies/*/` workspace files** — those belong to domain agents
2. **Always read before writing** — understand existing patterns first
3. **Keep tables in sync** — heartbeat.js has 6 tables that must all agree
4. **Log all changes** — update `backend/openclaw-seo/runtime/CHANGELOG.md` AND `dev/CHANGELOG.md`
5. **Verify before claiming done** — JSON parses, TypeScript compiles, paths resolve
