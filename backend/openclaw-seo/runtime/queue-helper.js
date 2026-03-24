#!/usr/bin/env node
/**
 * queue-helper.js
 *
 * Convenience wrapper for company queue + meta.json operations.
 * Used by agents during heartbeat invocations and CLI operations.
 *
 * Usage:
 *   node runtime/queue-helper.js <slug> <action> [args...]
 *
 * Actions:
 *   read                 — print current queue as JSON
 *   write <json>         — write queue (full array)
 *   create-task <json>  — append a new task to queue (auto-sets hover_label)
 *   update-task <id> <json> — update a specific task by id
 *   complete-task <id>  — mark a task completed
 *   block-task <id> <reason> — mark a task blocked
 *   sync-meta           — sync queue counts to active .meta.json
 *   history-add <task-json> — append completed task to monthly history
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function now() { return new Date().toISOString(); }

// ── hover_label derivation ──────────────────────────────────────────────────

const TASK_LABELS = {
    'generate-report': 'Generate Report',     'sheet-fix': 'Fix Sheet',
    'validate-sheets': 'Validate Sheets',     'excel-generation': 'Generate Excel',
    'daily-snapshot': 'Daily Snapshot',         'technical-audit': 'Technical Audit',
    'content-publish': 'Publish Content',      'content-refresh': 'Refresh Content',
    'content-refresh-publish': 'Refresh & Publish',
    'website-edit': 'Website Edit',             'company-onboard': 'Company Onboard',
    'human-review': 'Human Review',             'delta-evaluation': 'Delta Evaluation',
    'build-plan': 'Build Plan',                'update-deps': 'Update Dependencies',
    'content-draft': 'Draft Content',           'content-refresh-draft': 'Refresh Draft',
    'schema-inject': 'Inject Schema',           'on-page-fix': 'On-Page Fix',
    'blog-post': 'Blog Post',                   'metadata-audit': 'Metadata Audit',
    'generate': 'Generate',                     'process-review-decision': 'Process Review',
    'process-human-review': 'Process Human Review',
    'distribute-content': 'Distribute Content',
};

/**
 * Derive hover_label from task type + context.
 * Auto-called by create-task to ensure every task has a label.
 */
function deriveHoverLabel(task) {
    const type = task.type || '';
    const ctx  = task.context || {};

    if (type === 'content-draft' || type === 'content-refresh-draft') {
        if (ctx.keyword)    return `${TASK_LABELS[type] || type}: "${ctx.keyword}"`;
        if (ctx.target_url) return `${TASK_LABELS[type] || type}: ${ctx.target_url}`;
    }

    if (type === 'website-edit' || type === 'on-page-fix' || type === 'schema-inject') {
        if (ctx.gap_id)      return `${TASK_LABELS[type] || type}: ${ctx.gap_id}`;
        if (ctx.target_url)  return `${TASK_LABELS[type] || type}: ${ctx.target_url}`;
        if (ctx.fix_type)   return `${TASK_LABELS[type] || type}: ${ctx.fix_type}`;
    }

    if (type === 'generate-report' && ctx.period)     return `${TASK_LABELS[type] || type} — ${ctx.period}`;
    if (type === 'technical-audit' && ctx.report_period) return `${TASK_LABELS[type] || type} — ${ctx.report_period}`;
    if (type === 'human-review' && ctx.target)           return `Human Review: ${ctx.target}`;
    if (type === 'content-publish' || type === 'content-refresh-publish') {
        if (ctx.draft_filename) return `${TASK_LABELS[type] || type}: ${ctx.draft_filename}`;
        if (ctx.target_keyword) return `${TASK_LABELS[type] || type}: keyword "${ctx.target_keyword}"`;
    }

    return TASK_LABELS[type] || type || 'Unknown Task';
}

function tasksDir(slug) {
    return path.join(ROOT, 'companies', slug, 'memory', 'tasks');
}

function queuePath(slug) {
    return path.join(tasksDir(slug), 'queue.json');
}

function historyDir(slug) {
    const ym = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
    return path.join(tasksDir(slug), 'history', ym);
}

function historyPath(slug) {
    return path.join(historyDir(slug), 'all.json');
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function loadQueue(slug) {
    const fpath = queuePath(slug);
    if (!fs.existsSync(fpath)) {
        ensureDir(tasksDir(slug));
        fs.writeFileSync(fpath, '[]');
        return [];
    }
    return JSON.parse(fs.readFileSync(fpath, 'utf-8'));
}

function saveQueue(slug, queue) {
    ensureDir(tasksDir(slug));
    fs.writeFileSync(queuePath(slug), JSON.stringify(queue, null, 4));
}

function getCurrentWeek() {
    const now = new Date();
    const thursday = new Date(now);
    thursday.setDate(now.getDate() + (4 - now.getDay()));
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const weekNum = Math.ceil((((thursday - yearStart) / 86400000) + 1) / 7);
    return thursday.getFullYear() + '-W' + String(weekNum).padStart(2, '0');
}

function getActiveMetaPath(slug) {
    const plansDir = path.join(ROOT, 'companies', slug, 'plans', 'active');
    if (!fs.existsSync(plansDir)) return null;
    const files = fs.readdirSync(plansDir).filter(f => f.endsWith('.meta.json'));
    if (!files.length) return null;
    files.sort();
    return path.join(plansDir, files[files.length - 1]);
}

function syncMeta(slug) {
    const queue = loadQueue(slug);
    const metaPath = getActiveMetaPath(slug);
    if (!metaPath) {
        console.error('[queue-helper] No active .meta.json for ' + slug);
        return;
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    meta.total_tasks       = queue.length;
    meta.completed_tasks  = queue.filter(t => t.status === 'completed').length;
    meta.pending_tasks    = queue.filter(t => t.status === 'pending').length;
    meta.blocked_tasks    = queue.filter(t => t.status === 'blocked').length;
    meta.in_progress_tasks = queue.filter(t => t.status === 'in-progress').length;
    meta.progress_percent = queue.length > 0
        ? Math.round((meta.completed_tasks / meta.total_tasks) * 100)
        : 0;
    meta.last_heartbeat_at = now();
    meta.updated_at = now();
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 4));
    console.log('[queue-helper] Synced meta for ' + slug + ': ' + meta.completed_tasks + '/' + meta.total_tasks + ' tasks, ' + meta.progress_percent + '%');
}

