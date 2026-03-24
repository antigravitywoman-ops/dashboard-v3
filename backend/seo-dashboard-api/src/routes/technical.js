const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const { checkCompanyAccess } = require('../middleware/permissions');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(__dirname, '..', '..', 'openclaw-seo');

// Ensure technical folder structure exists
async function ensureTechnicalFolders(techDir) {
  const auditsDir = path.join(techDir, 'audits');
  try {
    await fs.access(auditsDir);
  } catch {
    await fs.mkdir(auditsDir, { recursive: true });
  }
}

// Generate audit summary from audit JSON (handles missing fields, varying formats, and missing summary object)
function extractAuditSummary(audit) {
  const summary = audit.summary || {};

  // Fallback: derive counts from critical_issues / high_issues / medium_issues / low_issues arrays
  const critical_issues = Array.isArray(audit.critical_issues) ? audit.critical_issues : [];
  const high_issues = Array.isArray(audit.high_issues) ? audit.high_issues : [];
  const medium_issues = Array.isArray(audit.medium_issues) ? audit.medium_issues : [];
  const low_issues = Array.isArray(audit.low_issues) ? audit.low_issues : [];

  const critical = summary.critical ?? (critical_issues.length || 0);
  const high = summary.high ?? (high_issues.length || 0);
  const medium = summary.medium ?? (medium_issues.length || 0);
  const low = summary.low ?? (low_issues.length || 0);
  const fixed = summary.fixed ?? 0;

  // Compute total_issues — use explicit field, or fall back to sum of severity buckets
  const explicitTotal = summary.total_issues ?? 0;
  const computedTotal = critical + high + medium + low;
  const total_issues = explicitTotal || computedTotal || 0;

  return {
    total_issues,
    critical,
    high,
    medium,
    low,
    fixed
  };
}

