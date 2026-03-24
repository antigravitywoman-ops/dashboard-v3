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

// Per-company queue path helper (primary source of truth)
function getCompanyQueuePath(slug) {
    return path.join(ROOT, 'companies', slug, 'memory', 'tasks', 'queue.json');
}

// Read per-company queue, returns array or [] if file doesn't exist
function loadCompanyQueue(slug) {
    const queuePath = getCompanyQueuePath(slug);
    if (!fs.existsSync(queuePath)) return [];
    try {
        const raw = JSON.parse(fs.readFileSync(queuePath, 'utf-8'));
        return Array.isArray(raw) ? raw : [];
    } catch (_) {
        return [];
    }
}

// Write per-company queue
function saveCompanyQueue(slug, queue) {
    const queuePath = getCompanyQueuePath(slug);
    const dir = path.dirname(queuePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 4));
}

// Find a task by id across all per-company queues and optionally update it
// Returns { slug, task, queue } or null
function findAndUpdateTask(taskId, updateFn) {
    const activeCompanies = loadCompanies();
    for (const company of activeCompanies) {
        const slug = company.slug || company;
        const queue = loadCompanyQueue(slug);
        const idx = queue.findIndex(t => t.id === taskId);
        if (idx !== -1) {
            updateFn(queue[idx]);
            saveCompanyQueue(slug, queue);
            return { slug, task: queue[idx], queue };
        }
    }
    return null;
}

const BUDGET_BY_AGENT = {
    'seo-orchestrator':  1.00,
    'data-intelligence': 1.50,
    'research-analyst':  3.00,
    'content-writer':    2.50,
    'content-publisher': 1.00,
    'excel-porter':      1.00,
    'verification-agent':1.00,
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
    'default':           'claude-sonnet-4-6',
};

const SKILLS_BY_AGENT = {
    'seo-orchestrator':  ['auth-manager', 'snapshot-generator', 'sheet-validator', 'backup-sweeper', 'content-gate'],
    'research-analyst':  ['serper-miner', 'gsc-fetch', 'ga4-fetch', 'rank-track', 'sheet-validator', 'crawl-firecrawl', 'schema-auditor'],
    'data-intelligence': ['gsc-fetch', 'ga4-fetch', 'rank-track', 'snapshot-generator'],
    'excel-porter':      ['excel-porter', 'sheet-validator'],
    'content-writer':    ['blog-generate', 'blog-update', 'meta-optimizer', 'serper-miner', 'crawl-firecrawl', 'content-curator'],
    'content-publisher': ['cms-wordpress', 'cms-editor-generic', 'wpcli-manager', 'post-reddit', 'post-quora', 'post-linkedin', 'post-medium', 'auth-manager'],
    'verification-agent':['crawl-firecrawl', 'crawl-browser', 'schema-auditor'],
};

const TOOLS_BY_AGENT = {
    'seo-orchestrator':  'Read,Write,Bash,Glob,Grep',
    'research-analyst':  'Read,Write,Bash,Glob,Grep',
    'data-intelligence': 'Read,Write,Bash,Glob,Grep',
    'excel-porter':      'Read,Write,Bash',
    'content-writer':    'Read,Write,Bash,Glob,Grep',
    'content-publisher': 'Read,Write,Bash',
    'verification-agent':'Read,Write,Bash,Glob,Grep',
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
    return { last_delta_eval: null, total_cost_usd: 0 };
}

function saveState(state) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
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
        '- Update ' + QUEUE_FILE + ' to mark this task completed/failed when done.',
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

