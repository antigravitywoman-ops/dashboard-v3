/**
 * openclaw-seo Heartbeat Bridge
 *
 * Scope enforcement + dependency awareness:
 *   - loadScopeFlags(slug) parses companies/<slug>/about/scope.md operator flags
 *   - loadMissingDeps(slug) parses companies/<slug>/about/missing-dependencies.md
 *   - Scope flags injected into every task context before agent invocation
 *   - Distribution channels hard-filtered against scope flags before content-publisher
 *   - Tasks that require missing HIGH-priority credentials are blocked before invocation
 *
 * Human Review Inbox:
 *   - HUMAN tasks write a review file and park as waiting-human (no Claude invocation)
 *   - Step 0 scans pending review files for operator responses each heartbeat
 *   - Responses routed to seo-orchestrator as process-human-review tasks
 *
 * Cron: every 30 minutes
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT           = path.join(__dirname, '..');
const MEMORY_DIR     = path.join(ROOT, 'memory');
const QUEUE_FILE     = path.join(MEMORY_DIR, 'task-queue.json');
const LOG_FILE       = path.join(MEMORY_DIR, 'episodic-log.txt');
const COMPANIES_FILE = path.join(__dirname, 'companies.json');
const LOCK_FILE      = '/tmp/openclaw-heartbeat.lock';
const STATE_FILE     = path.join(MEMORY_DIR, 'heartbeat-state.json');
const MIGRATED_FLAG  = path.join(MEMORY_DIR, '.company-queues-migrated');

const BUDGET_BY_AGENT = {
    'seo-orchestrator':  1.00,
    'data-intelligence': 1.50,
    'research-analyst':  3.00,
    'content-writer':    2.50,
    'content-publisher': 1.00,
    'excel-porter':      1.00,
    'verification-agent':1.00,
    'code-review':       0.75,
    'default':           1.00,
};

const MODEL_BY_AGENT = {
    'seo-orchestrator':  'claude-opus-4-6',
    'research-analyst':  'claude-opus-4-6',
    'data-intelligence': 'claude-sonnet-4-6',
    'content-writer':    'claude-sonnet-4-6',
    'content-publisher': 'claude-haiku-4-5-20251001',
    'excel-porter':      'claude-haiku-4-5-20251001',
    'verification-agent':'claude-sonnet-4-6',
    'code-review':       'claude-sonnet-4-6',
    'default':           'claude-sonnet-4-6',
};

const SKILLS_BY_AGENT = {
    'seo-orchestrator':  ['auth-manager', 'snapshot-generator', 'sheet-validator', 'backup-sweeper', 'content-gate'],
    'research-analyst':  ['serper-miner', 'gsc-fetch', 'ga4-fetch', 'rank-track', 'sheet-validator', 'crawl-firecrawl', 'schema-auditor'],
    'data-intelligence': ['gsc-fetch', 'ga4-fetch', 'rank-track', 'snapshot-generator', 'report-generator'],
    'excel-porter':      ['excel-porter', 'sheet-validator'],
    'content-writer':    ['blog-generate', 'blog-update', 'meta-optimizer', 'serper-miner', 'crawl-firecrawl', 'content-curator'],
    'content-publisher': ['cms-wordpress', 'cms-editor-generic', 'wpcli-manager', 'post-reddit', 'post-quora', 'post-linkedin', 'post-medium', 'auth-manager'],
    'verification-agent':['crawl-firecrawl', 'crawl-browser', 'schema-auditor'],
    'code-review':       [],
};

const TOOLS_BY_AGENT = {
    'seo-orchestrator':  'Read,Write,Bash,Glob,Grep',
    'research-analyst':  'Read,Write,Bash,Glob,Grep',
    'data-intelligence': 'Read,Write,Bash,Glob,Grep',
    'excel-porter':      'Read,Write,Bash',
    'content-writer':    'Read,Write,Bash,Glob,Grep',
    'content-publisher': 'Read,Write,Bash',
    'verification-agent':'Read,Write,Bash,Glob,Grep',
    'code-review':       'Read,Write,Bash,Glob,Grep',
    'default':           'Read,Write,Glob,Grep',
};

// Which credentials must be present (as 'present' in missing-deps) for a task to run.
// If any listed dep has status 'missing', the task is blocked before Claude is invoked.
const TASK_REQUIRED_DEPS = {
    'content-publish':          ['WP_SITE_URL', 'WP_APP_PASSWORD'],
    'content-refresh-publish':  ['WP_SITE_URL', 'WP_APP_PASSWORD'],
    'technical-audit':          ['FIRECRAWL_API_KEY'],
};

// Maps distribution channel names to scope.md operator flag names.
// Channels whose flag is false are stripped from distribution_channels before invocation.
const CHANNEL_SCOPE_FLAGS = {
    'reddit':   'reddit_active',
    'quora':    'quora_active',
    'linkedin': 'linkedin_active',
    'medium':   'medium_syndication_active',
    'youtube':  'youtube_active',
};

// Credentials required per distribution channel.
// If any are 'missing' in missing-deps, that channel is stripped even if scope flag is true.
const CHANNEL_REQUIRED_DEPS = {
    'reddit':   ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'REDDIT_REFRESH_TOKEN'],
    'linkedin': ['LINKEDIN_ACCESS_TOKEN'],
    'medium':   ['MEDIUM_INTEGRATION_TOKEN'],
    'quora':    ['QUORA_SESSION_TOKEN'],
};

const DELTA_EVAL_COOLDOWN_MINUTES = 25;
const TASK_TIMEOUT_MS = 60 * 60 * 1000;
const REVIEW_MARKER = '<!-- OPERATOR RESPONSE -->';

// Human-readable labels for each task type
const TASK_LABELS = {
    'generate-report':          'Generate Report',
    'sheet-fix':                'Fix Sheet',
    'validate-sheets':           'Validate Sheets',
    'excel-generation':          'Generate Excel',
    'daily-snapshot':            'Daily Snapshot',
    'technical-audit':          'Technical Audit',
    'content-publish':          'Publish Content',
    'content-refresh':           'Refresh Content',
    'content-refresh-publish':   'Refresh & Publish',
    'website-edit':              'Website Edit',
    'company-onboard':           'Company Onboard',
    'human-review':              'Human Review',
    'delta-evaluation':           'Delta Evaluation',
    'build-plan':                'Build Plan',
    'update-deps':               'Update Dependencies',
    'content-draft':             'Draft Content',
    'content-refresh-draft':     'Refresh Draft',
    'schema-inject':             'Inject Schema',
    'on-page-fix':               'On-Page Fix',
    'blog-post':                 'Blog Post',
    'metadata-audit':            'Metadata Audit',
    'generate':                  'Generate',
    'process-review-decision':    'Process Review',
    'process-human-review':       'Process Human Review',
    'distribute-content':         'Distribute Content',
    'code-review':                'Code Review',
};

/**
 * Derive a human-readable hover_label from task type + context.
 * Used at task creation time so the label is stored, not recomputed.
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

    if (type === 'generate-report') {
        if (ctx.period) return `${TASK_LABELS[type] || type} — ${ctx.period}`;
    }

    if (type === 'content-publish' || type === 'content-refresh-publish') {
        if (ctx.draft_filename) return `${TASK_LABELS[type] || type}: ${ctx.draft_filename}`;
        if (ctx.target_keyword) return `${TASK_LABELS[type] || type}: keyword "${ctx.target_keyword}"`;
    }

    if (type === 'technical-audit') {
        if (ctx.report_period) return `${TASK_LABELS[type] || type} — ${ctx.report_period}`;
    }

    if (type === 'human-review') {
        if (ctx.target) return `Human Review: ${ctx.target}`;
    }

    if (type === 'process-review-decision') {
        if (ctx.review_filename) return `${TASK_LABELS[type] || type}: ${path.basename(ctx.review_filename)}`;
    }

    if (type === 'process-human-review') {
        if (ctx.original_task_id) return `${TASK_LABELS[type] || type}: ${ctx.original_task_id}`;
    }

    if (type === 'delta-evaluation') {
        return `${TASK_LABELS[type] || type} — ${new Date().toLocaleDateString()}`;
    }

    return TASK_LABELS[type] || type || 'Unknown Task';
}

// ─────────────────────────────────────────────
// Lock
// ─────────────────────────────────────────────

function acquireLock() {
    try {
        if (fs.existsSync(LOCK_FILE)) {
            const lockAge = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
            if (lockAge < TASK_TIMEOUT_MS + 60_000) {
                logEvent('[LOCK] Another heartbeat cycle is running. Skipping.');
                return false;
            }
            logEvent('[LOCK] Stale lock found. Clearing.');
        }
        fs.writeFileSync(LOCK_FILE, String(process.pid));
        return true;
    } catch (e) {
        logEvent('[LOCK] Could not acquire lock: ' + e.message);
        return false;
    }
}

function releaseLock() { try { fs.unlinkSync(LOCK_FILE); } catch (_) {} }

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────

function loadState() {
    try { if (fs.existsSync(STATE_FILE)) return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch (_) {}
    return { last_delta_eval: null, total_cost_usd: 0, last_reports: {} };
}

function saveState(state) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─────────────────────────────────────────────
// Report Scheduling — based on active-plan.json cadence
// ─────────────────────────────────────────────

/**
 * Determine the current period string (YYYY-WNN or YYYY-MM) based on cadence.
 * Returns null if the company should not generate reports (paused).
 */