// Parse markdown snapshot into structured data
function parseSnapshotMarkdown(raw) {
  if (!raw) return null;
  const lines = raw.split('\n');
  const result = {
    generated_at: null,
    period: null,
    gsc: null,
    ga4: null,
    delta: null,
    top_pages: [],
    top_queries: [],
    keywords: [],
    technical_health: null,
    action_items: [],
    notes: []
  };
  let currentSection = null;
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';

    // Meta
    if (line.startsWith('**Generated:**') || line.startsWith('Generated:')) {
      result.generated_at = line.replace(/[*_]/g, '').replace('Generated:', '').trim();
    }
    if (line.startsWith('**Period:**') || line.startsWith('Period:')) {
      result.period = line.replace(/[*_]/g, '').replace('Period:', '').trim();
    }

    // Section headers
    if (line.startsWith('## ') || line.startsWith('### ')) {
      const header = line.replace(/^#{2,3}\s*/, '').toLowerCase();
      currentSection = header;
      inTable = false;
      continue;
    }

    // Parse metric lines (e.g. "Impressions: 52,300")
    const metricMatch = line.match(/^[*_]?(.+?):[*_]?\s*([\d,.]+)/);
    if (metricMatch && currentSection) {
      const key = metricMatch[1].replace(/[*_]/g, '').trim();
      const value = metricMatch[2].replace(/,/g, '');
      const numVal = parseFloat(value);

      if (currentSection.includes('google search console') || currentSection === 'search console metrics') {
        if (!result.gsc) result.gsc = {};
        const k = key.toLowerCase().replace(/\s+/g, '_');
        result.gsc[k] = isNaN(numVal) ? value : numVal;
      } else if (currentSection.includes('google analytics') || currentSection === 'analytics metrics') {
        if (!result.ga4) result.ga4 = {};
        const k = key.toLowerCase().replace(/\s+/g, '_');
        result.ga4[k] = isNaN(numVal) ? value : numVal;
      } else if (currentSection.includes('delta') || currentSection === 'changes vs previous period') {
        if (!result.delta) result.delta = {};
        const k = key.toLowerCase().replace(/\s+/g, '_');
        result.delta[k] = isNaN(numVal) ? value : numVal;
      }
    }

    // Detect table rows (| col1 | col2 | ...)
    if (line.startsWith('|') && !line.match(/^\|\s*[-:]+\s*\|/)) {
      const cells = line.split('|').filter(c => c.trim() && !c.trim().match(/^[-:]+$/));
      if (cells.length >= 2) {
        const row = cells.map(c => c.trim());
        inTable = true;

        // GSC summary table: | Metric | Value | WoW Delta | Trend |
        if (currentSection?.includes('search console') || currentSection === 'search console (gsc)') {
          if (row[0] && row[0] !== 'Metric' && row[0] !== 'metric') {
            // Normalise metric names to match frontend expectations
            let key = row[0].toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            if (key === 'total_impressions') key = 'impressions';
            else if (key === 'total_clicks') key = 'clicks';
            else if (key === 'total_ctr') key = 'ctr';
            const value = parseFloat(row[1]?.replace(/,/g, '').replace(/%/g, '')) || 0;
            if (!result.gsc) result.gsc = {};
            // Store as-is so frontend can format
            result.gsc[key] = row[1] || '';
            // Extract delta value (e.g. "+12.3%" or "-1.2")
            const deltaStr = row[2] || '';
            const deltaNum = parseFloat(deltaStr.replace(/[+%pp]/g, '')) || 0;
            if (!result.delta) result.delta = {};
            result.delta[key] = isNaN(deltaNum) ? deltaStr : deltaNum;
          }
        }

        // GA4 summary table: | Metric | Value | WoW Delta | Trend |
        else if (currentSection?.includes('analytics') || currentSection === 'analytics (ga4)') {
          if (row[0] && row[0] !== 'Metric' && row[0] !== 'metric') {
            // Normalise metric names to match frontend expectations
            let key = row[0].toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
            if (key === 'organic_sessions') key = 'sessions';
            const value = row[1] || '';
            if (!result.ga4) result.ga4 = {};
            result.ga4[key] = value;
          }
        }

        else if (currentSection === 'top pages' || currentSection?.includes('top pages')) {
          if (row[0] && !['URL', 'Page', 'page'].includes(row[0])) {
            result.top_pages.push({
              url: row[0],
              impressions: parseInt(String(row[1] || '0').replace(/,/g, '')) || 0,
              clicks: parseInt(String(row[2] || '0').replace(/,/g, '')) || 0,
              ctr: parseFloat(String(row[3] || '0').replace(/%/g, '')) || 0,
              avg_position: parseFloat(String(row[4] || '0')) || 0
            });
          }
        } else if (currentSection === 'top queries' || currentSection?.includes('top queries') || currentSection?.includes('search queries')) {
          if (row[0] && !['Query', 'Keyword', 'query', 'keyword'].includes(row[0])) {
            result.top_queries.push({
              query: row[0],
              impressions: parseInt(String(row[1] || '0').replace(/,/g, '')) || 0,
              clicks: parseInt(String(row[2] || '0').replace(/,/g, '')) || 0,
              ctr: parseFloat(String(row[3] || '0').replace(/%/g, '')) || 0,
              avg_position: parseFloat(String(row[4] || '0')) || 0
            });
          }
        } else if (currentSection === 'keyword rankings' || currentSection?.includes('keyword rankings') || currentSection === 'rankings') {
          if (row[0] && !['Keyword', 'Query', 'keyword', 'query'].includes(row[0])) {
            const prevStr = String(row[1] || '0');
            const currStr = String(row[2] || '0');
            result.keywords.push({
              keyword: row[0],
              previous: parseFloat(prevStr) || 0,
              current: parseFloat(currStr) || 0,
              delta: parseFloat(String(row[3] || '0').replace(/[+\s]/g, '')) || 0,
              volume: parseInt(String(row[4] || '0').replace(/,/g, '')) || 0,
              difficulty: parseFloat(String(row[5] || '0')) || 0
            });
          }
        }
      }
    } else if (!line.startsWith('|') && inTable) {
      inTable = false;
    }

    // Action items — both checkbox style and numbered list
    const isActionSection = currentSection?.includes('action');
    if (isActionSection) {
      // Checkbox style: - [ ] or - [x]
      if (line.startsWith('- [ ]') || line.startsWith('- [x]') || line.startsWith('* [ ]') || line.startsWith('* [x]')) {
        const done = /\[x\]/i.test(line);
        const text = line.replace(/^[-*]\s*\[[xX]?\]\s*/, '').replace(/[*_\[\]]/g, '').trim();
        result.action_items.push({ text, done });
      }
      // Numbered style: 1. **[CRITICAL]** Text
      const numberedMatch = line.match(/^\d+\.\s*(\*\*|)(CRITICAL|HIGH|MEDIUM|LOW)(\*\*|)\s*(.+)/i);
      if (numberedMatch) {
        const priority = numberedMatch[2].toUpperCase();
        const text = numberedMatch[4].replace(/[*_]/g, '').trim();
        result.action_items.push({ text, priority, done: false });
      }
    }

    // Technical health score
    const healthMatch = line.match(/health[^:]*(score|rating)[^:]*:\s*([\d.]+)/i);
    if (healthMatch) {
      result.technical_health = parseFloat(healthMatch[2]);
    }
  }

  // Trim arrays to reasonable size
  result.top_pages = result.top_pages.slice(0, 10);
  result.top_queries = result.top_queries.slice(0, 10);
  result.keywords = result.keywords.slice(0, 20);
  result.action_items = result.action_items.slice(0, 15);

  return result;
}