// Load queue: merges all per-company queues (source of truth) into a flat array
// Falls back to global queue.json if no per-company queues exist (backwards compatibility)
function loadQueue() {
    const activeCompanies = loadCompanies();
    const allTasks = [];

    for (const company of activeCompanies) {
        const slug = company.slug || company;
        const companyQueue = loadCompanyQueue(slug);
        for (const task of companyQueue) {
            // Stamp company slug on cross-company tasks
            if (!task.company) task.company = slug;
            allTasks.push(task);
        }
    }

    if (allTasks.length > 0) {
        logEvent('[QUEUE] Loaded ' + allTasks.length + ' tasks from ' + activeCompanies.length + ' per-company queues');
        // Keep global queue in sync as a mirror
        fs.mkdirSync(MEMORY_DIR, { recursive: true });
        fs.writeFileSync(QUEUE_FILE, JSON.stringify(allTasks, null, 4));
        return allTasks;
    }

    // Fallback: try reading global queue if no per-company queues exist yet
    if (!fs.existsSync(QUEUE_FILE)) {
        fs.mkdirSync(MEMORY_DIR, { recursive: true });
        fs.writeFileSync(QUEUE_FILE, JSON.stringify([], null, 4));
        return [];
    }
    try {
        const raw = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
        if (Array.isArray(raw)) return raw;
        if (raw && Array.isArray(raw.tasks)) {
            logEvent('WARN: task-queue.json had wrong format (object with .tasks). Migrating to per-company queues.');
            for (const task of raw.tasks) {
                const slug = task.company || 'unknown';
                const cq = loadCompanyQueue(slug);
                cq.push(task);
                saveCompanyQueue(slug, cq);
            }
            return raw.tasks;
        }
        throw new Error('Unexpected top-level type: ' + typeof raw);
    } catch (e) {
        logEvent('WARN: task-queue.json corrupted (' + e.message + '). Resetting to empty queue.');
        fs.writeFileSync(QUEUE_FILE, JSON.stringify([], null, 4));
        return [];
    }
}

