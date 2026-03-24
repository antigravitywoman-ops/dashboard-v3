const express = require('express');
const router = express.Router();
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const { checkCompanyAccess, requireRole } = require('../middleware/permissions');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(__dirname, '..', '..', 'openclaw-seo');

// ─────────────────────────────────────────────
// Sync missing-dependencies.md from .env
// Called immediately after .env is written so
// agents see fresh credential state on next run.
// ─────────────────────────────────────────────

/**
 * Parse .env content into KEY→value map (non-empty values only).
 */
function parseEnvContent(content) {
    const env = {};
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
        const eqIdx = trimmed.indexOf('=');
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (val) env[key] = val;
    }
    return env;
}

/**
 * Sync the credential status table in missing-dependencies.md against .env.
 * Only updates Status column for KEY rows in the Credentials table (has "Blocks" col).
 * Leaves all other content untouched. Updates last_checked timestamp.
 */
async function syncMissingDepsFromEnv(slug) {
    const depPath = path.join(OPENCLAW_DIR, 'companies', slug, 'about', 'missing-dependencies.md');
    const envPath = path.join(OPENCLAW_DIR, 'companies', slug, '.env');
    if (!fs.existsSync(depPath)) return;

    let envContent = '';
    try { envContent = await fsp.readFile(envPath, 'utf-8'); } catch {}
    const env = parseEnvContent(envContent);

    let content = await fsp.readFile(depPath, 'utf-8');
    const lines = content.split('\n');
    const now = new Date().toISOString();
    let changed = false;

    const newLines = lines.map(line => {
        const fields = line.split('|').map(f => f.trim());
        // Credentials table rows: | `KEY` | Category | Priority | Status | Blocks |
        if (fields.length >= 5 && fields[1].startsWith('`') && fields[1].endsWith('`') && fields[3] !== 'Blocks') {
            return line;
        }
        if (fields.length >= 5 && fields[1].startsWith('`') && fields[1].endsWith('`') && fields[3] === 'Blocks') {
            const key = fields[1].slice(1, -1);
            const oldStatus = fields[4];

            let newStatus;
            if (key === '.env file') {
                newStatus = fs.existsSync(envPath) ? 'present' : 'missing';
            } else if (env[key] !== undefined) {
                const display = env[key].length > 60 ? env[key].slice(0, 60) + '...' : env[key];
                newStatus = 'present — ' + display;
            } else {
                newStatus = 'missing';
            }

            if (newStatus !== oldStatus) {
                changed = true;
                const updatedFields = [...fields];
                updatedFields[4] = newStatus;
                return '| ' + updatedFields.join(' | ') + ' |';
            }
        }
        return line;
    });

    if (!changed) return;

    let newContent = newLines.join('\n')
        .replace(/^last_checked:\s*.*$/m, 'last_checked: ' + now)
        .replace(/^generated_by:\s*.*$/m, 'generated_by: api-sync');

    await fsp.writeFile(depPath, newContent);
    console.log('[env] Synced missing-dependencies.md for ' + slug);
}

// Get env vars (masked)
router.get('/:slug/env', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const envFile = path.join(OPENCLAW_DIR, 'companies', slug, '.env');

    try {
      await fsp.access(envFile);
    } catch {
      return res.status(404).json({ error: '.env file not found' });
    }

    const content = await fsp.readFile(envFile, 'utf-8');
    const vars = parseEnvFile(content);
    const maskedVars = maskSensitiveVars(vars);
    const userRole = req.companyAccess?.role || null;

    res.json({ env: maskedVars, userRole });
  } catch (err) {
    next(err);
  }
});

// Update env vars (requires ADMIN)
router.put('/:slug/env', checkCompanyAccess, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { vars } = req.body;

    if (!vars || typeof vars !== 'object') {
      return res.status(400).json({ error: 'Missing vars object in request body' });
    }

    const envFile = path.join(OPENCLAW_DIR, 'companies', slug, '.env');

    let existingContent = '';
    try {
      existingContent = await fsp.readFile(envFile, 'utf-8');
    } catch {}

    const existingVars = parseEnvFile(existingContent);
    const mergedVars = { ...existingVars, ...vars };

    const newContent = Object.entries(mergedVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n';

    await fsp.writeFile(envFile, newContent, 'utf-8');

    // Sync missing-dependencies.md immediately so agents see fresh state
    await syncMissingDepsFromEnv(slug);

    const maskedVars = maskSensitiveVars(mergedVars);
    res.json({ success: true, env: maskedVars });
  } catch (err) {
    next(err);
  }
});

function parseEnvFile(content) {
  const vars = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();

      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      vars[key] = value;
    }
  }

  return vars;
}

function maskSensitiveVars(vars) {
  const sensitiveKeys = [
    'PASSWORD', 'SECRET', 'KEY', 'TOKEN', 'API_KEY', 'APP_PASSWORD',
    'CLIENT_SECRET', 'REFRESH_TOKEN', 'ACCESS_TOKEN', 'PRIVATE_KEY'
  ];

  const masked = {};
  for (const [key, value] of Object.entries(vars)) {
    const isSensitive = sensitiveKeys.some(k => key.toUpperCase().includes(k));
    if (isSensitive) {
      masked[key] = value && value !== 'missing' ? '********' : value;
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

module.exports = router;