function addToHistory(slug, task) {
    ensureDir(historyDir(slug));
    const histPath = historyPath(slug);
    let hist;
    if (fs.existsSync(histPath)) {
        hist = JSON.parse(fs.readFileSync(histPath, 'utf-8'));
    } else {
        const ym = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
        hist = { period: ym, company: slug, tasks: [], created_at: now(), updated_at: now() };
    }
    hist.tasks = hist.tasks.filter(t => t.id !== task.id); // avoid duplicates
    hist.tasks.push({
        id: task.id,
        type: task.type,
        status: task.status,
        assigned_to: task.assigned_to,
        priority: task.priority,
        created_at: task.created_at,
        completed_at: task.completed_at || null,
        result: task.result || null,
    });
    hist.updated_at = now();
    fs.writeFileSync(histPath, JSON.stringify(hist, null, 4));
    console.log('[queue-helper] Added task ' + task.id + ' to history');
}

// ── Main ──────────────────────────────────────────

const [slug, action, ...args] = process.argv.slice(2);

if (!slug || !action) {
    console.error('Usage: node runtime/queue-helper.js <slug> <action> [args...]');
    process.exit(1);
}

try {
    switch (action) {
        case 'read': {
            const q = loadQueue(slug);
            console.log(JSON.stringify(q, null, 2));
            break;
        }
        case 'write': {
            const data = args.join(' ');
            const queue = JSON.parse(data);
            saveQueue(slug, queue);
            console.log('[queue-helper] Queue written for ' + slug + ' (' + queue.length + ' tasks)');
            break;
        }
        case 'create-task': {
            const taskJson = args.join(' ');
            const task = JSON.parse(taskJson);
            const queue = loadQueue(slug);
            const existing = queue.find(t => t.id === task.id);
            if (existing) {
                console.log('[queue-helper] Task ' + task.id + ' already exists — skipping');
            } else {
                // Auto-set hover_label so agents don't need to compute it
                if (!task.hover_label) {
                    task.hover_label = deriveHoverLabel(task);
                }
                queue.push(task);
                saveQueue(slug, queue);
                console.log('[queue-helper] Task ' + task.id + ' added to queue (' + queue.length + ' total)');
            }
            syncMeta(slug);
            break;
        }
        case 'update-task': {
            const [taskId, ...rest] = args;
            const updates = JSON.parse(rest.join(' '));
            const queue = loadQueue(slug);
            const task = queue.find(t => t.id === taskId);
            if (!task) { console.error('[queue-helper] Task not found: ' + taskId); process.exit(1); }
            Object.assign(task, updates, { updated_at: now() });
            saveQueue(slug, queue);
            console.log('[queue-helper] Task ' + taskId + ' updated');
            syncMeta(slug);
            if (task.status === 'completed') addToHistory(slug, task);
            break;
        }
        case 'complete-task': {
            const [taskId, ...rest] = args;
            const result = rest.join(' ');
            const queue = loadQueue(slug);
            const task = queue.find(t => t.id === taskId);
            if (!task) { console.error('[queue-helper] Task not found: ' + taskId); process.exit(1); }
            task.status = 'completed';
            task.updated_at = now();
            task.completed_at = now();
            task.result = result || 'Completed via queue-helper';
            saveQueue(slug, queue);
            console.log('[queue-helper] Task ' + taskId + ' marked completed');
            syncMeta(slug);
            addToHistory(slug, task);
            break;
        }
        case 'block-task': {
            const [taskId, ...rest] = args;
            const reason = rest.join(' ') || 'Blocked via queue-helper';
            const queue = loadQueue(slug);
            const task = queue.find(t => t.id === taskId);
            if (!task) { console.error('[queue-helper] Task not found: ' + taskId); process.exit(1); }
            task.status = 'blocked';
            task.updated_at = now();
            task.result = reason;
            saveQueue(slug, queue);
            console.log('[queue-helper] Task ' + taskId + ' blocked: ' + reason);
            syncMeta(slug);
            break;
        }
        case 'sync-meta': {
            syncMeta(slug);
            break;
        }
        case 'history-add': {
            const taskJson = args.join(' ');
            const task = JSON.parse(taskJson);
            addToHistory(slug, task);
            break;
        }
        default:
            console.error('Unknown action: ' + action);
            process.exit(1);
    }
} catch (e) {
    console.error('[queue-helper] Error:', e.message);
    process.exit(1);
}
