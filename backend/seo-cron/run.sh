#!/usr/bin/env bash
#
# /home/dev/seo-cron/run.sh — OpenClaw SEO Orchestration Wrapper
#
# Lives OUTSIDE openclaw-seo and openclaw repos.
# Replaces the direct heartbeat.js crontab entry.
#
# What it does:
#   1. Unsets CLAUDECODE so nested claude invocations are not blocked
#   2. Runs heartbeat.js (one task per cycle, as designed)
#   3. Trims memory every TRIM_EVERY_N_CYCLES cycles to keep context lean:
#        - episodic-log.txt        → tail to EPISODIC_LOG_MAX_LINES
#        - cron.log                → tail to CRON_LOG_MAX_LINES
#        - task-queue.json         → archives completed/blocked tasks older than TASK_ARCHIVE_DAYS
#        - companies/*/memory/episodic.md → tail to COMPANY_EPISODIC_MAX_LINES
#        - wrapper.log (self)      → tail to WRAPPER_LOG_MAX_LINES
#
# Crontab (replace the existing entry):
#   30 * * * *  /home/dev/seo-cron/run.sh
#
# Manual run:
#   bash /home/dev/seo-cron/run.sh
#   bash /home/dev/seo-cron/run.sh --trim-now   # force a trim cycle regardless of counter
#

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEO_ROOT="/home/dev/openclaw-seo"
HEARTBEAT="$SEO_ROOT/runtime/heartbeat.js"
MEMORY_DIR="$SEO_ROOT/memory"

WRAPPER_LOG="$SCRIPT_DIR/wrapper.log"
STATE_FILE="$SCRIPT_DIR/wrapper-state.json"
LOCK_FILE="/tmp/seo-cron-wrapper.lock"

# ── Tuning ─────────────────────────────────────────────────────────────────────
TRIM_EVERY_N_CYCLES=24        # trim every 24 cycles (~12 h at 30 m interval)
EPISODIC_LOG_MAX_LINES=500
CRON_LOG_MAX_LINES=1000
COMPANY_EPISODIC_MAX_LINES=300
WRAPPER_LOG_MAX_LINES=800
TASK_ARCHIVE_DAYS=7           # archive completed/blocked tasks older than N days

# ── Logging ────────────────────────────────────────────────────────────────────
log() {
    local ts
    ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "[$ts] [WRAPPER] $*" | tee -a "$WRAPPER_LOG"
}

# ── Lock ───────────────────────────────────────────────────────────────────────
acquire_lock() {
    if [ -f "$LOCK_FILE" ]; then
        local mtime now age
        mtime=$(stat -c %Y "$LOCK_FILE" 2>/dev/null || echo 0)
        now=$(date +%s)
        age=$(( now - mtime ))
        if [ "$age" -lt 900 ]; then   # 15 min guard
            log "Another wrapper run is active (lock age: ${age}s). Skipping."
            exit 0
        fi
        log "Stale lock found (age: ${age}s). Clearing."
    fi
    echo $$ > "$LOCK_FILE"
}

release_lock() {
    rm -f "$LOCK_FILE"
}

# ── State ──────────────────────────────────────────────────────────────────────
read_cycle_count() {
    if [ -f "$STATE_FILE" ]; then
        python3 -c "
import json, sys
try:
    d = json.load(open('$STATE_FILE'))
    print(d.get('cycle_count', 0))
except:
    print(0)
"
    else
        echo 0
    fi
}

write_state() {
    local cycle="$1"
    local last_trim="$2"
    python3 -c "
import json
json.dump({'cycle_count': $cycle, 'last_trim': '$last_trim'}, open('$STATE_FILE','w'), indent=2)
"
}

# ── Trim helpers ───────────────────────────────────────────────────────────────
trim_file_lines() {
    local file="$1"
    local max="$2"
    local label="${3:-$file}"
    [ -f "$file" ] || return 0
    local lines
    lines=$(wc -l < "$file")
    if [ "$lines" -gt "$max" ]; then
        tail -n "$max" "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
        log "Trimmed $label: $lines → $max lines"
    fi
}

