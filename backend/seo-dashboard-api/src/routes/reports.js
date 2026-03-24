const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const { checkCompanyAccess } = require('../middleware/permissions');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(__dirname, '..', '..', 'openclaw-seo');

const SHEET_NAMES = {
  '00': 'Digital Presence Baseline',
  '01': 'Executive Summary',
  '02': 'Gap Analysis',
  '03': 'Competitor Analysis',
  '04': 'Twelve Week Plan',
  '05': 'Keyword Research',
  '06': 'Location Pages',
  '07': 'Citations & Backlinks',
  '08': 'YouTube Strategy',
  '09': 'Reddit & Quora',
  '10': 'Review Strategy',
  '11': 'Schema Markup',
  '12': 'Weekly Tasks',
  '13': 'KPIs & Metrics'
};

// Get available report periods
router.get('/:slug/reports/periods', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const reportsDir = path.join(OPENCLAW_DIR, 'companies', slug, 'reports');

    try {
      await fs.access(reportsDir);
    } catch {
      return res.json({ periods: [] });
    }

    const entries = await fs.readdir(reportsDir);
    const periods = [];

    for (const entry of entries) {
      const stat = await fs.stat(path.join(reportsDir, entry));
      if (stat.isDirectory()) {
        periods.push({
          id: entry,
          label: formatPeriodLabel(entry),
          sortKey: entry,
          type: entry.includes('-W') ? 'week' : entry.includes('-Q') ? 'quarter' : 'month',
        });
      }
    }

    periods.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    res.json({ periods });
  } catch (err) {
    next(err);
  }
});

// Get sheets in a period
router.get('/:slug/reports/:period/sheets', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, period } = req.params;
    const sheetsDir = path.join(OPENCLAW_DIR, 'companies', slug, 'reports', period, 'sheets');

    try {
      await fs.access(sheetsDir);
    } catch {
      return res.json({ period, sheets: [] });
    }

    const entries = await fs.readdir(sheetsDir);
    const sheets = [];

    for (const entry of entries) {
      if (entry.endsWith('.md') && !entry.endsWith('.meta.json')) {
        const match = entry.match(/^(\d+)-(.+)\.md$/);
        if (match) {
          const num = match[1];
          const baseName = match[2];
          const sheetId = `${parseInt(num, 10).toString().padStart(2, '0')}-${baseName}`;

          // Try to read full .meta.json sidecar
          let meta = {};
          const metaPath = path.join(sheetsDir, `${num}-${baseName}.meta.json`);
          try {
            const metaContent = await fs.readFile(metaPath, 'utf-8');
            meta = JSON.parse(metaContent);
          } catch {}

          // Try to stat the actual .md file for modified_at fallback
          let modifiedAt = null;
          const sheetPath = path.join(sheetsDir, entry);
          try {
            const stat = await fs.stat(sheetPath);
            modifiedAt = stat.mtime.toISOString();
          } catch {}

          // Normalize generated_at to ISO string
          let generatedAt = null;
          if (meta.generated_at) {
            if (typeof meta.generated_at === 'string') {
              // Already ISO or parseable
              generatedAt = new Date(meta.generated_at).toISOString();
            } else if (typeof meta.generated_at === 'number') {
              generatedAt = new Date(meta.generated_at).toISOString();
            }
          }

          // Return ALL fields from .meta.json, plus frontend-friendly fields
          sheets.push({
            number: parseInt(num, 10),
            name: SHEET_NAMES[num] || baseName.replace(/-/g, ' '),
            filename: entry,
            sheet_id: meta.sheet_id || sheetId,
            sheet_name: meta.sheet_name || SHEET_NAMES[num] || baseName.replace(/-/g, ' '),
            period: period,
            content_hash: meta.content_hash || null,
            validation_status: meta.validation_status || 'pending',
            validation_errors: meta.validation_errors || null,
            summary: meta.summary || null,
            highlights: meta.highlights || null,
            keywords_count: meta.keywords_count ?? null,
            competitors_analyzed: meta.competitors_analyzed ?? null,
            gaps_identified: meta.gaps_identified ?? null,
            tasks_generated: meta.tasks_generated ?? null,
            data_sources: meta.data_sources || [],
            linked_sheets: meta.linked_sheets || [],
            generated_at: generatedAt,
            generated_by: meta.generated_by || null,
            modified_at: meta.modified_at || modifiedAt || null,
          });
        }
      }
    }

    sheets.sort((a, b) => a.number - b.number);
    res.json({ period, sheets });
  } catch (err) {
    next(err);
  }
});