function getCurrentPeriod(cadence, now) {
    const year = now.getFullYear();
    if (cadence === 'weekly' || cadence === 'week') {
        // ISO week number
        const startOfYear = new Date(year, 0, 1);
        const weekNum = Math.ceil(
            ((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
        );
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
    }
    // monthly (default)
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Check whether a report is due for a company based on its active-plan.json.
 * Returns the period string if due, null otherwise.
 */
function isReportDue(slug, state) {
    const planPath = path.join(ROOT, 'companies', slug, 'plans', 'active', 'active-plan.json');
    if (!fs.existsSync(planPath)) {
        return null; // No plan — no scheduled reports
    }

    let plan;
    try {
        plan = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
    } catch (_) {
        return null;
    }

    // Check if company is paused
    if (plan.company_status === 'paused' || plan.company_status === 'inactive') {
        return null;
    }

    // Read cadence from plan (default: weekly)
    const cadence = plan.report_cadence || plan.cadence || 'weekly';

    // Determine current period
    const now = new Date();
    const currentPeriod = getCurrentPeriod(cadence, now);

    // Check last report time for this company
    const lastReports = state.last_reports || {};
    const lastReport = lastReports[slug];

    if (lastReport && lastReport.period === currentPeriod) {
        // Already generated a report for this period
        // For weekly cadence: only once per week
        // For monthly cadence: only once per month
        const cooldownDays = cadence === 'monthly' ? 28 : 6;
        const daysSince = lastReport.generated_at
            ? (Date.now() - new Date(lastReport.generated_at).getTime()) / 86400000
            : Infinity;
        if (daysSince < cooldownDays) {
            return null; // Still within cooldown
        }
        // Re-generate if cooldown passed
        logEvent(`[REPORT] Report cooldown passed for ${slug} (${currentPeriod}). Re-generating.`);
        return currentPeriod;
    }

    // No report yet for this period
    return currentPeriod;
}

/**
 * Enqueue a generate-report task for each company that is due.
 * Returns the number of tasks enqueued.
 */
function scheduleDueReports(activeCompanies, queue) {
    const state = loadState();
    const tasksAdded = [];
    const now = new Date().toISOString();

    for (const company of activeCompanies) {
        const slug = company.slug || company;

        // Skip companies already in queue with a pending generate-report task
        if (queue.some(t => t.company === slug && t.type === 'generate-report' && ['pending', 'in-progress'].includes(t.status))) {
            continue;
        }

        const period = isReportDue(slug, state);
        if (!period) continue;

        const taskId = `task-generate-report-${slug}-${Date.now()}`;
        const context = {
            period,
            force_refresh_snapshot: true,
            trigger_excel: true,
            schedule_source: 'active-plan.json',
        };
        const task = {
            id: taskId,
            type: 'generate-report',
            company: slug,
            report_period: period,
            priority: 'normal',
            status: 'pending',
            assigned_to: 'data-intelligence',
            context,
            created_at: now,
            updated_at: now,
            iteration: 0,
            result: null,
            result_path: null,
            attempt_count: 0,
            hover_label: deriveHoverLabel({ type: 'generate-report', context }),
        };

        queue.push(task);
        tasksAdded.push({ slug, period, taskId });
        logEvent(`[REPORT] Enqueued generate-report task for ${slug} (${period}) — task ${taskId}`);
    }

    if (tasksAdded.length > 0) {
        saveQueue(queue);
        // Update state with report timestamps
        state.last_reports = state.last_reports || {};
        for (const { slug, period } of tasksAdded) {
            state.last_reports[slug] = { period, generated_at: now };
        }
        saveState(state);
    }

    return tasksAdded.length;
}

// ─────────────────────────────────────────────
// Company Queue System
// ─────────────────────────────────────────────

/** Path to a company's memory/tasks/ directory */
function companyTasksDir(slug) {
    return path.join(ROOT, 'companies', slug, 'memory', 'tasks');
}

/** Path to a company's per-week task history dir */
function companyHistoryDir(slug, yearMonth) {
    return path.join(companyTasksDir(slug), 'history', yearMonth);
}

/** Path to a company's queue.json */
function companyQueuePath(slug) {
    return path.join(companyTasksDir(slug), 'queue.json');
}

/** Ensure company memory/tasks/ directory structure exists */
function ensureCompanyMemory(slug) {
    const tasksDir = companyTasksDir(slug);
    const now = new Date();
    const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.mkdirSync(companyHistoryDir(slug, ym), { recursive: true });
}

/**
 * Load a company's per-company queue.json.
 * Returns an array. Creates with empty array if file missing.
 */
function loadCompanyQueue(slug) {
    const fpath = companyQueuePath(slug);
    if (!fs.existsSync(fpath)) {
        ensureCompanyMemory(slug);
        saveCompanyQueue(slug, []);
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(fpath, 'utf-8'));
    } catch (e) {
        logEvent('[QUEUE] Company queue corrupted for ' + slug + ' (' + e.message + '). Resetting.');
        saveCompanyQueue(slug, []);
        return [];
    }
}

/**
 * Write a company's queue.json. Also ensures directory exists.
 */
function saveCompanyQueue(slug, queue) {
    ensureCompanyMemory(slug);
    fs.writeFileSync(companyQueuePath(slug), JSON.stringify(queue, null, 4));
}

/**
 * Get ISO week string e.g. "2026-W12"
 */
function getCurrentWeek() {
    const now = new Date();
    // Robust ISO week: Thursday determines the week
    const thursday = new Date(now);
    thursday.setDate(now.getDate() + (4 - now.getDay()));
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    const weekNum = Math.ceil((((thursday - yearStart) / 86400000) + 1) / 7);
    return thursday.getFullYear() + '-W' + String(weekNum).padStart(2, '0');
}

/**
 * Get the path to the active weekly plan .meta.json for a company.
 * Returns null if no active meta file found.
 */
function getActiveMetaPath(slug) {
    const plansDir = path.join(ROOT, 'companies', slug, 'plans', 'active');
    if (!fs.existsSync(plansDir)) return null;
    const files = fs.readdirSync(plansDir).filter(f => f.endsWith('.meta.json'));
    if (!files.length) return null;
    // Return the most recent one (sorted desc, take first)
    files.sort();
    return path.join(plansDir, files[files.length - 1]);
}

/**
 * Sync task counts from a company queue into the active .meta.json file.
 * Also preserves success_metrics and notes from active-plan.json (set by dashboard users).
 * Updates last_heartbeat_at to now.
 */
function syncMetaFromQueue(slug, queue) {
    const metaPath = getActiveMetaPath(slug);
    if (!metaPath) {
        logEvent('[META] No active .meta.json for ' + slug + ' — skipping sync');
        return;
    }
    try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        const tasks = Array.isArray(queue) ? queue : [];
        meta.total_tasks     = tasks.length;
        meta.completed_tasks = tasks.filter(t => t.status === 'completed').length;
        meta.pending_tasks   = tasks.filter(t => t.status === 'pending').length;
        meta.blocked_tasks   = tasks.filter(t => t.status === 'blocked').length;
        meta.in_progress_tasks = tasks.filter(t => t.status === 'in-progress').length;
        // Add last_heartbeat_at at top level (not nested) for easy dashboard polling
        meta.last_heartbeat_at = now();
        // progress_percent = (completed / total) * 100
        meta.progress_percent = tasks.length > 0
            ? Math.round((meta.completed_tasks / meta.total_tasks) * 100)
            : 0;
        meta.updated_at = now();

        // Preserve success_metrics and notes from active-plan.json (set by dashboard users)
        // This ensures user-toggled metrics survive heartbeat syncs.
        try {
            const activePlanPath = path.join(OPENCLAW_DIR, 'companies', slug, 'plans', 'active', 'active-plan.json');
            const activePlan = JSON.parse(fs.readFileSync(activePlanPath, 'utf-8'));
            if (activePlan.success_metrics) {
                meta.success_metrics = activePlan.success_metrics;
            }
            if (activePlan.notes) {
                meta.notes = activePlan.notes;
            }
        } catch {}

        fs.writeFileSync(metaPath, JSON.stringify(meta, null, 4));
        logEvent('[META] Synced for ' + slug + ': ' + meta.completed_tasks + '/' + meta.total_tasks + ' tasks, ' + meta.progress_percent + '%');
    } catch (e) {
        logEvent('[META] Failed to sync meta for ' + slug + ': ' + e.message);
    }
}

/**
 * Merge per-company queues into a single priority-sorted task list.
 * Cross-company tasks (company: "all") come from global queue.
 * Returns: { companyTasks: Map<slug, queue>, globalTasks: [], allTasks: [] }
 */
function loadAllCompanyQueues(activeCompanies) {
    const companyQueues = new Map();
    for (const company of activeCompanies) {
        const slug = company.slug || company;
        const q = loadCompanyQueue(slug);
        companyQueues.set(slug, q);
    }
    // Global queue still exists — extract cross-company tasks (company: "all")
    const globalQueue = loadQueue();
    const globalTasks = globalQueue.filter(t => !t.company || t.company === 'all');
    // Per-company tasks from global (legacy) that haven't been migrated yet
    const legacyTasks = globalQueue.filter(t => t.company && t.company !== 'all');
    for (const task of legacyTasks) {
        const slug = task.company;
        if (companyQueues.has(slug)) {
            const cq = companyQueues.get(slug);
            if (!cq.find(t => t.id === task.id)) {
                cq.push(task);
            }
        }
    }
    // Merge all into one priority-sorted list
    const PRIORITY_ORDER = ['critical', 'high', 'normal', 'low'];
    const allTasks = [];
    for (const [slug, q] of companyQueues) {
        for (const task of q) {
            allTasks.push(task);
        }
    }
    for (const task of globalTasks) {
        allTasks.push(task);
    }
    allTasks.sort((a, b) => {
        const pa = PRIORITY_ORDER.indexOf(a.priority || 'normal') - PRIORITY_ORDER.indexOf(b.priority || 'normal');
        if (pa !== 0) return pa;
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
    return { companyQueues, globalTasks, legacyTasks, allTasks };
}

/**
 * Persist a company queue back to disk AND sync meta.json.
 * Also mirrors the change to the global queue for backwards compatibility.
 */
function persistCompanyQueue(slug, queue) {
    saveCompanyQueue(slug, queue);
    syncMetaFromQueue(slug, queue);
    // Mirror to global queue
    const globalQueue = loadQueue();
    const idx = globalQueue.findIndex(t => t.company === slug && t.id);
    // Update or add company tasks in global
    for (const task of queue) {
        const gi = globalQueue.findIndex(t => t.id === task.id);
        if (gi >= 0) {
            globalQueue[gi] = task;
        } else {
            globalQueue.push(task);
        }
    }
    saveQueue(globalQueue);
}

/**
 * One-time migration: seed company queues from global queue if not yet migrated.
 * Runs once on first heartbeat after this feature is added.
 */
function runOnceMigrations(activeCompanies) {
    if (fs.existsSync(MIGRATED_FLAG)) return;
    logEvent('[MIGRATE] Running one-time company queue migration...');
    for (const company of activeCompanies) {
        const slug = company.slug || company;
        ensureCompanyMemory(slug);
        const existing = loadCompanyQueue(slug);
        if (existing.length > 0) {
            logEvent('[MIGRATE] ' + slug + ' already has ' + existing.length + ' tasks — skipping');
            continue;
        }
        const global = loadQueue();
        const companyTasks = global.filter(t => t.company === slug);
        if (companyTasks.length > 0) {
            saveCompanyQueue(slug, companyTasks);
            syncMetaFromQueue(slug, companyTasks);
            logEvent('[MIGRATE] Migrated ' + companyTasks.length + ' tasks to ' + slug + '/memory/tasks/queue.json');
        } else {
            saveCompanyQueue(slug, []);
            syncMetaFromQueue(slug, []);
        }
    }
    fs.writeFileSync(MIGRATED_FLAG, JSON.stringify({ migrated_at: now() }));
    logEvent('[MIGRATE] Migration complete.');
}

// ─────────────────────────────────────────────
// Scope Flags — companies/<slug>/about/scope.md
// ─────────────────────────────────────────────

/**
 * Parse the ```yaml operator flags block from scope.md.
 * Returns an object like { linkedin_active: true, youtube_active: false, ... }
 * Returns null if scope.md doesn't exist or has no flags block.
 */
function loadScopeFlags(slug) {
    if (!slug || slug === 'all') return null;
    const scopePath = path.join(ROOT, 'companies', slug, 'about', 'scope.md');
    if (!fs.existsSync(scopePath)) {
        logEvent('[SCOPE] No scope.md for ' + slug + ' — operating with default capabilities');
        return null;
    }
    const content = fs.readFileSync(scopePath, 'utf-8');
    const match = content.match(/```yaml\n([\s\S]*?)```/);
    if (!match) return null;
    const flags = {};
    for (const line of match[1].split('\n')) {
        const kv = line.match(/^([\w_]+):\s*(true|false)$/);
        if (kv) flags[kv[1]] = kv[2] === 'true';
    }
    return Object.keys(flags).length > 0 ? flags : null;
}

// ─────────────────────────────────────────────
// Missing Dependencies — companies/<slug>/about/missing-dependencies.md
// ─────────────────────────────────────────────

/**
 * Read a company's .env file and return a map of KEY → value (non-empty only).
 * Keys with blank values are excluded.
 */
function loadEnvVars(slug) {
    const envPath = path.join(ROOT, 'companies', slug, '.env');
    const env = {};
    if (!fs.existsSync(envPath)) return env;
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const eqIdx = trimmed.indexOf('=');
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        // Only include non-empty values
        if (val) env[key] = val;
    }
    return env;
}

/**
 * Sync the credential status table in missing-dependencies.md by comparing against .env.
 * This makes missing-dependencies.md a derived view of .env, not a manually maintained file.
 * Only updates the Status column for KEY rows — leaves all other content untouched.
 * Returns { updated: bool, keyChanges: string[] }
 */
function syncMissingDepsFromEnv(slug) {
    const depPath = path.join(ROOT, 'companies', slug, 'about', 'missing-dependencies.md');
    if (!fs.existsSync(depPath)) {
        logEvent('[DEPS] No missing-dependencies.md for ' + slug + ' — skipping sync');
        return { updated: false, keyChanges: [] };
    }

    const env = loadEnvVars(slug);
    const content = fs.readFileSync(depPath, 'utf-8');
    const lines = content.split('\n');
    const keyChanges = [];
    let changed = false;
    const now = new Date().toISOString();

    // Find the Environment & Credentials table rows and update status column.
    // Table format: | `KEY` | Category | Priority | Status | Blocks |
    // Status column is the 4th field (index 3)
    //
    // Guard: only update rows that belong to the Credentials table, NOT the About Files table.
    // Both tables have backtick-quoted keys, but:
    //   - Credentials: | `KEY` | Category | Priority | Status | Blocks |
    //   - About Files: | `FILE` | Priority | Status | Notes |   (no Category column)
    // We distinguish them by checking fields[3] (the column after Priority):
    //   - "Blocks"  → Credentials table → process
    //   - "Notes"   → About Files table → skip
    //   - anything else → skip
    const newLines = lines.map(line => {
        const fields = line.split('|').map(f => f.trim());
        if (fields.length >= 5 && fields[1].startsWith('`') && fields[1].endsWith('`')) {
            // This is a backtick-quoted key row — check which table it belongs to
            const colAfterPriority = fields[3]; // fields[2]=Category, fields[3]=Priority, fields[4]=Status
            if (colAfterPriority !== 'Blocks') return line; // Not a Credentials table row — skip
            const key = fields[1].slice(1, -1); // strip backticks
            const oldStatus = fields[4];

            let newStatus;
            if (key === '.env file') {
                newStatus = fs.existsSync(path.join(ROOT, 'companies', slug, '.env')) ? 'present' : 'missing';
            } else if (env[key] !== undefined) {
                // Non-empty value found in .env — mark as present
                const val = env[key];
                // Truncate long values for display (e.g. JSON paths)
                const display = val.length > 60 ? val.slice(0, 60) + '...' : val;
                newStatus = 'present — ' + display;
            } else {
                newStatus = 'missing';
            }

            if (newStatus !== oldStatus) {
                keyChanges.push(key + ': "' + oldStatus + '" → "' + newStatus + '"');
                changed = true;
                // Reconstruct the row with updated Status (fields[4])
                const updatedFields = [...fields];
                updatedFields[4] = newStatus;
                return '| ' + updatedFields.join(' | ') + ' |';
            }
        }
        return line;
    });

    if (!changed) {
        logEvent('[DEPS] missing-dependencies.md in sync with .env for ' + slug);
        return { updated: false, keyChanges: [] };
    }

    // Update frontmatter: last_checked timestamp and generated_by
    const newContent = newLines.join('\n')
        .replace(/^last_checked:\s*.*$/m, 'last_checked: ' + now)
        .replace(/^generated_by:\s*.*$/m, 'generated_by: heartbeat-auto-sync');

    fs.writeFileSync(depPath, newContent);
    logEvent('[DEPS] Updated missing-dependencies.md for ' + slug + ': ' + keyChanges.join(', '));
    return { updated: true, keyChanges };
}

/**
 * Parse missing-dependencies.md and return a Set of keys with status 'missing'.
 */
function loadMissingDeps(slug) {
    if (!slug || slug === 'all') return new Set();
    const depPath = path.join(ROOT, 'companies', slug, 'about', 'missing-dependencies.md');
    if (!fs.existsSync(depPath)) return new Set();
    const content = fs.readFileSync(depPath, 'utf-8');
    const missing = new Set();
    // Match table rows: | `KEY` | ... | missing | ... |
    const rows = content.match(/\|\s*`([^`]+)`\s*\|[^|]+\|[^|]+\|\s*missing\s*\|/gi) || [];
    for (const row of rows) {
        const m = row.match(/`([^`]+)`/);
        if (m) missing.add(m[1]);
    }
    // Also match rows without backticks: | KEY | ... | missing | ... |
    const rows2 = content.match(/\|\s*([\w._\- ]+)\s*\|[^|]+\|[^|]+\|\s*missing\s*\|/gi) || [];
    for (const row of rows2) {
        const m = row.match(/\|\s*([\w._\- ]+)\s*\|/);
        if (m) missing.add(m[1].trim());
    }
    return missing;
}

/**
 * Check whether a task can run given its required dependencies.
 * Returns { blocked: false } or { blocked: true, reason: '...' }
 */
function checkTaskDeps(task, missingDeps) {
    const required = TASK_REQUIRED_DEPS[task.type] || [];
    const blocking = required.filter(dep => missingDeps.has(dep));
    if (blocking.length === 0) return { blocked: false };
    return {
        blocked: true,
        reason: 'Required credentials missing: ' + blocking.join(', ') + '. Task cannot execute until these are configured in companies/' + task.company + '/.env and missing-dependencies.md is updated.',
    };
}

/**
 * Filter distribution_channels in task context against scope flags and missing deps.
 * Returns a (possibly shorter) array of allowed channels.
 * Logs skipped channels with reason.
 */
function filterDistributionChannels(task, scopeFlags, missingDeps) {
    const channels = (task.context && task.context.distribution_channels) || [];
    if (channels.length === 0) return channels;

    const allowed = [];
    for (const ch of channels) {
        const flagName = CHANNEL_SCOPE_FLAGS[ch];
        // Scope flag check
        if (flagName && scopeFlags && scopeFlags[flagName] === false) {
            logEvent('[SCOPE] Channel "' + ch + '" disabled by scope flag ' + flagName + '=false — skipping');
            continue;
        }
        // Missing credential check
        const requiredCreds = CHANNEL_REQUIRED_DEPS[ch] || [];
        const missingCreds = requiredCreds.filter(c => missingDeps.has(c));
        if (missingCreds.length > 0) {
            logEvent('[DEPS] Channel "' + ch + '" missing credentials: ' + missingCreds.join(', ') + ' — skipping');
            continue;
        }
        allowed.push(ch);
    }

    if (allowed.length < channels.length) {
        const skipped = channels.filter(c => !allowed.includes(c));
        logEvent('[SCOPE] Distribution channels filtered: allowed=[' + allowed.join(',') + '] skipped=[' + skipped.join(',') + ']');
    }

    return allowed;
}

// ─────────────────────────────────────────────
// Human Review Inbox
// ─────────────────────────────────────────────

function parseReviewFrontmatter(content) {
    const m = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!m) return {};
    const fm = {};
    for (const line of m[1].split('\n')) {
        const kv = line.match(/^([\w_-]+):\s*(.*)$/);
        if (kv) fm[kv[1]] = kv[2].trim();
    }
    return fm;
}