archive_old_tasks() {
    local qfile="$MEMORY_DIR/task-queue.json"
    [ -f "$qfile" ] || return 0

    local archive_dir="$MEMORY_DIR/task-archive"
    mkdir -p "$archive_dir"

    python3 - "$qfile" "$archive_dir" "$TASK_ARCHIVE_DAYS" << 'PYEOF'
import sys, json, os
from datetime import datetime, timezone

qfile, archive_dir, days = sys.argv[1], sys.argv[2], int(sys.argv[3])
cutoff = datetime.now(timezone.utc).timestamp() - days * 86400

try:
    queue = json.load(open(qfile))
except Exception as e:
    print(f"  [ARCHIVE] Could not read queue: {e}")
    sys.exit(0)

active, to_archive = [], []
for task in queue:
    if task.get('status') in ('completed', 'blocked', 'cancelled'):
        ts_str = task.get('updated_at') or task.get('created_at', '')
        try:
            ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00')).timestamp()
            if ts < cutoff:
                to_archive.append(task)
                continue
        except Exception:
            pass
    active.append(task)

if to_archive:
    date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    afile = os.path.join(archive_dir, f'archive-{date_str}.json')
    existing = []
    if os.path.exists(afile):
        try:
            existing = json.load(open(afile))
        except Exception:
            pass
    json.dump(existing + to_archive, open(afile, 'w'), indent=2)
    json.dump(active, open(qfile, 'w'), indent=4)
    print(f"  [ARCHIVE] Moved {len(to_archive)} task(s) → {os.path.basename(afile)}. Queue: {len(active)} active.")
else:
    print(f"  [ARCHIVE] Nothing to archive. Queue: {len(active)} active task(s).")
PYEOF

    # Also archive per-company queues (source of truth)
    for company_queue in "$SEO_ROOT/companies"/*/memory/tasks/queue.json; do
        [ -f "$company_queue" ] || continue

        # Extract slug from path: companies/<slug>/memory/tasks/queue.json
        company_slug=$(basename "$(dirname "$(dirname "$company_queue")")")
        company_archive_dir="$SEO_ROOT/companies/$company_slug/memory/tasks/archive"
        mkdir -p "$company_archive_dir"

        python3 - "$company_queue" "$company_archive_dir" "$TASK_ARCHIVE_DAYS" "$company_slug" << 'PYEOF2'
import sys, json, os
from datetime import datetime, timezone

qfile, archive_dir, days, slug = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
cutoff = datetime.now(timezone.utc).timestamp() - days * 86400

try:
    queue = json.load(open(qfile))
except Exception as e:
    print(f"  [ARCHIVE] Could not read {slug} queue: {e}")
    sys.exit(0)

active, to_archive = [], []
for task in queue:
    if task.get('status') in ('completed', 'blocked', 'cancelled'):
        ts_str = task.get('updated_at') or task.get('created_at', '')
        try:
            ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00')).timestamp()
            if ts < cutoff:
                to_archive.append(task)
                continue
        except Exception:
            pass
    active.append(task)

if to_archive:
    date_str = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    afile = os.path.join(archive_dir, f'archive-{date_str}.json')
    existing = []
    if os.path.exists(afile):
        try:
            existing = json.load(open(afile))
        except Exception:
            pass
    json.dump(existing + to_archive, open(afile, 'w'), indent=2)
    json.dump(active, open(qfile, 'w'), indent=4)
    print(f"  [ARCHIVE] {slug}: moved {len(to_archive)} task(s) → {slug}/memory/tasks/archive/. Queue: {len(active)} active.")
else:
    print(f"  [ARCHIVE] {slug}: nothing to archive. Queue: {len(queue)} task(s).")
PYEOF2
    done
}

run_trim() {
    log "── Memory trim starting ──"

    # Self (wrapper.log) — trim before the run to avoid infinite growth
    trim_file_lines "$WRAPPER_LOG"         "$WRAPPER_LOG_MAX_LINES"   "wrapper.log"

    # Heartbeat logs
    trim_file_lines "$MEMORY_DIR/episodic-log.txt" "$EPISODIC_LOG_MAX_LINES" "episodic-log.txt"
    trim_file_lines "$MEMORY_DIR/cron.log"         "$CRON_LOG_MAX_LINES"     "cron.log"

    # Task queue — archive stale completed/blocked tasks
    archive_old_tasks

    # Per-company episodic memory files
    for episodic in "$SEO_ROOT/companies"/*/memory/episodic.md; do
        [ -f "$episodic" ] || continue
        # Extract company slug for label
        local slug
        slug=$(basename "$(dirname "$(dirname "$episodic")")")
        trim_file_lines "$episodic" "$COMPANY_EPISODIC_MAX_LINES" "$slug/memory/episodic.md"
    done

    log "── Memory trim complete ──"
}

# ── Main ───────────────────────────────────────────────────────────────────────
main() {
    mkdir -p "$SCRIPT_DIR"
    acquire_lock
    trap release_lock EXIT

    # Prevent nested claude session blocking
    unset CLAUDECODE
    unset CLAUDE_CODE_ENTRYPOINT

    # Read state
    local cycle
    cycle=$(read_cycle_count)
    cycle=$(( cycle + 1 ))

    log "── Wrapper cycle $cycle starting ──"

    # Decide whether to trim
    local force_trim=false
    for arg in "$@"; do
        [ "$arg" = "--trim-now" ] && force_trim=true
    done

    local do_trim=false
    if [ "$force_trim" = true ] || [ "$cycle" -eq 1 ] || [ $(( cycle % TRIM_EVERY_N_CYCLES )) -eq 0 ]; then
        do_trim=true
    fi

    local last_trim
    if [ "$do_trim" = true ]; then
        run_trim
        last_trim="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    else
        last_trim=$(python3 -c "
import json
try:
    print(json.load(open('$STATE_FILE')).get('last_trim','never'))
except:
    print('never')
" 2>/dev/null || echo "never")
        local cycles_until
        cycles_until=$(( TRIM_EVERY_N_CYCLES - (cycle % TRIM_EVERY_N_CYCLES) ))
        log "Next trim in $cycles_until cycle(s) (last: $last_trim)"
    fi

    write_state "$cycle" "$last_trim"

    # Sanity check
    if [ ! -f "$HEARTBEAT" ]; then
        log "ERROR: heartbeat.js not found at $HEARTBEAT. Aborting."
        exit 1
    fi

    # Run heartbeat
    log "Running node heartbeat.js..."
    node "$HEARTBEAT"
    local exit_code=$?

    if [ "$exit_code" -eq 0 ]; then
        log "Heartbeat completed (exit 0)."
    else
        log "Heartbeat exited with code $exit_code. Check $MEMORY_DIR/cron.log for details."
    fi

    log "── Wrapper cycle $cycle complete ──"
}

main "$@"
