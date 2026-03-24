# Environment & Infrastructure Notes

## Remote VM Access

All terminal commands are executed on a **GCP VM** (not locally).

- **SSH Connection:** `ssh dev@34.44.215.245`
- **Provider:** Google Cloud Platform (GCP)
- **User:** `dev`

> IMPORTANT: Before executing any shell commands, assume the context is this remote VM unless stated otherwise.

---

## Git Configuration

- **Repository:** `https://github.com/antigravitywoman-ops/vm-backend-v2.git`
- **Clone URL (with PAT):** `https://<GITHUB_PAT>@github.com/antigravitywoman-ops/vm-backend-v2.git`
- **Local Path on VM:** `~/vm-backend-v2/`
- **PAT:** `<your-github-pat>`

---

## Dev Logging & State Sync

Claude Code (native install) and the OpenClaw heartbeat system write multiple state/log files on the VM. This section maps every file worth syncing for local dev visibility.

### Quick Sync

Run locally from the repo root to pull all logs into `dev-logs/`:

```powershell
.\scripts\sync-vm-logs.ps1
```

Watch mode (syncs every 60 seconds):

```powershell
.\scripts\sync-vm-logs.ps1 -Watch -Interval 60
```

The script prints a **task queue digest** + **heartbeat state** + **last 10 debug lines** after every sync — no need to open files manually.

---

## File Map: What to Sync & Why

### A. OpenClaw Application State (`~/openclaw-seo/`)

These are the files the agentic system itself generates and reads:

| File | Purpose | Sync Priority |
|------|---------|---------------|
| `memory/heartbeat-state.json` | Last heartbeat timestamp + total API cost | 🔴 Every sync |
| `memory/task-queue.json` | All tasks: pending / in_progress / completed. Includes agent assignment, company, result | 🔴 Every sync |
| `memory/episodic-log.txt` | Append-only narrative log with every `[HEARTBEAT]` cycle event | 🔴 Every sync |
| `memory/cron.log` | Raw cron execution trace | 🟡 Every sync |
| `runtime/companies.json` | Active company list fed into heartbeat | 🟡 Every sync |
| `system-memory/*.md` | Algorithm updates, platform rules, cross-client insights (rarely changes) | 🟢 Daily / on demand |

### B. Claude Code Internal Files (`~/.claude/`)

These are what Claude Code itself writes during interactive sessions:

| File | Purpose | Sync Priority |
|------|---------|---------------|
| `debug/latest` (symlink) | **Human-readable transcript** of the current or most recent Claude Code session. Shows every tool call, thinking block, assistant response | 🔴 Every sync |
| `debug/<uuid>.txt` | Previous session transcripts (UUID-named). Keep last 3-5 | 🟡 Weekly or on demand |
| `projects/-home-dev/<uuid>.jsonl` | **Structured conversation log** (JSONL). Each line = one message turn (role, content, timestamps, model, git branch). This is the source of truth for what Claude said/did | 🔴 Latest; 🟡 others |
| `history.jsonl` | Command palette history — every prompt the user typed, timestamped | 🟡 Every sync |
| `.claude.json` | Global config and startup state (numStartups, feature flags, API key state) | 🟢 Daily |

### C. Shell Snapshots (`~/.claude/shell-snapshots/`)

| File | Purpose | Sync Priority |
|------|---------|---------------|
| `snapshot-bash-*.sh` | Snapshot of bash env (aliases, functions, PATH) at session start. Useful for debugging env drift | 🟢 On demand |

---

## Understanding the JSONL Conversation Log

The file `~/.claude/projects/-home-dev/<session-uuid>.jsonl` is the richest log. Each line is a JSON object:

```json
// User turn
{ "type": "user", "message": { "role": "user", "content": "..." }, "timestamp": "...", "sessionId": "..." }

// Assistant turn  
{ "type": "assistant", "message": { "role": "assistant", "content": [...], "model": "claude-sonnet-4-6" }, "timestamp": "..." }

// File snapshot (undo point)
{ "type": "file-history-snapshot", "snapshot": { "trackedFileBackups": {} } }
```

To read the latest session log on the VM:

```bash
ssh dev@34.44.215.245 "python3 -c \"
import json, sys
for line in open('/home/dev/.claude/projects/-home-dev/8e4941e1-d5f1-472c-9189-beaaa3c0f5bb.jsonl'):
    d = json.loads(line)
    if d.get('type') == 'user':
        print('USER:', d['message']['content'][:200])
    elif d.get('type') == 'assistant':
        for block in d.get('message',{}).get('content',[]):
            if block.get('type') == 'text':
                print('CLAUDE:', block['text'][:200])
\""
```

---

## Claude Code Session UUIDs

| Session UUID | Date | Notes |
|---|---|---|
| `8e4941e1-d5f1-472c-9189-beaaa3c0f5bb` | 2026-03-12 | Latest/active — heartbeat & VM overview session (~360KB) |
| `402af375-9df0-4161-8701-272bc0585191` | 2026-03-06 | Older session (~27KB) |
| `1d7727eb-637d-4042-a306-4718fbf889d1` | 2026-03-06 | Older session |

> Update this table as new sessions are created. Each new `claude` invocation generates a new UUID.

---

## Local Dev-Logs Directory Structure

After running the sync script, `dev-logs/` will contain:

```
dev-logs/
├── claude/
│   ├── .claude.json            ← global config state
│   ├── debug/
│   │   └── latest.txt          ← current session transcript (human readable)
│   ├── history/
│   │   └── history.jsonl       ← command palette history
│   └── projects/
│       └── *.jsonl             ← structured conversation logs
└── openclaw/
    ├── memory/
    │   ├── heartbeat-state.json
    │   ├── task-queue.json
    │   ├── episodic-log.txt
    │   └── cron.log
    ├── runtime/
    │   └── companies.json
    └── system-memory/
        ├── algorithm-updates.md
        ├── platform-rules.md
        └── cross-client-insights.md
```

> `dev-logs/` is gitignored — it only exists on the local machine.

---

## Common Dev Workflows

### See what Claude is currently doing

```powershell
# Sync once and read the digest
.\scripts\sync-vm-logs.ps1

# Or live tail on VM
ssh dev@34.44.215.245 "tail -f /home/dev/openclaw-seo/memory/episodic-log.txt"
```

### See pending tasks

```powershell
# After sync
Get-Content .\dev-logs\openclaw\memory\task-queue.json | ConvertFrom-Json | Format-Table company, type, status, priority
```

### See full last 20 CLI prompts typed to Claude

```powershell
Get-Content .\dev-logs\claude\history\history.jsonl | ForEach-Object { $_ | ConvertFrom-Json } | Select-Object -Last 20 | Format-Table timestamp, display
```

### See what the latest Claude session said (locally, after sync)

```powershell
Get-Content (Get-Item ".\dev-logs\claude\projects\*.jsonl" | Sort-Object LastWriteTime -Descending | Select-Object -First 1) |
  ForEach-Object { $_ | ConvertFrom-Json } |
  Where-Object { $_.type -eq 'user' } |
  Select-Object timestamp, @{N='prompt';E={$_.message.content}} |
  Format-Table -Wrap
```