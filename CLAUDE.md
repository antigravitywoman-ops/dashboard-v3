# OpenClaw SEO — Platform Development Guide

## Platform Architecture

This is a **three-subsystem monorepo**:

| Subsystem | Path | Purpose |
|---|---|---|
| **Agent Runtime** | `backend/openclaw-seo/` | Heartbeat-driven SEO automation (cron every 30 min) |
| **Dashboard API** | `backend/seo-dashboard-api/` | Express API server (port 3456) |
| **Frontend** | `frontend/seo-dashboard/` | Next.js dashboard (port 3000) |

### Agent Runtime Structure

```
backend/openclaw-seo/
├── runtime/
│   ├── heartbeat.js        ← Primary orchestrator (cron-driven)
│   ├── heartbeat.js        ← Secondary (legacy, simpler)
│   └── companies.json      ← Active/paused company registry
├── agents/                 ← Agent persona files (.md)
├── skills/                 ← 30+ skills (each: SKILL.md + scripts/)
├── workflows/              ← 12 workflow SOPs (.md)
├── references/             ← Schemas, data flows
├── companies/             ← Per-company workspaces (SOURCE OF TRUTH)
│   └── <slug>/
│       ├── memory/tasks/queue.json   ← Primary task queue
│       ├── plans/active/             ← Plans
│       └── content/                  ← Content pipeline
├── memory/                 ← Global: task-queue.json, heartbeat-state.json
└── AGENTS.md              ← Canonical agent + routing registry
```

### Dashboard API

- Port 3456. Reads workspace files directly (no DB for company data)
- Routes map URL paths → filesystem under `companies/<slug>/`
- Proxied through Vite as `/api`

### Frontend

- Next.js 14 App Router, TypeScript, TanStack Query v5
- 5-minute polling for live updates (`refetchInterval: 5 * 60 * 1000`)
- Provider chain: SessionProvider → QueryClientProvider → CompanyProvider

---

## Platform Development Agents

Two agents for developing and maintaining this platform itself:

### `/platform-dev` — Internal Developer

Develop or improve the OpenClaw SEO platform: agent runtime, skills, API, frontend.

**Usage**: Type `/platform-dev` followed by your instruction.

**Example invocations**:
- `/platform-dev add a new agent called content-curator`
- `/platform-dev fix the task routing in heartbeat.js`
- `/platform-dev create a new API route for /companies/:slug/analytics`
- `/platform-dev improve the heartbeat cycle performance`
- `/platform-dev add a new frontend page for the review inbox`

### `/code-review` — Architecture Reviewer

Validate platform code for consistency, regressions, and system invariants.

**Usage**: Type `/code-review` followed by what to review.

**Example invocations**:
- `/code-review heartbeat.js — check all dispatch tables`
- `/code-review AGENTS.md routing table vs heartbeat.js`
- `/code-review full platform audit of all critical tables`

---

## Development Rules

1. **NEVER modify `companies/*/` workspace files** — those belong to domain agents
2. **Always read before writing** — understand existing patterns first
3. **Keep tables in sync** — heartbeat.js has 6 tables that must all agree
4. **Log all changes** — update `backend/openclaw-seo/runtime/CHANGELOG.md`
5. **Verify before claiming done** — JSON parses, TypeScript compiles, paths resolve

### Adding a Heartbeat Agent

1. Create `agents/<name>.md`
2. Create `skills/<name>/SKILL.md`
3. Add to `heartbeat.js`: `MODEL_BY_AGENT`, `BUDGET_BY_AGENT`, `SKILLS_BY_AGENT`, `TOOLS_BY_AGENT`, `TASK_LABELS`
4. Update `AGENTS.md` — routing table + YAML entry
5. Log in `CHANGELOG.md`

### Adding an API Route

1. Create `seo-dashboard-api/src/routes/<name>.js`
2. Map URL → filesystem path: `path.join(OPENCLAW_DIR, 'companies', slug, ...)`
3. Add auth middleware
4. Mount in `seo-dashboard-api/src/index.js`
5. Log in `CHANGELOG.md`
