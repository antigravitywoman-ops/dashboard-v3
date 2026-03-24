# Data Flow Reference

> This document defines where each data type in the openclaw-seo system originates, how it's stored, and how it flows between agents.

---

## Data Origins Summary

| Data Type | Origin Agent | Storage Location | Update Frequency |
|-----------|-------------|-----------------|------------------|
| Tasks | seo-orchestrator | `companies/<slug>/memory/tasks/queue.json` (primary) + `memory/task-queue.json` (mirror) | On create/update |
| Weekly Plans | seo-orchestrator | `companies/<slug>/plans/active/` | Weekly |
| Reports | research-analyst | `companies/<slug>/reports/<YYYY-MM>/` | Monthly |
| Content | content-writer | `companies/<slug>/content/{status}/` | On write |
| Reviews | verification-agent | `companies/<slug>/reviews/` | On complete |
| Technical Audits | data-intelligence | `companies/<slug>/technical/audits/` | On audit |
| Chat Sessions | Any agent/human | `companies/<slug>/memory/chat/` | On session |
| Snapshots | seo-orchestrator | `companies/<slug>/memory/snapshots/` | Daily/Weekly |

---

## Data Flow Diagrams

### Task Lifecycle

```
seo-orchestrator (heartbeat)
    │
    ▼
Create Task ──────────────────────────────┐
    │                                      │
    ▼                                      ▼
Add to per-company queue              Update company
(companies/<slug>/memory/tasks/     queue.json (per-company
 queue.json) primary source          — primary)
    │                                      │
    ├─► Mirror to global queue             │
    │   (memory/task-queue.json)           │
    ▼                                      ▼
Assign to Agent ─────────────────────── Agent picks up task
    │                                      │
    ▼                                      ▼
Update status: in-progress         Execute task
    │                                      │
    ├─► Progress updates (streaming)       │
    │                                      │
    ▼                                      ▼
Complete/Block/Fail ──────────────── Update both queues
    │                                      │
    ├─► Move to history/<YYYY-MM>/        │
    └─► Archive if needed                 │
```

> **Note**: The per-company queue (`companies/<slug>/memory/tasks/queue.json`) is the source of truth for all task operations. The global queue (`memory/task-queue.json`) is maintained as a mirror for cross-company orchestration. The dashboard API (`GET /api/companies/:slug/tasks`) reads exclusively from the per-company queue.

### Content Pipeline

```
content-writer
    │
    ▼
Write content ──────────────────────────┐
(companies/<slug>/content/pending-publish/)│
    │                                      │
    ▼                                      │
Create .meta.json ───────────────────────┤
    │                                      │
    ▼                                      │
content-gate (validation)                 │
    │                                      │
    ├─► PASSED ──► content-publisher      │
    │                    │                 │
    │                    ▼                 │
    │              Update .meta.json       │
    │              (gate_status: passed)   │
    │                    │                 │
    └─► FAILED ──► Move to rejected/       │
                                      │
                                      ▼
                              CMS publish
                                      │
                                      ▼
                              Update meta.json
                              (status: published)
                                      │
                                      ▼
                              verification-agent
                                      │
                                      ▼
                              Update review metadata
```

---

## Folder Structure Reference

```
companies/<slug>/
├── about/                    # Static company info (READ-ONLY after init)
│   └── *.md + *.meta.json
├── content/                  # Content pipeline
│   ├── pending-publish/
│   ├── in-review/
│   ├── approved/
│   ├── published/
│   └── rejected/
│       └── *.md + *.meta.json
├── memory/                   # Long-term memory
│   ├── chat/
│   │   ├── sessions/
│   │   │   └── <session-id>.json
│   │   ├── context.json     # Current context
│   │   └── history.md       # Session summary
│   ├── tasks/
│   │   ├── queue.json       # Current company tasks
│   │   └── history/
│   │       └── <YYYY-MM>/
│   │           └── all.json
│   ├── snapshots/
│   │   └── snapshot-*.json
│   ├── sheets/              # 14-sheet analysis (generated)
│   │   └── *.md
│   ├── episodic.md         # Session memory
│   ├── episodic-log.txt     # Timestamped log
│   └── context-digest.md   # Lightweight summary
├── plans/                   # Weekly plans
│   ├── active/
│   │   └── <YYYY-WNN>.md + *.meta.json
│   └── archive/
├── reports/                 # Generated reports
│   └── <YYYY-MM>/
│       ├── manifest.json
│       ├── sheets/
│       │   └── *.md + *.meta.json
│       └── validation/
├── reviews/                 # Content reviews
│   └── *.md + *.meta.json
└── technical/              # Technical audits
    ├── audits/
    │   └── *.json + *.meta.json
    └── issues-log.md
```

---

## Global vs. Company Storage

### Global Storage (System-Wide)
- `memory/task-queue.json` — All pending/in-progress tasks
- `memory/heartbeat-state.json` — Orchestrator state
- `memory/episodic-log.txt` — Global action log
- `runtime/companies.json` — Active company registry
- `system-memory/` — Cross-client insights

### Per-Company Storage
All other data is stored per-company in `companies/<slug>/`.

---

## API Endpoints Reference

| Data Type | Endpoint | Method |
|-----------|----------|--------|
| Tasks (all) | `/api/tasks` | GET |
| Tasks (company) | `/api/tasks/:slug` | GET |
| Content | `/api/content/:slug` | GET |
| Plans | `/api/plans/:slug` | GET |
| Reports | `/api/reports/:slug` | GET |
| Reviews | `/api/reviews/:slug` | GET |
| Technical | `/api/technical/:slug` | GET |
| Chat | `/api/chat/:slug` | GET/POST |

---

## Update Frequency by Data Type

| Data Type | Created By | When Updated | Frequency |
|-----------|------------|--------------|-----------|
| Tasks | seo-orchestrator | Task lifecycle events | Per task |
| Content | content-writer | On write | Per content |
| Plans | seo-orchestrator | Weekly build | Weekly |
| Reports | research-analyst | Monthly generation | Monthly |
| Reviews | verification-agent | Post-execution | Per task |
| Chat | Any agent | Per session | Per conversation |
| Snapshots | seo-orchestrator | Heartbeat | Daily |