function setFrontmatterKey(content, key, value) {
    return content.replace(new RegExp('(^' + key + ':\\s*).*$', 'm'), '$1' + value);
}

function scanReviewInbox(activeCompanies, queue) {
    const ready = [];
    for (const company of activeCompanies) {
        const slug = company.slug || company;
        const dir = path.join(ROOT, 'companies', slug, 'reviews', 'pending');
        if (!fs.existsSync(dir)) continue;
        for (const fname of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
            const fpath = path.join(dir, fname);
            const content = fs.readFileSync(fpath, 'utf-8');
            const fm = parseReviewFrontmatter(content);
            if (fm.response_status === 'acknowledged') continue;
            const markerIdx = content.indexOf(REVIEW_MARKER);
            if (markerIdx === -1) continue;
            const responseText = content.slice(markerIdx + REVIEW_MARKER.length).trim();
            if (!responseText) continue;
            const task = queue.find(t => t.id === fm.task_id);
            if (!task) continue;
            ready.push({ task, reviewFile: fpath, responseText, content, slug });
        }
    }
    return ready;
}

function ensureReviewFile(task) {
    const slug = task.company;
    const dir = path.join(ROOT, 'companies', slug, 'reviews', 'pending');
    fs.mkdirSync(dir, { recursive: true });
    const fpath = path.join(dir, task.id + '.md');
    if (fs.existsSync(fpath)) return;

    const ctx = task.context || {};
    const reason = ctx.reason || (typeof task.result === 'string' ? task.result : '') || 'Human input required.';
    const creds = ctx.required_credentials || [];

    let credBlock = '';
    if (creds.length > 0) {
        credBlock = '\n## Required Credentials\n\n| Key | Description |\n|-----|-------------|\n';
        for (const c of creds) credBlock += '| `' + c.key + '` | ' + c.description + ' |\n';
        credBlock += '\n';
    }
    const instruction = ctx.instruction ? '\n## Instructions\n\n' + ctx.instruction + '\n' : '';

    const lines = [
        '---',
        'task_id: ' + task.id,
        'type: human-review',
        'company: ' + slug,
        'created_at: ' + (task.created_at || new Date().toISOString()),
        'priority: ' + (task.priority || 'normal'),
        'triggered_by: ' + (ctx.triggered_by || task.id),
        'response_status: pending',
        '---',
        '',
        '# Review Required \u2014 ' + slug,
        '',
        '## What the System Needs',
        '',
        reason,
        credBlock,
        instruction,
        '---',
        '',
        '## Notes',
        '',
        '> Write your response, decisions, and any standing instructions below the marker line.',
        '> The orchestrator reads this section on every heartbeat cycle.',
        '>',
        '> You can include:',
        '> - Confirmation that an action is done (e.g. "credentials configured")',
        '> - Scheduling preferences (e.g. "don\'t publish on weekends")',
        '> - Branding rules (e.g. "never mention competitor X", "always use metric units")',
        '> - Scope decisions (e.g. "skip LinkedIn for now", "only post to r/civilengineering")',
        '> - Any other standing operator instruction for this company',
        '>',
        '> Once you write anything below the marker, it will be processed on the next heartbeat.',
        '',
        REVIEW_MARKER,
        '',
    ];
    fs.writeFileSync(fpath, lines.join('\n'));
}