// Get technical overview
router.get('/:slug/technical', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const techDir = path.join(OPENCLAW_DIR, 'companies', slug, 'technical');

    try {
      await fs.access(techDir);
    } catch {
      // Create technical folder structure for new companies
      await ensureTechnicalFolders(techDir);
      return res.json({ audits: [], issues: [], snapshot: null, _initialized: true });
    }

    // Ensure audits directory exists
    await ensureTechnicalFolders(techDir);

    const auditsDir = path.join(techDir, 'audits');
    let audits = [];

    try {
      const auditEntries = await fs.readdir(auditsDir);
      for (const entry of auditEntries) {
        if (entry.endsWith('.json') && !entry.endsWith('.meta.json')) {
          try {
            const content = await fs.readFile(path.join(auditsDir, entry), 'utf-8');
            const audit = JSON.parse(content);
            // Resolve pages_crawled from multiple possible fields
            const pagesCount = audit.pages_crawled
              ?? (Array.isArray(audit.pages) ? audit.pages.length : 0)
              ?? (audit.crawl_meta?.total_pages ?? 0);

            audits.push({
              filename: entry,
              timestamp: audit.crawl_timestamp || audit.timestamp || new Date().toISOString(),
              pages_crawled: pagesCount,
              summary: extractAuditSummary(audit),
              health_score: audit.health_score ?? null,
              meta_summary: audit.meta_summary ?? null,
              highlights: Array.isArray(audit.highlights) ? audit.highlights : null
            });
          } catch {
            // Skip invalid JSON files
          }
        }
      }
    } catch {}

    audits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    let issues = [];
    try {
      const issuesPath = path.join(techDir, 'issues-log.md');
      const content = await fs.readFile(issuesPath, 'utf-8');
      const lines = content.split('\n');

      let currentSeverity = null;
      let currentType = null;

      for (const line of lines) {
        const trimmed = line.trim();

        // Track current issue type from section headers: ### [MEDIUM] MISSING_CANONICAL_HOMEPAGE
        const headerMatch = trimmed.match(/^#{1,3}\s*\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s*(.+)/i);
        if (headerMatch) {
          currentSeverity = headerMatch[1].toUpperCase();
          currentType = headerMatch[2].trim();
          // Don't push the header alone — wait for the message body
          continue;
        }

        // Extract - **Message**: ... body lines (crawl-browser format)
        // Format: - **Message**: Homepage has no canonical tag.
        const msgMatch = trimmed.match(/^[-*]\s+\*\*Message\*\*:\s*(.+)/i);
        if (msgMatch) {
          const message = msgMatch[1].trim();
          if (currentType) {
            // Combine type + message with severity badge
            issues.push(`[${currentSeverity || 'ISSUE'}] ${currentType} — ${message}`);
          } else {
            issues.push(message);
          }
          currentSeverity = null;
          currentType = null;
          continue;
        }

        // Extract - **Fix**: ... lines (show as standalone if no prior message)
        const fixMatch = trimmed.match(/^[-*]\s+\*\*Fix\*\*:\s*(.+)/i);
        if (fixMatch) {
          const fix = fixMatch[1].trim();
          if (!currentType) {
            // Fallback: no prior header, show fix text
            issues.push(`Fix: ${fix}`);
          }
          continue;
        }

        // Blockquote: > Source: crawl-browser ... (source attribution — skip)
        if (trimmed.startsWith('>')) {
          // Strip severity from blockquote-prefixed issues if any
          const inner = trimmed.substring(1).trim();
          const cleaned = inner.replace(/^\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s*/i, '').trim();
          if (cleaned && !cleaned.toLowerCase().startsWith('source:')) {
            issues.push(cleaned);
          }
          continue;
        }

        // Standard bullet (plain): - Something went wrong with the homepage
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const bullet = trimmed.substring(1).trim();
          // Skip known sub-field prefixes
          if (bullet.startsWith('**') || bullet.startsWith('- ') || bullet.startsWith('* ')) continue;
          if (bullet.match(/^(SEO Impact|Affected URLs|Fix|Message):/i)) continue;
          if (bullet) issues.push(bullet);
          continue;
        }

        // Reset context after blank lines
        if (!trimmed) {
          currentSeverity = null;
          currentType = null;
        }
      }
    } catch {}

    let snapshotRaw = null;
    try {
      const snapshotPath = path.join(techDir, 'current-snapshot.md');
      snapshotRaw = await fs.readFile(snapshotPath, 'utf-8');
    } catch {}

    const snapshot = parseSnapshotMarkdown(snapshotRaw);

    res.json({
      audits,
      issues,
      snapshot,
      snapshot_raw: snapshotRaw,
      _has_audits: audits.length > 0,
      _has_issues: issues.length > 0,
      _has_snapshot: snapshotRaw !== null
    });
  } catch (err) {
    next(err);
  }
});

// Get specific audit
router.get('/:slug/technical/audits/:filename', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, filename } = req.params;
    const auditPath = path.join(OPENCLAW_DIR, 'companies', slug, 'technical', 'audits', filename);

    try {
      const content = await fs.readFile(auditPath, 'utf-8');
      const audit = JSON.parse(content);
      res.json(audit);
    } catch {
      return res.status(404).json({ error: 'Audit not found' });
    }
  } catch (err) {
    next(err);
  }
});

// Get issues log
router.get('/:slug/technical/issues', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const issuesPath = path.join(OPENCLAW_DIR, 'companies', slug, 'technical', 'issues-log.md');

    try {
      const content = await fs.readFile(issuesPath, 'utf-8');
      res.type('text/markdown').send(content);
    } catch {
      res.json({ issues: [] });
    }
  } catch (err) {
    next(err);
  }
});

// Get current snapshot
router.get('/:slug/technical/snapshot', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const snapshotPath = path.join(OPENCLAW_DIR, 'companies', slug, 'technical', 'current-snapshot.md');

    try {
      const content = await fs.readFile(snapshotPath, 'utf-8');
      res.type('text/markdown').send(content);
    } catch {
      res.status(404).json({ error: 'Snapshot not found' });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
