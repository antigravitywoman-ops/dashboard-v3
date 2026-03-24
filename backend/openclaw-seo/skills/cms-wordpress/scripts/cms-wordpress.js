/**
 * Skill: cms-wordpress
 * Description: REST API adapter for reading, patching, and backing up WordPress content.
 *              Auto-detects credential failures and updates missing-dependencies.md.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ── Env loader ──────────────────────────────────────────────────────────────────
function loadEnv(companySlug) {
    const base = path.join(__dirname, '..', '..', '..', '..', '..');
    const envPath = path.join(base, 'companies', companySlug, '.env');
    const env = {};
    if (!fs.existsSync(envPath)) return env;
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const eq = trimmed.indexOf('=');
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        env[key] = val;
    }
    return env;
}

// ── Missing Dependencies Sync ───────────────────────────────────────────────────
function updateMissingDepsStatus(companySlug, key, status, reason = '') {
    const base = path.join(__dirname, '..', '..', '..', '..', '..');
    const depPath = path.join(base, 'companies', companySlug, 'about', 'missing-dependencies.md');
    if (!fs.existsSync(depPath)) {
        console.log(`[cms-wordpress] [!] missing-dependencies.md not found for ${companySlug} — skipping ${key}`);
        return;
    }

    const now = new Date().toISOString() + 'Z';
    const lines = fs.readFileSync(depPath, 'utf-8').split('\n');
    const displayStatus = status + (reason ? ` — ${reason}` : '');
    let changed = false;

    const newLines = lines.map(line => {
        // Match: | `KEY` | Category | Priority | Status | Blocks |
        // The Status column is the 4th field
        const match = line.match(/^(\|\s*`([^`]+)`\s*\|[^|]+\|[^|]+\|)\s*[^*`\n][^|]*?(\s*\|)/);
        if (!match) return line;
        const rowKey = match[2].trim();
        if (rowKey.startsWith('-')) return line; // skip separator rows
        if (rowKey !== key) return line;
        const oldStatus = match[0].match(/\|[^|]+\|[^|]+\|[^|]+\|\s*([^*`\n][^|]*?)\s*\|/)?.[1]?.trim() || '';
        if (oldStatus === displayStatus) return line;
        changed = true;
        return match[1] + ' ' + displayStatus + match[3];
    });

    if (!changed) return;

    let content = newLines.join('\n');
    content = content.replace(/^last_checked:\s*.*$/m, `last_checked: ${now}`);
    content = content.replace(/^generated_by:\s*.*$/m, 'generated_by: runtime-detected');
    fs.writeFileSync(depPath, content);
    console.log(`[cms-wordpress] [DEPS] Updated missing-dependencies.md: ${key} → ${displayStatus}`);
}

function flagWPCredsMissing(companySlug, username, appPassword) {
    if (!username || !username.trim()) {
        updateMissingDepsStatus(companySlug, 'WP_USERNAME', 'missing', 'blank in .env — runtime check');
    }
    if (!appPassword || !appPassword.trim()) {
        updateMissingDepsStatus(companySlug, 'WP_APP_PASSWORD', 'missing', 'blank in .env — runtime check');
    }
}

// ── HTTP helper (no external deps) ─────────────────────────────────────────────
function httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const lib = urlObj.protocol === 'https:' ? https : http;
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: 15000,
        };
        const req = lib.request(reqOptions, res => {
            let body = '';
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
        if (options.body) req.write(options.body);
        req.end();
    });
}

// ── REST API client with auth ───────────────────────────────────────────────────
class WPRestClient {
    constructor(siteUrl, username, appPassword, companySlug) {
        this.site = siteUrl.replace(/\/$/, '');
        this.username = username;
        this.appPassword = appPassword;
        this.companySlug = companySlug;
        this.creds = Buffer.from(`${username}:${appPassword}`).toString('base64');
    }

    async request(method, endpoint, body = null) {
        const url = `${this.site}/wp-json/wp/v2/${endpoint}`;
        const headers = {
            'Authorization': `Basic ${this.creds}`,
            'User-Agent': 'openclaw-seo/1.0',
            'Content-Type': 'application/json',
        };
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);
        return httpRequest(url, options);
    }

    async verifyAuth() {
        try {
            const res = await this.request('GET', 'users/me');
            return { ok: res.status === 200, status: res.status, body: res.body };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }

    async getPost(postId) {
        const res = await this.request('GET', `posts/${postId}?context=edit`);
        if (res.status !== 200) {
            return { ok: false, status: res.status, body: res.body };
        }
        try {
            return { ok: true, data: JSON.parse(res.body) };
        } catch (_) {
            return { ok: false, status: res.status, body: res.body };
        }
    }

    async updatePost(postId, fields) {
        const res = await this.request('POST', `posts/${postId}`, fields);
        return { ok: res.status === 200 || res.status === 201, status: res.status, body: res.body };
    }

    async backupPost(postId) {
        const post = await this.getPost(postId);
        if (!post.ok) return post;
        const backupDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
        const backupFile = path.join(backupDir, `cms-patch-${postId}-${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(post.data, null, 2));
        console.log(`[cms-wordpress] Backup saved: ${backupFile}`);
        return { ok: true, backupFile };
    }
}

// ── Auth check + credential flagging ───────────────────────────────────────────
async function checkAndFlagCredentials(companySlug, env) {
    const username = env.WP_USERNAME || '';
    const appPassword = env.WP_APP_PASSWORD || '';
    const siteUrl = env.WP_SITE_URL || '';

    // Flag blank credentials immediately
    const blankUser = !username || !username.trim();
    const blankPass = !appPassword || !appPassword.trim();

    if (blankUser || blankPass) {
        if (blankUser) {
            console.log('[cms-wordpress] [!] WP_USERNAME is blank — flagging as missing');
            updateMissingDepsStatus(companySlug, 'WP_USERNAME', 'missing', 'blank in .env — runtime check');
        }
        if (blankPass) {
            console.log('[cms-wordpress] [!] WP_APP_PASSWORD is blank — flagging as missing');
            updateMissingDepsStatus(companySlug, 'WP_APP_PASSWORD', 'missing', 'blank in .env — runtime check');
        }
        return { ok: false, reason: 'blank-credentials' };
    }

    // Attempt auth verification
    const client = new WPRestClient(siteUrl, username, appPassword, companySlug);
    const authResult = await client.verifyAuth();

    if (!authResult.ok) {
        if (authResult.status === 401) {
            console.log('[cms-wordpress] [!] REST auth returned 401 — escalating to wp-technical');
            // Flag as auth-failure so missing-dependencies reflects the broken state
            updateMissingDepsStatus(companySlug, 'WP_APP_PASSWORD', 'missing', 'auth failed (401) — runtime check');
        } else if (authResult.error) {
            console.log(`[cms-wordpress] [!] Auth check failed: ${authResult.error}`);
        }
        return { ok: false, reason: 'auth-failed', status: authResult.status };
    }

    console.log('[cms-wordpress] [✓] REST auth verified');
    return { ok: true, client };
}

// ── Main execute ───────────────────────────────────────────────────────────────
async function execute(args, context) {
    const { action, postId, content, companySlug } = args;

    console.log(`[cms-wordpress] Executing ${action} on post: ${postId}`);

    const slug = companySlug || context?.company || 'unknown';
    const env = loadEnv(slug);

    if (action === 'backup') {
        if (!postId) return { status: 'error', reason: 'postId required' };
        const auth = await checkAndFlagCredentials(slug, env);
        if (!auth.ok) {
            return { status: 'blocked', reason: 'credential-check-failed', detail: auth.reason };
        }
        const result = await auth.client.backupPost(postId);
        return result;
    }

    if (action === 'patch' || action === 'publish') {
        if (!postId) return { status: 'error', reason: 'postId required' };
        const auth = await checkAndFlagCredentials(slug, env);
        if (!auth.ok) {
            // Escalate to wp-technical if auth looks like it might work with auth-resolve
            if (auth.reason === 'auth-failed') {
                console.log('[cms-wordpress] [→] Escalating to wp-technical for auth-resolve');
                return {
                    status: 'escalated',
                    reason: 'auth-failed',
                    escalate_to: 'wp-technical',
                    action: 'auth-resolve',
                    detail: 'cms-wordpress received 401 — wp-technical should run auth-resolve first',
                };
            }
            return { status: 'blocked', reason: 'credential-check-failed', detail: auth.reason };
        }

        // Backup before patching
        await auth.client.backupPost(postId);

        const patchData = {};
        if (content?.title) patchData.title = content.title;
        if (content?.content) patchData.content = content.content;
        if (content?.status) patchData.status = content.status;

        const result = await auth.client.updatePost(postId, patchData);
        return {
            status: result.ok ? 'success' : 'error',
            action,
            postId,
            httpStatus: result.status,
            result: result.body,
        };
    }

    return { status: 'unknown-action', action };
}

// ── CLI entry point ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length >= 1) {
    const companySlug = args[0];
    const action = args.includes('--action=publish') ? 'publish'
        : args.includes('--action=backup') ? 'backup'
        : args.includes('--action=update') ? 'patch'
        : 'unknown';

    const postIdArg = args.find(a => a.startsWith('--post-id='));
    const postId = postIdArg ? parseInt(postIdArg.split('=')[1], 10) : null;

    const draftArg = args.find(a => a.startsWith('--draft='));
    const draftPath = draftArg ? draftArg.split('=')[1] : null;

    let draftContent = null;
    if (draftPath && fs.existsSync(draftPath)) {
        draftContent = JSON.parse(fs.readFileSync(draftPath, 'utf-8'));
    }

    execute(
        { action, postId, content: draftContent, companySlug },
        { company: companySlug }
    ).then(res => {
        console.log(JSON.stringify(res, null, 2));
    }).catch(err => {
        console.error('[cms-wordpress] Error:', err.message);
        process.exit(1);
    });
}

module.exports = { execute };