function resolveReviewFile(fpath, slug) {
    const resolvedDir = path.join(ROOT, 'companies', slug, 'reviews', 'resolved');
    fs.mkdirSync(resolvedDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const fname = path.basename(fpath).replace('.md', '-resolved-' + ts + '.md');
    fs.renameSync(fpath, path.join(resolvedDir, fname));
}

// ─────────────────────────────────────────────
// Review Decision Scanner — Human-in-the-loop bridge
// ─────────────────────────────────────────────

/**
 * Scan review .meta.json files for NEW human decisions that haven't been
 * processed by the orchestrator yet. Creates lightweight process-review-decision
 * tasks so the orchestrator can route them without scanning raw files.
 *
 * Decision state is tracked in heartbeat-state.json:
 *   { processed_review_decisions: { "<filename>": <human_decision_at timestamp> } }
 *
 * A decision is "new" if:
 *   - human_decision is set (approved | rejected)
 *   - The decision timestamp is NOT in processed_review_decisions
 */
function scanReviewDecisions(activeCompanies, queue) {
    const state = loadState();
    const processed = state.processed_review_decisions || {};
    const stateFilePath = STATE_FILE; // defined at module top

    const decisions = []; // [{ slug, filename, decision, decisionAt, metaPath }]

    for (const company of activeCompanies) {
        const slug = company.slug || company;
        const reviewsDir = path.join(ROOT, 'companies', slug, 'reviews');
        if (!fs.existsSync(reviewsDir)) continue;

        for (const fname of fs.readdirSync(reviewsDir).filter(f => f.endsWith('.meta.json'))) {
            let meta;
            try {
                meta = JSON.parse(fs.readFileSync(path.join(reviewsDir, fname), 'utf-8'));
            } catch (_) { continue; }

            const decision = meta.human_decision;
            const decisionAt = meta.human_decision_at;
            if (!decision || !decisionAt) continue; // No human decision yet

            // Skip if already processed
            if (processed[fname] === decisionAt) continue;

            // Check if a process-review-decision task for this file already exists in queue
            const alreadyQueued = queue.some(
                t => t.company === slug &&
                     t.type === 'process-review-decision' &&
                     t.context && t.context.review_filename === fname
            );
            if (alreadyQueued) continue;

            decisions.push({ slug, filename: fname, decision, decisionAt, meta });
        }
    }

    if (decisions.length === 0) return 0;

    const now = now();
    for (const d of decisions) {
        const context = {
            review_filename: d.filename,
            human_decision: d.decision,
            decision_at: d.decisionAt,
            next_action_hint: (d.meta.humanReadableSummary && d.meta.humanReadableSummary.nextAction) || null,
            review_type: d.meta.review_type || null,
            target_url: d.meta.target_url || null,
        };
        const task = {
            id: 'task-process-review-decision-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
            type: 'process-review-decision',
            company: d.slug,
            report_period: null,
            priority: d.decision === 'rejected' ? 'high' : 'normal',
            status: 'pending',
            assigned_to: 'seo-orchestrator',
            context,
            created_at: now,
            updated_at: now,
            iteration: 0,
            result: null,
            result_path: null,
            hover_label: deriveHoverLabel({ type: 'process-review-decision', context }),
        };
        queue.push(task);
        logEvent('[REVIEW] Human ' + d.decision + ' detected: ' + d.filename + ' for ' + d.slug);

        // Mark as queued so we don't create duplicates on next cycle
        processed[d.filename] = d.decisionAt;
    }

    // Persist processed state so we don't re-create same tasks
    state.processed_review_decisions = processed;
    saveState(state);
    saveQueue(queue);

    return decisions.length;
}

// ─────────────────────────────────────────────
// System prompt builder
// ─────────────────────────────────────────────

function buildSystemPrompt(agentName) {
    const parts = [];
    const personaPath = path.join(ROOT, 'agents', agentName + '.md');
    if (fs.existsSync(personaPath)) {
        parts.push(fs.readFileSync(personaPath, 'utf-8'));
    } else {
        logEvent('[WARN] No persona file for agent: ' + agentName);
        parts.push('You are the ' + agentName + ' agent for the openclaw-seo system.');
    }
    if (agentName === 'seo-orchestrator') {
        const soulPath = path.join(ROOT, 'SOUL.md');
        if (fs.existsSync(soulPath)) parts.push('\n\n---\n\n' + fs.readFileSync(soulPath, 'utf-8'));
    }
    const skills = SKILLS_BY_AGENT[agentName] || [];
    for (const skillName of skills) {
        const skillMd = path.join(ROOT, 'skills', skillName, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
            parts.push('\n\n---\n\n## Available Skill: ' + skillName + '\n\n' + fs.readFileSync(skillMd, 'utf-8'));
        }
    }
    parts.push('\n\n---\n\n## Runtime Context (READ THIS)\n\n' +
        '- Today\'s date: ' + new Date().toISOString().slice(0, 10) + '\n' +
        'You are running in **headless cron mode** via Claude Code CLI (-p flag).\n' +
        '- Working directory: ' + ROOT + '\n' +
        '- Full file system access via Read, Write, Bash, Glob, Grep tools\n' +
        '- Do NOT ask for clarification. Take the best action with available data.\n' +
        '- Take exactly ONE action per invocation, then stop.\n' +
        '- Output a JSON status object when done:\n' +
        '  {"status":"complete","action":"<description>","tasks_added":<N>}\n' +
        '- On failure: {"status":"failed","reason":"<why>"}\n' +
        '- Never loop or retry internally.\n');
    return parts.join('\n');
}

// ─────────────────────────────────────────────
// Agent invocation via Claude Code CLI
// ─────────────────────────────────────────────

async function INVOKE_AGENT(agentName, taskContext) {
    logEvent('[INVOKE] Agent=' + agentName + ' | Task=' + taskContext.id + ' | Type=' + taskContext.type + ' | Company=' + taskContext.company);

    const systemPrompt = buildSystemPrompt(agentName);
    const model        = MODEL_BY_AGENT[agentName]  || MODEL_BY_AGENT.default;
    const budget       = BUDGET_BY_AGENT[agentName] || BUDGET_BY_AGENT.default;
    const tools        = TOOLS_BY_AGENT[agentName]  || TOOLS_BY_AGENT.default;

    const userMessage = [
        'Execute this task:',
        '',
        JSON.stringify(taskContext, null, 2),
        '',
        'Instructions:',
        '- Read the file system as needed using your tools.',
        '- Follow your agent definition and heartbeat protocol exactly.',
        '- Write all outputs to disk.',
        '- Update the company queue at: ' + (taskContext.context && taskContext.context.company_queue_path ? taskContext.context.company_queue_path : QUEUE_FILE),
        '- ALSO write completed/changed tasks to the global queue: ' + QUEUE_FILE + ' (for backwards compatibility).',
        '- Output a JSON status object when finished (see Runtime Context above).',
    ].join('\n');

    const args = [
        '-p', userMessage,
        '--system-prompt', systemPrompt,
        '--output-format', 'json',
        '--dangerously-skip-permissions',
        '--tools', tools,
        '--model', model,
        '--max-budget-usd', String(budget),
        '--no-session-persistence',
    ];

    logEvent('[INVOKE] Model=' + model + ' | Budget=$' + budget + ' | Tools=' + tools + ' | Timeout=' + (TASK_TIMEOUT_MS / 60000) + 'm');

    const proc = spawnSync('claude', args, {
        cwd: ROOT,
        encoding: 'utf-8',
        timeout: TASK_TIMEOUT_MS,
        maxBuffer: 10 * 1024 * 1024,
    });

    if (proc.error) {
        const msg = proc.error.code === 'ETIMEDOUT'
            ? 'Task timed out after ' + (TASK_TIMEOUT_MS / 60000) + ' minutes'
            : proc.error.message;
        logEvent('[INVOKE] Process error: ' + msg);
        return { status: 'failed', message: msg };
    }

    if (proc.status !== 0) {
        const errText = (proc.stderr || '').slice(0, 500);
        logEvent('[INVOKE] Claude exited code=' + proc.status + ': ' + errText);
        return { status: 'failed', message: 'Exit ' + proc.status + ': ' + errText };
    }

    let costUsd = null;
    try {
        const envelope = JSON.parse(proc.stdout);
        costUsd = (envelope.cost_usd != null) ? envelope.cost_usd : null;
        const resultText = envelope.result || '';
        if (costUsd !== null) {
            logEvent('[INVOKE] Completed. Cost: $' + costUsd.toFixed(4));
            const state = loadState();
            state.total_cost_usd = (state.total_cost_usd || 0) + costUsd;
            saveState(state);
        }
        try {
            const lastBrace = resultText.lastIndexOf('{');
            if (lastBrace !== -1) {
                const parsed = JSON.parse(resultText.slice(lastBrace));
                if (parsed.status) return Object.assign({}, parsed, { cost_usd: costUsd });
            }
        } catch (_) {}
        return { status: 'complete', message: resultText.slice(0, 300), cost_usd: costUsd };
    } catch (_) {
        logEvent('[INVOKE] Could not parse Claude output envelope — assuming success.');
        return { status: 'complete', message: 'Agent ran (raw output)', cost_usd: null };
    }
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

function logEvent(message) {
    const ts = new Date().toISOString();
    const line = '[' + ts + '] [HEARTBEAT] ' + message + '\n';
    fs.appendFileSync(LOG_FILE, line);
    console.log(line.trim());
}

function loadCompanies() {
    if (!fs.existsSync(COMPANIES_FILE)) { logEvent('WARNING: companies.json not found.'); return []; }
    try { return JSON.parse(fs.readFileSync(COMPANIES_FILE, 'utf-8')).active || []; }
    catch (e) { logEvent('ERROR: Failed to parse companies.json — ' + e.message); return []; }
}

function loadQueue() {
    if (!fs.existsSync(QUEUE_FILE)) {
        fs.mkdirSync(MEMORY_DIR, { recursive: true });
        fs.writeFileSync(QUEUE_FILE, JSON.stringify([], null, 4));
        return [];
    }
    try {
        const raw = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
        if (Array.isArray(raw)) return raw;
        if (raw && Array.isArray(raw.tasks)) {
            logEvent('WARN: task-queue.json had wrong format (object with .tasks). Auto-recovering.');
            saveQueue(raw.tasks);
            return raw.tasks;
        }
        throw new Error('Unexpected top-level type: ' + typeof raw);
    } catch (e) {
        logEvent('WARN: task-queue.json corrupted (' + e.message + '). Resetting to empty queue.');
        saveQueue([]);
        return [];
    }
}

function saveQueue(queue) { fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 4)); }
function now() { return new Date().toISOString(); }