// Get specific sheet content
router.get('/:slug/reports/:period/sheets/:num', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, period, num } = req.params;
    const sheetsDir = path.join(OPENCLAW_DIR, 'companies', slug, 'reports', period, 'sheets');

    try {
      await fs.access(sheetsDir);
    } catch {
      return res.status(404).json({ error: 'Period not found' });
    }

    const entries = await fs.readdir(sheetsDir);
    const sheetFile = entries.find(e => e.startsWith(`${num.padStart(2, '0')}-`) && e.endsWith('.md'));

    if (!sheetFile) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    const content = await fs.readFile(path.join(sheetsDir, sheetFile), 'utf-8');
    res.json({ period, sheet: num, filename: sheetFile, content });
  } catch (err) {
    next(err);
  }
});

// Update sheet content
router.put('/:slug/reports/:period/sheets/:num', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, period, num } = req.params;
    const { content } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid content field' });
    }

    const sheetsDir = path.join(OPENCLAW_DIR, 'companies', slug, 'reports', period, 'sheets');

    try {
      await fs.access(sheetsDir);
    } catch {
      return res.status(404).json({ error: 'Period not found' });
    }

    const entries = await fs.readdir(sheetsDir);
    const sheetFile = entries.find(e => e.startsWith(`${num.padStart(2, '0')}-`) && e.endsWith('.md'));

    if (!sheetFile) {
      return res.status(404).json({ error: 'Sheet not found' });
    }

    const sheetPath = path.join(sheetsDir, sheetFile);
    const metaPath = path.join(sheetsDir, sheetFile.replace('.md', '.meta.json'));

    // Write updated content
    await fs.writeFile(sheetPath, content, 'utf-8');

    // Update meta.json
    let meta = {};
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      meta = JSON.parse(metaContent);
    } catch {}

    const newHash = crypto.createHash('sha256').update(content).digest('hex');
    const now = new Date().toISOString();

    meta.content_hash = newHash;
    meta.modified_at = now;
    // If no generated_at was set, set it now
    if (!meta.generated_at) {
      meta.generated_at = now;
    }

    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    res.json({ success: true, modified_at: now, content_hash: newHash });
  } catch (err) {
    next(err);
  }
});

// Download Excel output
router.get('/:slug/reports/:period/output', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, period } = req.params;
    const outputDir = path.join(OPENCLAW_DIR, 'companies', slug, 'reports', period);

    try {
      const entries = await fs.readdir(outputDir);
      const excelFile = entries.find(e => e.endsWith('.xlsx') || e.endsWith('.xls'));

      if (!excelFile) {
        return res.status(404).json({ error: 'No output file found' });
      }

      const filePath = path.join(outputDir, excelFile);
      const stats = await fs.stat(filePath);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${excelFile}"`);
      res.setHeader('Content-Length', stats.size);

      const fileBuffer = await fs.readFile(filePath);
      res.send(fileBuffer);
    } catch {
      return res.status(404).json({ error: 'No output file found' });
    }
  } catch (err) {
    next(err);
  }
});

function formatPeriodLabel(period) {
  if (period.includes('-Q')) {
    const [year, q] = period.split('-Q');
    return `Q${q} ${year}`;
  }
  if (period.includes('-W')) {
    const [year, week] = period.split('-W');
    return `Week ${parseInt(week, 10)}, ${year}`;
  }
  const [year, month] = period.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

module.exports = router;