// Save queue: write back to per-company queue (source of truth) for company-specific tasks
function saveQueue(queue) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 4));

    // Also sync back to per-company queues so dashboard sees the same data
    const byCompany = {};
    for (const task of queue) {
        const slug = task.company || 'unknown';
        if (!byCompany[slug]) byCompany[slug] = [];
        byCompany[slug].push(task);
    }
    for (const [slug, tasks] of Object.entries(byCompany)) {
        saveCompanyQueue(slug, tasks);
    }
}
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

        const queue = loadQueue();
        if (queue === null) return;

        // ── Step 0: Human Review Inbox Scan ──
        const reviewsReady = scanReviewInbox(activeCompanies, queue);

        if (reviewsReady.length > 0) {
            const { task, reviewFile, responseText, content, slug } = reviewsReady[0];
            logEvent('[INBOX] Operator response detected for task ' + task.id + ' \u2014 routing to seo-orchestrator');

            const updatedContent = setFrontmatterKey(content, 'response_status', 'acknowledged');
            fs.writeFileSync(reviewFile, updatedContent);

            const processTask = {
                id:            'task-process-review-' + Date.now(),
                type:          'process-human-review',
                company:       task.company,
                report_period: task.report_period || null,
                priority:      'critical',
                status:        'in-progress',
                assigned_to:   'seo-orchestrator',
                context: {
                    original_task_id:   task.id,
                    original_task_type: task.type,
                    human_response:     responseText,
                    review_file:        reviewFile,
                    original_context:   task.context || {},
                },
                created_at:  now(),
                updated_at:  now(),
                iteration:   0,
                result:      null,
                result_path: null,
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
            }

            logEvent('[INBOX] Review processed. File moved to resolved/');
            logEvent('\u2500\u2500\u2500 Heartbeat cycle complete \u2500\u2500\u2500');
            return;
        }

        // ── Step 1: Recovery — reset stalled in-progress tasks ──
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        let recoveredCount = 0;

        for (const task of queue) {
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
            recoveredCount++;
        }

        if (recoveredCount > 0) {
            saveQueue(queue);
            logEvent('[RECOVERY] ' + recoveredCount + ' task(s) recovered. Sleeping.');
            return;
        }

        // ── Step 2: Execute — route highest priority pending task ──
        const PRIORITY_ORDER = ['critical', 'high', 'normal', 'low'];
        const pendingTasks = queue
            .filter(t => t.status === 'pending')
            .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority || 'normal') - PRIORITY_ORDER.indexOf(b.priority || 'normal'));

        if (pendingTasks.length > 0) {
            const task = pendingTasks[0];

            // HUMAN agent: write review file and park — never invoke Claude
            if (task.assigned_to === 'HUMAN') {
                ensureReviewFile(task);
                task.status = 'waiting-human';
                task.updated_at = now();
                saveQueue(queue);
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
                    saveQueue(queue);
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
                    saveQueue(queue);
                    logEvent('\u2500\u2500\u2500 Heartbeat cycle complete \u2500\u2500\u2500');
                    return;
                }
                task.context.distribution_channels = allowed;
                task.context.allowed_channels_enforced_at = now();
            }

            // Inject scope flags and missing dep list into task context for the agent
            if (slug) {
                task.context = task.context || {};
                if (scopeFlags) task.context.scope_flags = scopeFlags;
                // Only inject dependencies that are relevant to this task type (filter out irrelevant ones)
                const relevantDeps = (TASK_REQUIRED_DEPS[task.type] || []).filter(dep => missingDeps.has(dep));
                if (relevantDeps.length > 0) task.context.missing_deps = relevantDeps;
            }

            logEvent('[EXECUTE] Task ' + task.id + ' | type=' + task.type + ' | company=' + task.company + ' | priority=' + task.priority);

            task.status     = 'in-progress';
            task.updated_at = now();
            saveQueue(queue);

            const agentName = task.assigned_to || 'seo-orchestrator';
            await INVOKE_AGENT(agentName, task);

            const freshQueue = loadQueue();
            const freshTask  = freshQueue ? freshQueue.find(t => t.id === task.id) : null;

            if (freshTask && freshTask.status !== 'in-progress') {
                logEvent('[EXECUTE] Task ' + task.id + ' \u2192 agent self-reported status: ' + freshTask.status);
            } else {
                const taskRef = queue.find(t => t.id === task.id);
                if (taskRef) {
                    taskRef.status     = 'completed';
                    taskRef.updated_at = now();
                    taskRef.result     = 'Completed (queue not self-updated by agent)';
                    saveQueue(queue);
                    logEvent('[EXECUTE] Task ' + task.id + ' \u2192 completed (fallback update)');
                }
            }

            logEvent('\u2500\u2500\u2500 Heartbeat cycle complete \u2500\u2500\u2500');
            return;
        }

        // ── Step 3: Queue empty — run delta eval (throttled) ──
        // waiting-human tasks do NOT block delta evaluation
        const hasBlocking = queue.some(t => ['pending', 'in-progress'].includes(t.status));
        if (hasBlocking) { logEvent('[PLAN] Queue has active tasks. Skipping delta eval.'); return; }

        const state = loadState();
        const lastDelta = state.last_delta_eval ? new Date(state.last_delta_eval).getTime() : 0;
        const minutesSince = (Date.now() - lastDelta) / 60_000;

        if (minutesSince < DELTA_EVAL_COOLDOWN_MINUTES) {
            logEvent('[PLAN] Queue empty. Delta eval on cooldown (' + Math.round(DELTA_EVAL_COOLDOWN_MINUTES - minutesSince) + 'm left). Sleeping.');
            return;
        }

        logEvent('[PLAN] Queue empty. Running orchestrator delta evaluation.');
        state.last_delta_eval = now();
        saveState(state);

        const planningTask = {
            id:            'task-delta-eval-' + Date.now(),
            type:          'delta-evaluation',
            company:       'all',
            report_period: null,
            priority:      'normal',
            status:        'in-progress',
            assigned_to:   'seo-orchestrator',
            context:       { active_companies: activeCompanies.map(c => c.slug || c) },
            created_at:    now(),
            updated_at:    now(),
            iteration:     0,
            result:        null,
            result_path:   null,
        };

        await INVOKE_AGENT('seo-orchestrator', planningTask);

        logEvent('[PLAN] Delta evaluation complete. New tasks added to queue if thresholds crossed.');
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

module.exports = { runHeartbeat, INVOKE_AGENT, loadQueue, saveQueue, loadCompanies, loadScopeFlags, loadMissingDeps, loadCompanyQueue, saveCompanyQueue, getCompanyQueuePath };