// ─────────────────────────────────────────────
// Heartbeat Protocol
// ─────────────────────────────────────────────

async function runHeartbeat() {
    if (!acquireLock()) return;

    try {
        logEvent('\u2500\u2500\u2500 Heartbeat cycle started \u2500\u2500\u2500');

        const activeCompanies = loadCompanies();
        if (activeCompanies.length === 0) { logEvent('No active companies. Sleeping.'); return; }
        logEvent('Active companies: [' + activeCompanies.map(c => c.slug || c).join(', ') + ']');

        // ── Step 0b: Sync missing-dependencies.md from .env ──
        // Makes missing-dependencies.md a derived view of .env, not a manually maintained file.
        // Run for all active companies each cycle so credential changes are reflected immediately.
        for (const company of activeCompanies) {
            const slug = company.slug || company;
            syncMissingDepsFromEnv(slug);
        }

        // One-time migration: seed per-company queues from global queue
        runOnceMigrations(activeCompanies);

        const { companyQueues, allTasks } = loadAllCompanyQueues(activeCompanies);
        const globalQueue = loadQueue();

        // ── Step 0: Human Review Inbox Scan ──
        const reviewsReady = scanReviewInbox(activeCompanies, queue);

        // ── Step 0b: Scan review .meta.json files for new human decisions ──
        // Creates lightweight process-review-decision tasks for the orchestrator to route.
        // Runs independently of inbox scan — both can fire in the same cycle.
        const newReviewDecisions = scanReviewDecisions(activeCompanies, queue);
        if (newReviewDecisions > 0) {
            logEvent('[REVIEW] ' + newReviewDecisions + ' human decision(s) queued for processing.');
            // Reload queue after scanReviewDecisions modified it
            queue = loadQueue();
        }

        // Process legacy inbox responses first (critical, blocks next cycle)
        if (reviewsReady.length > 0) {
            const { task, reviewFile, responseText, content, slug } = reviewsReady[0];
            logEvent('[INBOX] Operator response detected for task ' + task.id + ' \u2014 routing to seo-orchestrator');

            const updatedContent = setFrontmatterKey(content, 'response_status', 'acknowledged');
            fs.writeFileSync(reviewFile, updatedContent);

            const processTaskContext = {
                original_task_id:   task.id,
                original_task_type: task.type,
                human_response:     responseText,
                review_file:        reviewFile,
                original_context:   task.context || {},
            };
            const processTask = {
                id:            'task-process-review-' + Date.now(),
                type:          'process-human-review',
                company:       task.company,
                report_period: task.report_period || null,
                priority:      'critical',
                status:        'in-progress',
                assigned_to:   'seo-orchestrator',
                context:        processTaskContext,
                created_at:     now(),
                updated_at:     now(),
                iteration:      0,
                result:         null,
                result_path:    null,
                hover_label:    deriveHoverLabel({ type: 'process-human-review', context: processTaskContext }),
            };

            await INVOKE_AGENT('seo-orchestrator', processTask);

            resolveReviewFile(reviewFile, slug);

            const freshQueue = loadQueue();
            const origTask = freshQueue ? freshQueue.find(t => t.id === task.id) : null;
            if (origTask && ['waiting-human', 'in-progress', 'failed'].includes(origTask.status)) {
                origTask.status = 'completed';
                origTask.updated_at = now();
                origTask.result = { action: 'human-response-processed', processed_at: now() };
                saveQueue(freshQueue);
                // Also persist to company queue
                const slug = origTask.company && origTask.company !== 'all' ? origTask.company : null;
                if (slug) {
                    const cq = loadCompanyQueue(slug);
                    const ct = cq.find(t => t.id === origTask.id);
                    if (ct) {
                        ct.status = origTask.status;
                        ct.updated_at = origTask.updated_at;
                        ct.result = origTask.result;
                        persistCompanyQueue(slug, cq);
                    }
                }
            }

            logEvent('[INBOX] Review processed. File moved to resolved/');
            logEvent('\u2500\u2500\u2500 Heartbeat cycle complete \u2500\u2500\u2500');
            return;
        }

        // ── Step 1: Recovery — reset stalled in-progress tasks ──
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        let recoveredCount = 0;

        for (const [slug, cq] of companyQueues) {
            let changed = false;
            for (const task of cq) {
                if (task.status !== 'in-progress') continue;
                const updatedAt = new Date(task.updated_at || task.created_at).getTime();
                if (updatedAt >= twoHoursAgo) continue;
                task.attempt_count = (task.attempt_count || 0) + 1;
                if (task.attempt_count >= 3) {
                    logEvent('[RECOVERY] Task ' + task.id + ' stalled >2h, exceeded 3 attempts \u2192 blocked');
                    task.status = 'blocked';
                    task.result = 'Stalled and exceeded retry limit.';
                } else {
                    logEvent('[RECOVERY] Task ' + task.id + ' stalled >2h \u2192 reset to pending (attempt ' + task.attempt_count + '/3)');
                    task.status = 'pending';
                }
                task.updated_at = now();
                changed = true;
                recoveredCount++;
            }
            if (changed) persistCompanyQueue(slug, cq);
        }

        if (recoveredCount > 0) {
            logEvent('[RECOVERY] ' + recoveredCount + ' task(s) recovered. Sleeping.');
            return;
        }

        // ── Step 2: Execute — route highest priority pending task ──
        const PRIORITY_ORDER = ['critical', 'high', 'normal', 'low'];
        const pendingTasks = allTasks
            .filter(t => t.status === 'pending')
            .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority || 'normal') - PRIORITY_ORDER.indexOf(b.priority || 'normal'));

        if (pendingTasks.length > 0) {
            const task = pendingTasks[0];

            // HUMAN agent: write review file and park — never invoke Claude
            if (task.assigned_to === 'HUMAN') {
                ensureReviewFile(task);
                task.status = 'waiting-human';
                task.updated_at = now();
                if (task.company && task.company !== 'all' && companyQueues.has(task.company)) {
                    persistCompanyQueue(task.company, companyQueues.get(task.company));
                } else {
                    saveQueue(globalQueue);
                }
                logEvent('[HUMAN] Task ' + task.id + ' \u2192 waiting-human. Review file: companies/' + task.company + '/reviews/pending/' + task.id + '.md');
                logEvent('\u2500\u2500\u2500 Heartbeat cycle complete \u2500\u2500\u2500');
                return;
            }

            // Load scope flags and missing deps for this company (skip for cross-company tasks)
            const slug = task.company && task.company !== 'all' ? task.company : null;
            const scopeFlags  = slug ? loadScopeFlags(slug) : null;
            const missingDeps = slug ? loadMissingDeps(slug) : new Set();

            // Hard dep check: block task if required credentials are missing
            if (slug) {
                const depCheck = checkTaskDeps(task, missingDeps);
                if (depCheck.blocked) {
                    logEvent('[DEPS] Task ' + task.id + ' blocked: ' + depCheck.reason);
                    task.status = 'blocked';
                    task.updated_at = now();
                    task.result = depCheck.reason;
                    if (companyQueues.has(slug)) {
                        persistCompanyQueue(slug, companyQueues.get(slug));
                    } else {
                        saveQueue(globalQueue);
                    }
                    logEvent('\u2500\u2500\u2500 Heartbeat cycle complete \u2500\u2500\u2500');
                    return;
                }
            }

            // Distribution channel filtering: strip disabled/uncredentialed channels
            if (slug && task.context && task.context.distribution_channels) {
                const allowed = filterDistributionChannels(task, scopeFlags, missingDeps);
                if (allowed.length === 0 && task.type === 'distribute-content') {
                    logEvent('[SCOPE] All distribution channels disabled or missing credentials. Skipping distribute-content task.');
                    task.status = 'completed';
                    task.updated_at = now();
                    task.result = { action: 'skipped', reason: 'No allowed distribution channels after scope and dep filtering.' };
                    if (companyQueues.has(slug)) {
                        persistCompanyQueue(slug, companyQueues.get(slug));
                    } else {
                        saveQueue(globalQueue);
                    }
                    logEvent('\u2500\u2500\u2500 Heartbeat cycle complete \u2500\u2500\u2500');
                    return;
                }
                task.context.distribution_channels = allowed;
                task.context.allowed_channels_enforced_at = now();
            }

            // Inject scope flags, missing deps, and queue paths into task context for the agent
            if (slug) {
                task.context = task.context || {};
                if (scopeFlags) task.context.scope_flags = scopeFlags;
                const relevantDeps = (TASK_REQUIRED_DEPS[task.type] || []).filter(dep => missingDeps.has(dep));
                if (relevantDeps.length > 0) task.context.missing_deps = relevantDeps;
                // Queue paths so agents know where to write
                task.context.company_queue_path = companyQueuePath(slug);
            }
            task.context.global_queue_path = QUEUE_FILE;
            task.context.current_week = getCurrentWeek();

            logEvent('[EXECUTE] Task ' + task.id + ' | type=' + task.type + ' | company=' + task.company + ' | priority=' + task.priority);

            task.status     = 'in-progress';
            task.updated_at = now();

            // Persist in-progress to company queue
            if (slug && companyQueues.has(slug)) {
                persistCompanyQueue(slug, companyQueues.get(slug));
            } else {
                saveQueue(globalQueue);
            }

            const agentName = task.assigned_to || 'seo-orchestrator';
            const invokeResult = await INVOKE_AGENT(agentName, task);

            // Reload company queue to see if agent self-updated
            let freshTask = null;
            if (slug && companyQueues.has(slug)) {
                const cq = loadCompanyQueue(slug);
                freshTask = cq.find(t => t.id === task.id);
            } else {
                const gq = loadQueue();
                freshTask = gq.find(t => t.id === task.id);
            }

            if (freshTask && freshTask.status !== 'in-progress') {
                logEvent('[EXECUTE] Task ' + task.id + ' \u2192 agent self-reported status: ' + freshTask.status);
            } else {
                // Fallback: mark completed in company queue
                if (slug && companyQueues.has(slug)) {
                    const cq = companyQueues.get(slug);
                    const t = cq.find(t => t.id === task.id);
                    if (t) {
                        t.status     = 'completed';
                        t.updated_at = now();
                        t.result     = 'Completed (queue not self-updated by agent)';
                        persistCompanyQueue(slug, cq);
                    }
                }
                logEvent('[EXECUTE] Task ' + task.id + ' \u2192 completed (fallback update)');
            }

            logEvent('\u2500\u2500\u2500 Heartbeat cycle complete \u2500\u2500\u2500');
            return;
        }

        // ── Step 3: Queue empty — run delta eval (throttled) ──
        // waiting-human tasks do NOT block delta evaluation
        const hasBlocking = allTasks.some(t => ['pending', 'in-progress'].includes(t.status));
        if (hasBlocking) { logEvent('[PLAN] Queue has active tasks. Skipping delta eval.'); return; }

        const state = loadState();
        const lastDelta = state.last_delta_eval ? new Date(state.last_delta_eval).getTime() : 0;
        const minutesSince = (Date.now() - lastDelta) / 60_000;

        // Check if missing-dependencies.md hasn't been updated in >7 days - force delta eval
        for (const slug of activeCompanies.map(c => c.slug || c)) {
            const depPath = path.join(ROOT, 'companies', slug, 'about', 'missing-dependencies.md');
            if (fs.existsSync(depPath)) {
                const content = fs.readFileSync(depPath, 'utf-8');
                const lastChecked = content.match(/last_checked:\s*([^\n]+)/);
                if (lastChecked) {
                    const daysSinceCheck = (Date.now() - new Date(lastChecked[1]).getTime()) / (1000*60*60*24);
                    if (daysSinceCheck > 7) {
                        logEvent('[DEPS] Credential file stale (' + Math.round(daysSinceCheck) + ' days) — forcing delta eval');
                        // Force delta eval even if on cooldown
                        state.last_delta_eval = 0;
                        saveState(state);
                        break;
                    }
                }
            }
        }

        if (minutesSince < DELTA_EVAL_COOLDOWN_MINUTES) {
            logEvent('[PLAN] Queue empty. Delta eval on cooldown (' + Math.round(DELTA_EVAL_COOLDOWN_MINUTES - minutesSince) + 'm left). Sleeping.');
            return;
        }

        logEvent('[PLAN] Queue empty. Running orchestrator delta evaluation.');
        state.last_delta_eval = now();
        saveState(state);

        const planningTaskContext = { active_companies: activeCompanies.map(c => c.slug || c) };
        const planningTask = {
            id:            'task-delta-eval-' + Date.now(),
            type:          'delta-evaluation',
            company:       'all',
            report_period: null,
            priority:      'normal',
            status:        'in-progress',
            assigned_to:   'seo-orchestrator',
            context:        planningTaskContext,
            created_at:     now(),
            updated_at:     now(),
            iteration:      0,
            result:         null,
            result_path:    null,
            hover_label:    deriveHoverLabel({ type: 'delta-evaluation', context: planningTaskContext }),
        };

        await INVOKE_AGENT('seo-orchestrator', planningTask);

        logEvent('[PLAN] Delta evaluation complete. New tasks added to queue if thresholds crossed.');

        // ── Step 4: Schedule due reports based on active-plan.json cadence ──
        const freshQueue = loadQueue();
        const reportTasksAdded = scheduleDueReports(activeCompanies, freshQueue);
        if (reportTasksAdded > 0) {
            logEvent('[REPORT] ' + reportTasksAdded + ' generate-report task(s) enqueued.');
        }

        logEvent('\u2500\u2500\u2500 Heartbeat cycle complete \u2500\u2500\u2500');

    } finally {
        releaseLock();
    }
}

// ─────────────────────────────────────────────
// Entry Point
// ─────────────────────────────────────────────

if (require.main === module) {
    runHeartbeat().catch(err => {
        logEvent('FATAL: ' + err.message);
        console.error(err.stack);
        releaseLock();
        process.exit(1);
    });
}

module.exports = {
    runHeartbeat, INVOKE_AGENT,
    loadQueue, saveQueue, loadCompanies,
    loadScopeFlags, loadMissingDeps, syncMissingDepsFromEnv,
    // Company queue helpers (exposed for agents / scripts)
    loadCompanyQueue, saveCompanyQueue, persistCompanyQueue,
    companyQueuePath, ensureCompanyMemory, getCurrentWeek,
    syncMetaFromQueue, getActiveMetaPath, getCurrentWeek,
};
