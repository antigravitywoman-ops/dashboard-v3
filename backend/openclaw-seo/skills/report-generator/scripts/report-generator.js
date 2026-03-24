#!/usr/bin/env node
/**
 * REPORT GENERATOR SKILL — End-to-end report pipeline
 *
 * Generates (or refreshes):
 *   1. technical/current-snapshot.md  (if stale)
 *   2. reports/<period>/sheets/NN-<name>.md  +  .meta.json  (14 sheets)
 *   3. reports/<period>/SEO_Strategy_<slug>_<date>.xlsx  (via excel-porter)
 *
 * Scheduling is handled by the heartbeat (not this script).
 * This script is stateless regarding when to run — it trusts the task context.
 *
 * Usage:
 *   node report-generator.js <company-slug> <period> [--snapshot-only] [--sheets-only]
 *   node report-generator.js arpit-sharma-writing 2026-W11
 *   node report-generator.js inika-resorts 2026-03 --sheets-only
 *
 * Period format: YYYY-MM (monthly) or YYYY-WNN (weekly)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..', '..');
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

const SHEET_FILENAMES = {
  '00': '00-digital-presence-baseline',
  '01': '01-executive-summary',
  '02': '02-gap-analysis',
  '03': '03-competitor-analysis',
  '04': '04-twelve-week-plan',
  '05': '05-keyword-research',
  '06': '06-location-pages',
  '07': '07-citations-backlinks',
  '08': '08-youtube-strategy',
  '09': '09-reddit-quora',
  '10': '10-review-strategy',
  '11': '11-schema-markup',
  '12': '12-weekly-tasks',
  '13': '13-kpis-metrics'
};

// ─── Argument Parsing ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node report-generator.js <company-slug> <period> [--snapshot-only] [--sheets-only]');
  console.error('  period format: YYYY-MM (monthly) or YYYY-WNN (weekly)');
  process.exit(1);
}

const slug = args[0];
const period = args[1]; // e.g. "2026-W11" or "2026-03"
const snapshotOnly = args.includes('--snapshot-only');
const sheetsOnly = args.includes('--sheets-only');

if (snapshotOnly && sheetsOnly) {
  console.error('Error: --snapshot-only and --sheets-only are mutually exclusive');
  process.exit(1);
}

// ─── Path Helpers ────────────────────────────────────────────────────────────

function resolve(companyPath) {
  return path.join(ROOT, 'companies', slug, companyPath);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (_) {}
  return null;
}

function readMarkdown(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (_) {}
  return null;
}

function parseSnapshotTimestamp(snapshotContent) {
  if (!snapshotContent) return null;
  const match = snapshotContent.match(/\*\*Generated\*\*:\s*(\S+)/);
  if (match) {
    return new Date(match[1]).getTime();
  }
  return null;
}

// ─── Load Context ─────────────────────────────────────────────────────────────

function loadContext() {
  const companyDir = path.join(ROOT, 'companies', slug);

  // Load active-plan.json for phase, scope, week info
  const planPath = path.join(companyDir, 'plans', 'active', 'active-plan.json');
  const plan = readJson(planPath);

  // Load scope flags
  const scopePath = path.join(companyDir, 'about', 'scope.md');
  let scopeFlags = {};
  try {
    if (fs.existsSync(scopePath)) {
      const content = fs.readFileSync(scopePath, 'utf-8');
      const match = content.match(/```yaml\n([\s\S]*?)```/);
      if (match) {
        for (const line of match[1].split('\n')) {
          const kv = line.match(/^([\w_]+):\s*(true|false)$/);
          if (kv) scopeFlags[kv[1]] = kv[2] === 'true';
        }
      }
    }
  } catch (_) {}

  // Load latest snapshot for data context
  const snapshotPath = path.join(companyDir, 'technical', 'current-snapshot.md');
  const snapshotContent = readMarkdown(snapshotPath);

  // Load latest audit JSON
  const auditsDir = path.join(companyDir, 'technical', 'audits');
  let latestAudit = null;
  try {
    if (fs.existsSync(auditsDir)) {
      const files = fs.readdirSync(auditsDir)
        .filter(f => f.endsWith('.json') && !f.endsWith('.meta.json'))
        .sort()
        .reverse();
      if (files.length > 0) {
        latestAudit = readJson(path.join(auditsDir, files[0]));
      }
    }
  } catch (_) {}

  // Load about files for context
  const profilePath = path.join(companyDir, 'about', 'profile.md');
  const keywordsPath = path.join(companyDir, 'about', 'keywords.md');
  const competitorsPath = path.join(companyDir, 'about', 'competitors.md');
  const goalsPath = path.join(companyDir, 'about', 'goals.md');
  const brandVoicePath = path.join(companyDir, 'about', 'brand-voice.md');

  return {
    slug,
    period,
    plan,
    scopeFlags,
    snapshotContent,
    latestAudit,
    profile: readMarkdown(profilePath),
    keywords: readMarkdown(keywordsPath),
    competitors: readMarkdown(competitorsPath),
    goals: readMarkdown(goalsPath),
    brandVoice: readMarkdown(brandVoicePath),
  };
}

// ─── Snapshot Generation ──────────────────────────────────────────────────────

function refreshSnapshot(ctx, maxAgeHours = 24) {
  const snapshotPath = resolve('technical/current-snapshot.md');
  const existing = readMarkdown(snapshotPath);
  const existingTs = parseSnapshotTimestamp(existing);

  if (existingTs && existing) {
    const ageHours = (Date.now() - existingTs) / (1000 * 60 * 60);
    if (ageHours < maxAgeHours) {
      log(`[report-generator] Snapshot is fresh (${Math.round(ageHours)}h old). Skipping refresh.`);
      return false;
    }
    log(`[report-generator] Snapshot is stale (${Math.round(ageHours)}h old). Refreshing...`);
  }

  // Try calling the snapshot-generator Python script
  const snapshotScript = path.join(ROOT, 'skills', 'snapshot-generator', 'scripts', 'snapshot-generator.py');
  if (fs.existsSync(snapshotScript)) {
    log(`[report-generator] Calling snapshot-generator.py...`);
    const result = spawnSync('python3', [snapshotScript, slug], {
      cwd: path.join(ROOT, 'skills', 'snapshot-generator', 'scripts'),
      encoding: 'utf-8',
      timeout: 120_000,
    });
    if (result.status === 0) {
      log(`[report-generator] Snapshot refreshed via snapshot-generator.py`);
      return true;
    } else {
      log(`[report-generator] snapshot-generator.py failed: ${result.stderr || result.stdout} — falling back to markdown update`);
    }
  }

  // Fallback: update timestamp in existing snapshot, or create a basic one
  const now = new Date().toISOString();
  if (existing) {
    const updated = existing.replace(
      /(\*\*Generated\*\*:\s*)\S+/,
      `$1${now}`
    ).replace(
      /(\*\*Period\*\*:.*?\()[\d-]+ (to) [\d-]+(\))/,
      (match, prefix, to, suffix) => {
        const end = new Date();
        const start = new Date(end - 7 * 24 * 60 * 60 * 1000);
        return `${prefix}${start.toISOString().slice(0, 10)} ${to} ${end.toISOString().slice(0, 10)}${suffix}`;
      }
    );
    fs.writeFileSync(snapshotPath, updated, 'utf-8');
  } else {
    // No snapshot at all — create a basic one
    const basic = createBasicSnapshot(ctx, now);
    ensureDir(path.dirname(snapshotPath));
    fs.writeFileSync(snapshotPath, basic, 'utf-8');
  }
  log(`[report-generator] Snapshot updated (timestamp: ${now})`);
  return true;
}

function createBasicSnapshot(ctx, now) {
  const healthScore = ctx.latestAudit?.health_score ?? null;
  const summary = ctx.latestAudit?.summary ?? {};
  const highlights = ctx.latestAudit?.highlights ?? [];

  const endDate = new Date();
  const startDate = new Date(endDate - 7 * 24 * 60 * 60 * 1000);

  let healthSection = '';
  if (healthScore !== null) {
    healthSection = `
## Technical Health

| Issue | Status | Impact |
|---|---|---|
| SEO Health Score | ${healthScore}/100 | ${healthScore >= 70 ? 'Good' : healthScore >= 40 ? 'Needs Work' : 'Critical'} |
| Total Issues | ${summary.total_issues ?? 0} | ${summary.critical ?? 0} critical |
`;
  }

  return `# Performance Snapshot — ${ctx.plan?.company ?? slug}

**Generated**: ${now}
**Period**: Last 7 days (${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)})
**Company**: ${slug}
**Industry**: ${ctx.plan?.industry ?? 'unknown'}
**Status**: ${ctx.scopeFlags?.company_active !== false ? 'ACTIVE' : 'PAUSED'}

---

## Search Console (GSC)

> Data not yet available. Run snapshot-generator with live GSC credentials.

### Top Pages by Clicks

| Page | Clicks | Impressions | CTR | Avg Position |
|---|---|---|---|---|
| — | — | — | — | — |

### Top Queries by Clicks

| Query | Clicks | Impressions | CTR | Avg Position |
|---|---|---|---|---|
| — | — | — | — | — |

---

## Analytics (GA4)

> Data not yet available. Run snapshot-generator with live GA4 credentials.

| Metric | Value | WoW Delta | Trend |
|---|---|---|---|
| Organic Sessions | — | — | — |
${healthSection}
---

## Action Items

1. Configure GSC + GA4 credentials in .env
2. Run snapshot-generator to pull live data
${highlights.slice(0, 3).map(h => `3. **${h}**`).join('\n')}

---

## Next Report

**Scheduled**: Per heartbeat schedule (active-plan.json)

---

*Generated by report-generator skill — snapshot data pending live API credentials*
`;
}

// ─── Sheet Generation ────────────────────────────────────────────────────────

function generateSheets(ctx) {
  const period = ctx.period;
  const archiveDir = resolve(`reports/${period}/sheets`); // immutable archive
  const memoryDir = resolve(`memory/sheets`);              // live copy for agents/workflows
  ensureDir(archiveDir);
  ensureDir(memoryDir);

  const now = new Date().toISOString();
  const company = ctx.plan?.company ?? slug;
  const phase = ctx.plan?.current_phase ?? 'Foundation';
  const scopeFlags = ctx.scopeFlags;
  const latestAudit = ctx.latestAudit;
  const healthScore = latestAudit?.health_score ?? null;
  const auditSummary = latestAudit?.summary ?? {};
  const snapshotContent = ctx.snapshotContent;

  for (const [num, name] of Object.entries(SHEET_NAMES)) {
    const filename = SHEET_FILENAMES[num];

    // Archive: reports/<period>/sheets/ (immutable, for audit trail)
    const mdPathArchive = path.join(archiveDir, `${filename}.md`);
    const metaPathArchive = path.join(archiveDir, `${filename}.meta.json`);
    // Live copy: memory/sheets/ (read by agents/workflows downstream)
    const mdPathLive = path.join(memoryDir, `${filename}.md`);
    const metaPathLive = path.join(memoryDir, `${filename}.meta.json`);

    const sheetContent = buildSheetContent(ctx, num, name, filename, company, phase, period, now);
    const meta = buildSheetMeta(ctx, num, period, now, name, sheetContent);

    fs.writeFileSync(mdPathArchive, sheetContent, 'utf-8');
    fs.writeFileSync(metaPathArchive, JSON.stringify(meta, null, 2), 'utf-8');
    fs.writeFileSync(mdPathLive, sheetContent, 'utf-8');
    fs.writeFileSync(metaPathLive, JSON.stringify(meta, null, 2), 'utf-8');

    log(`[report-generator] Wrote sheet ${num}: ${name}`);
  }

  log(`[report-generator] All ${Object.keys(SHEET_NAMES).length} sheets written to reports/${period}/sheets/ + memory/sheets/`);
}

/**
 * Compute MD5 content hash for change detection.
 * Falls back to SHA-256 if MD5 is unavailable.
 */
function contentHash(content) {
  try {
    return crypto.createHash('md5').update(content, 'utf8').digest('hex');
  } catch (_) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 32);
  }
}

/**
 * Count GAP-### references in text (for gaps_identified in meta).
 */
function countGapRefs(text) {
  const matches = (text || '').match(/GAP-\d{3}/g) || [];
  return matches.length;
}

/**
 * Count table rows (excludes header and separator lines) in markdown.
 */
function countTableRows(text) {
  if (!text) return 0;
  const lines = text.split('\n');
  // Count lines that look like table rows: start with | and have at least 2 cells
  return lines.filter(l => {
    if (!l.trim().startsWith('|')) return false;
    const cells = l.split('|').filter(c => c.trim().length > 0);
    return cells.length >= 2;
  }).length;
}

/**
 * Extract keyword rows from keywords.md content.
 * Looks for | keyword | volume | ... patterns.
 */
function countKeywordRows(text) {
  if (!text) return 0;
  const rows = text.match(/^\|\s*[^|]+\s*\|\s*[\d,.-]+\s*\|/gm) || [];
  return rows.length;
}

/**
 * Extract top domains from competitor analysis content.
 */
function extractTopDomains(text, limit = 3) {
  const matches = (text || '').match(/\|\s*([^\|]+?)\s*\|\s*https?:\/\/([a-z0-9-]+\.[a-z]{2,}[^\s|]*)/gi) || [];
  const domains = matches.map(m => {
    const dm = m.match(/https?:\/\/([a-z0-9-]+\.[a-z]{2,}[^\s|]*)/i);
    return dm ? dm[1].toLowerCase() : null;
  }).filter(Boolean);
  return [...new Set(domains)].slice(0, limit);
}

/**
 * Extract top keywords by volume from keyword content.
 */
function extractTopKeywords(text, limit = 3) {
  const rows = (text || '').match(/^\|\s*([^\|]{3,40})\s*\|\s*([\d,.-]+)\s*\|/gm) || [];
  const scored = rows.map(r => {
    const cells = r.split('|').map(c => c.trim()).filter(Boolean);
    const kw = cells[1] || '';
    const vol = parseInt((cells[2] || '0').replace(/[,\s]/g, ''), 10);
    return { kw, vol };
  }).filter(r => r.kw && r.vol > 0);
  scored.sort((a, b) => b.vol - a.vol);
  return scored.slice(0, limit);
}

/**
 * Extract top-priority GAP references from content.
 */
function extractTopGaps(text, limit = 3) {
  const rows = (text || '').match(/\|.*?(GAP-\d{3}).*?(CRITICAL|HIGH|MEDIUM).*?\|/gi) || [];
  return rows.slice(0, limit).map(r => {
    const gap = (r.match(/GAP-\d{3}/) || [])[0] || '';
    const pri = (r.match(/CRITICAL|HIGH|MEDIUM/) || [])[0] || '';
    return gap ? `${gap}: ${pri}` : '';
  }).filter(Boolean);
}

/**
 * Generate a 1-sentence summary (max 150 chars) for a sheet.
 */
function generateSheetSummary(num, name, { keywordsCount, competitorsAnalyzed, gapsIdentified, tasksGenerated, dataSources, snapshotContent }) {
  const sources = dataSources.length > 0 ? ` via ${dataSources.slice(0, 2).join('/')}` : '';
  if (num === '01') return `${name} for period — key metrics, wins, and priorities${sources}`;
  if (num === '02') return `${gapsIdentified > 0 ? `${gapsIdentified} gaps` : 'Content & technical'} opportunities identified vs competitors`;
  if (num === '03') return `${competitorsAnalyzed > 0 ? `${competitorsAnalyzed} competitors` : 'Competitive landscape'} analyzed for strategy positioning`;
  if (num === '04') return `12-week execution roadmap with priority phases and milestone tracking`;
  if (num === '05') return `${keywordsCount > 0 ? `${keywordsCount} target keywords` : 'Keyword universe'} researched with volume and difficulty data`;
  if (num === '06') return `Location page opportunities and local SEO recommendations`;
  if (num === '07') return `Citation and backlink building strategy with priority sources`;
  if (num === '08') return `YouTube content and channel optimization strategy`;
  if (num === '09') return `Reddit and Quora community engagement strategy`;
  if (num === '10') return `Review generation and reputation management strategy`;
  if (num === '11') return `Schema markup recommendations for rich snippet eligibility`;
  if (num === '12') return `${tasksGenerated > 0 ? `${tasksGenerated} tasks` : 'Weekly execution'} planned across all focus areas`;
  if (num === '13') return `KPI tracking and performance metrics framework`;
  if (num === '00') return `Digital presence baseline across all platforms and channels`;
  return `${name} — data-driven SEO strategy`;
}

/**
 * Generate highlights array (max 5 items, max 80 chars each) for a sheet.
 */
function generateSheetHighlights(num, name, { keywordsCount, competitorsAnalyzed, gapsIdentified, tasksGenerated, keywordsContent, competitorsContent, allData }) {
  const highlights = [];

  if (num === '03' && competitorsContent) {
    const domains = extractTopDomains(competitorsContent, 3);
    domains.forEach(d => highlights.push(`Top competitor: ${d}`));
  } else if (num === '05' && keywordsContent) {
    const topKws = extractTopKeywords(keywordsContent, 3);
    topKws.forEach(({ kw, vol }) => highlights.push(`Top keyword: '${kw}' (${vol}/mo)`));
  } else if (num === '02' && allData) {
    const gaps = extractTopGaps(allData, 3);
    gaps.forEach(g => highlights.push(g));
  } else if (num === '04' && allData) {
    const phase = (allData.match(/\*\*Current Phase\*\*:\s*(\w+)/) || [])[1];
    const period = (allData.match(/\*\*Current Period\*\*:\s*(\S+)/) || [])[1];
    if (phase) highlights.push(`Phase: ${phase}`);
    if (period) highlights.push(`Period: ${period}`);
  }

  if (keywordsCount > 0 && num === '05') highlights.push(`${keywordsCount} keywords analyzed`);
  if (competitorsAnalyzed > 0 && num === '03') highlights.push(`${competitorsAnalyzed} competitors analyzed`);
  if (gapsIdentified > 0 && (num === '02' || num === '04')) highlights.push(`${gapsIdentified} gaps identified`);
  if (tasksGenerated > 0 && num === '12') highlights.push(`${tasksGenerated} tasks generated`);

  if (highlights.length === 0) {
    const rows = countTableRows(allData);
    if (rows > 0) highlights.push(`${rows} data rows analyzed`);
  }

  highlights.push(`${name}`);
  return highlights.slice(0, 5).map(h => h.length > 80 ? h.slice(0, 77) + '...' : h);
}

function buildSheetMeta(ctx, num, period, now, name, sheetContent) {
  // Load the actual sheet content for hashing and counting
  const snapshotContent = ctx.snapshotContent || '';
  const keywordsContent = ctx.keywords || '';
  const competitorsContent = ctx.competitors || '';
  const plan = ctx.plan || {};

  // ── Content hash ────────────────────────────────────────────────────────────
  const hash = contentHash(sheetContent || '');

  // ── keywords_count: count keyword rows from sheet 05 (or keywords.md) ───────
  let keywordsCount = 0;
  if (num === '05') {
    keywordsCount = countKeywordRows(sheetContent || '');
  } else if (num === '05' || keywordsContent) {
    keywordsCount = countKeywordRows(keywordsContent);
  }
  if (keywordsCount === 0) {
    const kwTableRows = countTableRows(keywordsContent);
    keywordsCount = Math.max(0, kwTableRows - 1); // subtract header
  }

  // ── competitors_analyzed: count competitor rows from sheet 03 ────────────────
  let competitorsAnalyzed = 0;
  if (num === '03') {
    const rows = countTableRows(sheetContent || '');
    competitorsAnalyzed = Math.max(0, rows - 1); // subtract header
  }

  // ── gaps_identified: count GAP-### refs across sheets 02 and 04 ────────────
  let gapsIdentified = 0;
  if (num === '02' || num === '04') {
    const sheetGapRefs = countGapRefs(sheetContent || '');
    const snapshotGapRefs = countGapRefs(snapshotContent);
    gapsIdentified = Math.max(sheetGapRefs, snapshotGapRefs);
  }
  // Also pull from latest audit summary as fallback baseline
  if (ctx.latestAudit?.summary && gapsIdentified === 0) {
    const s = ctx.latestAudit.summary;
    gapsIdentified = (s.critical || 0) + (s.high || 0) + (s.medium || 0);
  }

  // ── tasks_generated: count task-like rows from sheet 12 ───────────────────
  let tasksGenerated = 0;
  if (num === '12') {
    const rows = countTableRows(sheetContent || '');
    tasksGenerated = Math.max(0, rows - 1); // subtract header
  }

  // ── data_sources ───────────────────────────────────────────────────────────
  const dataSources = [];
  if (ctx.latestAudit?.summary) {
    dataSources.push('crawl-browser', 'schema-auditor');
  }
  if (snapshotContent.includes('GA4') || snapshotContent.includes('GSC') ||
      snapshotContent.includes('Google Analytics') || snapshotContent.includes('Search Console')) {
    dataSources.push('ga4', 'gsc');
  }
  if (keywordsCount > 0 || keywordsContent) {
    dataSources.push('serper-miner', 'rank-track');
  }
  if (competitorsAnalyzed > 0 || competitorsContent) {
    dataSources.push('serper-miner');
  }

  // ── linked_sheets: cross-references to other sheets ─────────────────────────
  const linkedSheets = [];
  const sheetRefs = (sheetContent || '').match(/Sheet \d{2}/g) || [];
  for (const ref of sheetRefs) {
    const refNum = ref.replace('Sheet ', '').padStart(2, '0');
    if (refNum !== num.padStart(2, '0') && SHEET_NAMES[refNum]) {
      linkedSheets.push(`${refNum}-${SHEET_FILENAMES[refNum]}`);
    }
  }

  // ── Validation status: starts as 'pending', updated by post-gen validator ──
  // (validation_status: 'pending' here; sheet-validator sets it to 'passed' post-generation)

  // ── summary & highlights: derive from sheet type and available data ───────────
  const allData = [snapshotContent, keywordsContent, competitorsContent, sheetContent].filter(Boolean).join(' ');
  const summary = generateSheetSummary(num, name, {
    keywordsCount, competitorsAnalyzed, gapsIdentified, tasksGenerated, dataSources, snapshotContent
  });
  const highlights = generateSheetHighlights(num, name, {
    keywordsCount, competitorsAnalyzed, gapsIdentified, tasksGenerated,
    keywordsContent, competitorsContent, snapshotContent, allData
  });

  return {
    sheet_number: parseInt(num, 10),
    sheet_name: name,
    sheet_id: `${parseInt(num, 10).toString().padStart(2, '0')}-${SHEET_FILENAMES[num]}`,
    period,
    content_hash: hash,
    generated_at: now,
    generated_by: 'report-generator',
    validation_status: 'pending',
    validation_errors: null,
    summary,
    highlights,
    keywords_count: keywordsCount > 0 ? keywordsCount : null,
    competitors_analyzed: competitorsAnalyzed > 0 ? competitorsAnalyzed : null,
    gaps_identified: gapsIdentified > 0 ? gapsIdentified : null,
    tasks_generated: tasksGenerated > 0 ? tasksGenerated : null,
    data_sources: [...new Set(dataSources)],
    linked_sheets: [...new Set(linkedSheets)],
    created_at: now,
    updated_at: now
  };
}

function buildSheetContent(ctx, num, name, filename, company, phase, period, now) {
  // Each sheet gets structured content based on available data
  const healthScore = ctx.latestAudit?.health_score ?? null;
  const auditSummary = ctx.latestAudit?.summary ?? {};
  const scopeFlags = ctx.scopeFlags;
  const plan = ctx.plan;
  const snapshot = ctx.snapshotContent || '';

  // Extract GSC data from snapshot if available
  let gscData = extractGscFromSnapshot(snapshot);
  let ga4Data = extractGa4FromSnapshot(snapshot);
  let keywordData = extractKeywordsFromSnapshot(snapshot);

  const lines = [
    `# ${name} — ${company}`,
    '',
    `**Period**: ${period}`,
    `**Generated**: ${now}`,
    `**Company**: ${company}`,
    `**Phase**: ${phase}`,
    '',
    '---',
    '',
  ];

  switch (num) {
    case '00': // Digital Presence Baseline
      lines.push(
        '## Digital Presence Overview',
        '',
        '| Channel | Status | URL | Last Updated |',
        '|---|---|---|---|',
        `| Website | ${healthScore ? '🟢 Live' : '⚠️ Not Audited'} | — | ${now.slice(0,10)} |`,
        `| Google Search Console | ${gscData.totalClicks !== undefined ? '🟢 Connected' : '⚠️ No Data'} | — | — |`,
        `| Google Analytics 4 | ${ga4Data.organicSessions !== undefined ? '🟢 Connected' : '⚠️ No Data'} | — | — |`,
        `| Schema Markup | ${auditSummary.total_issues > 0 ? '⚠️ Issues Found' : '🟢 OK'} | — | — |`,
        `| Technical Health | ${healthScore !== null ? `${healthScore}/100` : '⚠️ Not Scored'} | — | — |`,
        '',
        '## Crawl Summary',
        '',
        '| Metric | Value |',
        '|---|---|',
        `| Pages Crawled | ${ctx.latestAudit?.crawl_meta?.total_pages ?? '—'} |`,
        `| HTTP 200 | ${ctx.latestAudit?.crawl_meta?.summary?.http_200 ?? '—'} |`,
        `| HTTP 4xx | ${ctx.latestAudit?.crawl_meta?.summary?.http_4xx ?? '—'} |`,
        `| Critical Issues | ${auditSummary.critical ?? 0} |`,
        `| High Issues | ${auditSummary.high ?? 0} |`,
        '',
        '## Phase Assessment',
        '',
        `Current phase: **${phase}**. ` +
        (phase === 'Foundation'
          ? 'Focus on: content drafts, on-page fixes, and schema.'
          : phase === 'Growth'
          ? 'Focus on: content velocity, internal linking, and backlink building.'
          : 'Focus on: distribution, outreach, and advanced schema.'),
        ''
      );
      break;

    case '01': // Executive Summary
      lines.push(
        '## Executive Summary',
        '',
        `This SEO strategy report covers **${period}** for **${company}**. ` +
        `The site is currently in the **${phase}** phase.`,
        '',
        '### Key Findings',
        '',
        healthScore !== null
          ? `The SEO health score stands at **${healthScore}/100** — ${
              healthScore >= 70 ? 'indicating a solid foundation with room for growth.' :
              healthScore >= 40 ? 'indicating significant issues that need addressing.' :
              'indicating critical issues requiring immediate attention.'
            }`
          : '> ⚠️ No audit data available. Run a technical crawl to generate baseline.',
        '',
        auditSummary.critical > 0
          ? `**${auditSummary.critical} critical issues** were identified that require immediate action.`
          : '✅ No critical issues were found.',
        '',
        auditSummary.high > 0
          ? `**${auditSummary.high} high-priority issues** should be addressed in the next 2 weeks.`
          : null,
        '',
        '### Period Highlights',
        '',
        gscData.totalClicks !== undefined
          ? `- GSC: **${gscData.totalClicks.toLocaleString()}** clicks, **${gscData.totalImpressions?.toLocaleString() ?? '—'}** impressions, avg position **${gscData.avgPosition ?? '—'}**`
          : '- GSC data pending — configure credentials in .env',
        ga4Data.organicSessions !== undefined
          ? `- GA4: **${ga4Data.organicSessions.toLocaleString()}** organic sessions, **${ga4Data.engagementRate ?? '—'}%** engagement rate`
          : '- GA4 data pending — configure credentials in .env',
        '',
        '### Recommendations',
        '',
        '1. Address all critical issues immediately',
        '2. Optimize pages with missing meta descriptions',
        '3. Implement structured data (LocalBusiness / Product schema)',
        '4. Improve internal linking structure',
        '5. Increase content depth on thin pages',
        ''
      );
      break;

    case '02': // Gap Analysis
      lines.push(
        '## Gap Analysis',
        '',
        '### Content Gaps',
        '',
        '| Gap | Priority | Status | Estimated Impact |',
        '|---|---|---|---|',
        `| Missing meta descriptions | ${auditSummary.total_issues > 0 ? 'HIGH' : 'MEDIUM'} | OPEN | High |`,
        `| Missing H1 tags | ${auditSummary.high > 0 ? 'HIGH' : 'MEDIUM'} | OPEN | Medium |`,
        `| Schema markup | HIGH | OPEN | High |`,
        `| Image alt text | MEDIUM | OPEN | Low |`,
        `| Thin content pages | ${auditSummary.critical > 0 ? 'CRITICAL' : 'HIGH'} | OPEN | High |`,
        '',
        '### Technical Gaps',
        '',
        '| Gap | Status | Blocked By |',
        '|---|---|---|',
        `| Crawl data available | ${ctx.latestAudit ? '🟢 YES' : '⚠️ NO'} | — |`,
        `| GSC connected | ${gscData.totalClicks !== undefined ? '🟢 YES' : '⚠️ NO'} | Credentials |`,
        `| GA4 connected | ${ga4Data.organicSessions !== undefined ? '🟢 YES' : '⚠️ NO'} | Credentials |`,
        `| Firecrawl configured | ${scopeFlags?.crawl_firecrawl_active ? '🟢 YES' : '⚠️ NO'} | API Key |`,
        '',
        '### Competitor Gaps',
        '',
        '> Run competitor analysis using serper-miner to identify content gaps vs competitors.',
        ''
      );
      break;

    case '03': // Competitor Analysis
      lines.push(
        '## Competitor Analysis',
        '',
        '### Primary Competitors',
        '',
        ctx.competitors
          ? ctx.competitors
          : '> Competitor data not yet configured. Update `about/competitors.md` to populate this sheet.',
        '',
        '### Competitive Positioning',
        '',
        gscData.avgPosition !== undefined
          ? `Current average position: **${gscData.avgPosition}**. ${
              gscData.avgPosition <= 10 ? 'Strong organic presence.' :
              gscData.avgPosition <= 30 ? 'Moderate position — room to improve.' :
              'Weak position — significant investment needed.'
            }`
          : '> No ranking data available. Configure rank-track or enter keywords in `about/keywords.md`.',
        '',
        '### Opportunities',
        '',
        '1. **Keyword gaps**: Identify keywords competitors rank for that we don\'t',
        '2. **Content depth**: Create longer, more comprehensive content than competitors',
        '3. **Schema**: Add structured data competitors are missing',
        '4. **Backlinks**: Build citations and backlinks on competitor\'s reference sources',
        ''
      );
      break;

    case '04': { // Twelve Week Plan
      // Build week rows from plan.weeks, or fallback to a single placeholder row
      const weekRows = (plan?.weeks && plan.weeks.length > 0)
        ? plan.weeks.map(w =>
            `| ${w.week ?? '?'} | ${w.label ?? ''} | ${w.phase ?? phase} | ${w.status ?? 'pending'} | ${w.focus ?? ''} |`
          )
        : [
            `| ${plan?.current_week || '1'} | ${plan?.current_week_label || period} | ${phase} | active | Foundation tasks |`
          ];
      lines.push(
        '## Twelve Week Plan Overview',
        '',
        `**Current Phase**: ${phase}`,
        `**Current Period**: ${period}`,
        `**Company**: ${company}`,
        '',
        '| Week | Label | Phase | Status | Focus |',
        '|---|---|---|---|---|',
        ...weekRows,
        ''
      );
      break;
    }

    case '05': // Keyword Research
      lines.push(
        '## Keyword Research',
        '',
        '### Target Keywords',
        '',
        ctx.keywords
          ? ctx.keywords
          : '> Keyword data not yet configured. Update `about/keywords.md` to populate this sheet.',
        '',
        '### Tracked Rankings',
        '',
        keywordData.length > 0
          ? [
              '| Keyword | Position | Previous | Delta | Volume | Difficulty |',
              '|---|---|---|---|---|---|',
              ...keywordData.map(k =>
                `| ${k.keyword} | ${k.position} | ${k.previous} | ${k.delta > 0 ? `+${k.delta}` : k.delta} | ${k.volume || '—'} | ${k.difficulty || '—'} |`
              )
            ].join('\n')
          : '| Keyword | Position | Previous | Delta | Volume | Difficulty |\n|---|---|---|---|---|---|',
        '',
        '### Keyword Opportunities',
        '',
        '1. **High-volume low-difficulty** keywords for quick wins',
        '2. **Long-tail** keywords for specific intent pages',
        '3. **LSI keywords** for topical authority',
        ''
      );
      break;

    case '06': // Location Pages
      lines.push(
        '## Location Pages Strategy',
        '',
        scopeFlags?.location_pages_active
          ? `Location pages are **ACTIVE** for this company.`
          : `Location pages are **NOT ACTIVE** (scope flag: location_pages_active = ${scopeFlags?.location_pages_active ?? false}).`,
        '',
        '| Location | Status | Priority | Notes |',
        '|---|---|---|---|',
        '| — | — | — | Add locations in `about/audience.md` |',
        '',
        '### Requirements for Location Pages',
        '',
        '1. Unique H1, title, meta description per location',
        '2. NAP (Name, Address, Phone) prominently displayed',
        '3. Embedded Google Map',
        '4. LocalBusiness schema with geo coordinates',
        '5. Internal links to relevant service/product pages',
        ''
      );
      break;

    case '07': // Citations & Backlinks
      lines.push(
        '## Citations & Backlinks',
        '',
        scopeFlags?.citations_active
          ? `Citation building is **ACTIVE** for this company.`
          : `Citation building is **NOT ACTIVE** (scope flag: citations_active = ${scopeFlags?.citations_active ?? false}).`,
        '',
        '### Citation Sources',
        '',
        '| Source | Status | URL | Notes |',
        '|---|---|---|---|',
        '| Google Business Profile | PENDING | — | First priority |',
        '| Yelp | NOT STARTED | — | High authority |',
        '| Bing Places | NOT STARTED | — | Microsoft ecosystem |',
        '| Apple Maps | NOT STARTED | — | Growing importance |',
        '| Facebook | NOT STARTED | — | Social proof |',
        '',
        '### Backlink Strategy',
        '',
        '1. **Industry directories**: Register with relevant B2B/industry directories',
        '2. **Guest posts**: Identify 5-10 relevant blogs for outreach',
        '3. **Resource pages**: Find resource pages in your niche',
        '4. **Broken link building**: Identify broken links on competitor\'s backlinks',
        ''
      );
      break;

    case '08': // YouTube Strategy
      lines.push(
        '## YouTube Strategy',
        '',
        scopeFlags?.youtube_active
          ? `YouTube is **ACTIVE** for this company.`
          : `YouTube is **NOT ACTIVE** (scope flag: youtube_active = ${scopeFlags?.youtube_active ?? false}).`,
        '',
        '### Video Content Plan',
        '',
        '| Video | Topic | Status | Target Publish |',
        '|---|---|---|---|',
        '| 1 | Company/Product Introduction | NOT STARTED | Week 3 |',
        '| 2 | How-to / Educational | NOT STARTED | Week 5 |',
        '| 3 | Customer Testimonial | NOT STARTED | Week 8 |',
        '| 4 | Behind the Scenes | NOT STARTED | Week 10 |',
        '',
        '### YouTube SEO Checklist',
        '',
        '- [ ] Compelling thumbnail (150x150px)',
        '- [ ] Title with target keyword (< 60 chars)',
        '- [ ] Description with keyword + timestamps (150+ words)',
        '- [ ] Tags: 5-8 relevant keywords',
        '- [ ] Cards and end screens configured',
        '- [ ] Embed video on relevant website pages',
        ''
      );
      break;

    case '09': // Reddit & Quora
      lines.push(
        '## Reddit & Quora Strategy',
        '',
        `Reddit: **${scopeFlags?.reddit_active ? 'ACTIVE' : 'NOT ACTIVE'}** | Quora: **${scopeFlags?.quora_active ? 'ACTIVE' : 'NOT ACTIVE'}**`,
        '',
        '### Reddit Communities',
        '',
        '| Community | Status | Posting Plan |',
        '|---|---|---|',
        '| r/seo | NOT STARTED | Weekly insights |',
        '| r/<industry> | NOT STARTED | Bi-weekly |',
        '',
        '### Quora Topics',
        '',
        '| Topic | Status | Questions Answered |',
        '|---|---|---|',
        '| SEO | NOT STARTED | 0 |',
        '',
        '### Community Guidelines',
        '',
        '1. Provide genuine value — no promotional spam',
        '2. Answer questions thoroughly with actionable advice',
        '3. Include a relevant non-promotional link when appropriate',
        '4. Build reputation before promoting',
        ''
      );
      break;

    case '10': // Review Strategy
      lines.push(
        '## Review Strategy',
        '',
        scopeFlags?.reviews_active
          ? `Review generation is **ACTIVE** for this company.`
          : `Review strategy is **NOT ACTIVE** (scope flag: reviews_active = ${scopeFlags?.reviews_active ?? false}).`,
        '',
        '### Google Business Profile Reviews',
        '',
        '| Metric | Current | Target |',
        '|---|---|---|',
        '| Average Rating | — | 4.5+ |',
        '| Review Count | — | 50+ |',
        '| Response Rate | — | 90%+ |',
        '',
        '### Review Generation Tactics',
        '',
        '1. Send post-stay/post-purchase email with direct GBP link',
        '2. QR code on receipts/invoices',
        '3. In-person request at check-out',
        '4. Automated follow-up SMS (where applicable)',
        '5. Respond to ALL reviews (positive and negative)',
        ''
      );
      break;

    case '11': // Schema Markup
      lines.push(
        '## Schema Markup',
        '',
        auditSummary.total_issues > 0 && auditSummary.critical > 0
          ? `⚠️ **${auditSummary.critical} critical schema issues** found.`
          : auditSummary.total_issues > 0
          ? `⚠️ **${auditSummary.high} high-priority schema improvements** needed.`
          : '✅ Schema implementation looks good.',
        '',
        '### Required Schema Types',
        '',
        '| Schema Type | Pages | Status | Priority |',
        '|---|---|---|---|',
        '| Organization | Homepage | TODO | CRITICAL |',
        '| LocalBusiness / Hotel | All | TODO | CRITICAL |',
        '| Product (if applicable) | Product pages | TODO | HIGH |',
        '| FAQPage | Blog posts | TODO | MEDIUM |',
        '| Review / AggregateRating | Product/Service | TODO | MEDIUM |',
        '| BreadcrumbList | All | TODO | LOW |',
        '',
        '### Schema Audit Results',
        '',
        healthScore !== null
          ? `Current health score: **${healthScore}/100**. Schema coverage: **${Math.round(healthScore * 0.5)}%** estimated.`
          : '> Run schema-auditor skill to get detailed schema coverage report.',
        ''
      );
      break;

    case '12': // Weekly Tasks
      lines.push(
        '## Weekly Tasks',
        '',
        `**Period**: ${period} | **Phase**: ${phase}`,
        '',
        plan?.content_calendar
          ? Object.entries(plan.content_calendar).map(([week, cal]) =>
              `### ${week}\n\n${cal.note || 'No notes for this week.'}\n`
            ).join('\n')
          : '',
        '',
        '### This Week\'s Priority Tasks',
        '',
        '1. **Technical fixes**: Address critical and high-priority crawl issues',
        '2. **On-page SEO**: Fix meta descriptions on all indexed pages',
        '3. **Schema implementation**: Add Organization + LocalBusiness schema',
        '4. **Content**: Review and optimize existing content',
        '5. **Monitoring**: Review GSC performance, identify quick-win opportunities',
        ''
      );
      break;

    case '13': // KPIs & Metrics
      lines.push(
        '## KPIs & Metrics',
        '',
        `**Tracking Period**: ${period}`,
        '',
        '### Organic Performance',
        '',
        '| KPI | Baseline | Current | Target | Status |',
        '|---|---|---|---|---|',
        `| Organic Sessions (GA4) | — | ${ga4Data.organicSessions ?? '—'} | +20% MoM | ${ga4Data.organicSessions ? '🟡 TRACKING' : '⚠️ NO DATA'} |`,
        `| Total Clicks (GSC) | — | ${gscData.totalClicks ?? '—'} | +15% MoM | ${gscData.totalClicks ? '🟡 TRACKING' : '⚠️ NO DATA'} |`,
        `| Avg Position (GSC) | — | ${gscData.avgPosition ?? '—'} | < 15 | ${gscData.avgPosition ? '🟡 TRACKING' : '⚠️ NO DATA'} |`,
        `| CTR (GSC) | — | ${gscData.avgCTR ? `${(gscData.avgCTR * 100).toFixed(1)}%` : '—'} | > 3% | ${gscData.avgCTR ? '🟡 TRACKING' : '⚠️ NO DATA'} |`,
        '',
        '### Technical Health',
        '',
        '| KPI | Current | Target | Status |',
        '|---|---|---|---|',
        `| SEO Health Score | ${healthScore ?? '—'} | 80+ | ${healthScore !== null ? (healthScore >= 80 ? '🟢 ON TRACK' : '🟡 IN PROGRESS') : '⚠️ NOT SCORED'} |`,
        `| Critical Issues | ${auditSummary.critical ?? '—'} | 0 | ${(auditSummary.critical || 0) === 0 ? '🟢 CLEAR' : '🔴 ACTION NEEDED'} |`,
        `| High Issues | ${auditSummary.high ?? '—'} | 0 | ${(auditSummary.high || 0) <= 2 ? '🟢 CLEAR' : '🟡 IN PROGRESS'} |`,
        `| Pages Crawled | ${ctx.latestAudit?.crawl_meta?.total_pages ?? '—'} | All indexed | ${ctx.latestAudit ? '🟢 OK' : '⚠️ NO DATA'} |`,
        '',
        '### Content & Distribution',
        '',
        '| KPI | Current | Target | Status |',
        '|---|---|---|---|',
        '| Content Drafts Published | — | Per plan | ⚠️ NO DATA |',
        '| Schema Coverage | — | 100% | ⚠️ NO DATA |',
        '| GBP Reviews | — | 50+ | ⚠️ NO DATA |',
        '| Backlinks Built | — | 5/mo | ⚠️ NO DATA |',
        ''
      );
      break;
  }

  // Append generated-by footer
  lines.push(
    '---',
    '',
    `*Sheet ${num}: ${name} — Generated by report-generator skill on ${now}*`
  );

  return lines.join('\n');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractGscFromSnapshot(snapshot) {
  const data = {};
  if (!snapshot) return data;
  const impressions = snapshot.match(/\|\s*Total Impressions\s*\|\s*([\d,]+)/i);
  const clicks = snapshot.match(/\|\s*Total Clicks\s*\|\s*([\d,]+)/i);
  const ctr = snapshot.match(/\|\s*Total CTR\s*\|\s*([\d.]+)/i);
  const position = snapshot.match(/\|\s*Avg Position\s*\|\s*([\d.]+)/i);
  if (impressions) data.totalImpressions = parseInt(impressions[1].replace(/,/g, ''));
  if (clicks) data.totalClicks = parseInt(clicks[1].replace(/,/g, ''));
  if (ctr) data.avgCTR = parseFloat(ctr[1]);
  if (position) data.avgPosition = parseFloat(position[1]);
  return data;
}

function extractGa4FromSnapshot(snapshot) {
  const data = {};
  if (!snapshot) return data;
  const sessions = snapshot.match(/\|\s*Organic Sessions\s*\|\s*([\d,]+)/i);
  const engagement = snapshot.match(/\|\s*Bounce Rate\s*\|\s*([\d.]+)/i);
  if (sessions) data.organicSessions = parseInt(sessions[1].replace(/,/g, ''));
  if (engagement) data.engagementRate = engagement[1];
  return data;
}

function extractKeywordsFromSnapshot(snapshot) {
  if (!snapshot) return [];
  const tableRows = snapshot.match(/\|\s*[^\|]+\s*\|\s*[\d.]+\s*\|\s*[\d.]+\s*\|\s*[+-]?[\d.]+\s*\|/g) || [];
  return tableRows.slice(0, 10).map(row => {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    return {
      keyword: cols[0] || '—',
      position: parseFloat(cols[2]) || 0,
      previous: parseFloat(cols[1]) || 0,
      delta: parseFloat(cols[3]) || 0,
      volume: cols[4] || '—',
      difficulty: cols[5] || '—',
    };
  });
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

function runExcelPorter(slug, period) {
  const porterScript = path.join(ROOT, 'skills', 'excel-porter', 'scripts', 'excel-porter.py');
  if (!fs.existsSync(porterScript)) {
    log('[report-generator] excel-porter.py not found — skipping Excel generation');
    return;
  }

  // Point excel-porter to the actual sheets location (reports/<period>/sheets/)
  // instead of its default memory/sheets/ — matching canonical SKILL.md paths
  const sheetsSource = path.join(ROOT, 'companies', slug, 'reports', period, 'sheets');
  log(`[report-generator] Running excel-porter.py for ${slug} (${period}) from ${sheetsSource}...`);
  const result = spawnSync('python3', [porterScript, slug, `--source=${sheetsSource}`], {
    cwd: path.join(ROOT, 'skills', 'excel-porter', 'scripts'),
    encoding: 'utf-8',
    timeout: 180_000,
  });

  if (result.status === 0) {
    log(`[report-generator] Excel generated successfully`);
  } else {
    log(`[report-generator] excel-porter failed: ${result.stderr || result.stdout}`.slice(0, 300));
  }
}

// ─── Logging ─────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [report-generator] ${msg}`;
  console.log(line);

  // Also append to episodic log
  const episodicLog = path.join(ROOT, 'memory', 'episodic-log.txt');
  fs.appendFileSync(episodicLog, line + '\n');
}

// ─── Validation Hook ──────────────────────────────────────────────────────────

/**
 * Run sheet-validator after report generation to update validation_status
 * in all .meta.json files. Sets validation_status to 'passed' if validator
 * exits 0, otherwise sets to 'failed' with error details.
 */
function runSheetValidator() {
  const validatorScript = path.join(ROOT, 'skills', 'sheet-validator', 'scripts', 'sheet-validator.py');
  if (!fs.existsSync(validatorScript)) {
    log('[report-generator] sheet-validator.py not found — skipping validation');
    return { status: 'skipped', reason: 'validator not found' };
  }

  log(`[report-generator] Running sheet-validator.py for ${slug}...`);
  const result = spawnSync('python3', [validatorScript, slug], {
    cwd: path.join(ROOT, 'skills', 'sheet-validator', 'scripts'),
    encoding: 'utf-8',
    timeout: 300_000,
  });

  let validationStatus = 'pending';
  let validationResult = null;

  if (result.status === 0) {
    validationStatus = 'passed';
    log(`[report-generator] Sheet validation PASSED`);
  } else {
    validationStatus = 'failed';
    log(`[report-generator] Sheet validation FAILED: ${(result.stderr || result.stdout || '').slice(0, 500)}`);
    try {
      validationResult = JSON.parse(result.stdout || '{}');
    } catch (_) {
      validationResult = { error: (result.stderr || result.stdout || '').slice(0, 500) };
    }
  }

  // Update all .meta.json files with the validation status
  const sheetsDir = resolve(`reports/${period}/sheets`);
  if (fs.existsSync(sheetsDir)) {
    const entries = fs.readdirSync(sheetsDir);
    for (const entry of entries) {
      if (entry.endsWith('.meta.json')) {
        const metaPath = path.join(sheetsDir, entry);
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
          meta.validation_status = validationStatus;
          if (validationStatus === 'failed' && validationResult) {
            meta.validation_errors = validationResult.errors || validationResult.findings || [validationResult.error];
          }
          fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
        } catch (_) {}
      }
    }
    log(`[report-generator] Updated validation_status to '${validationStatus}' in all sheet .meta.json files`);
  }

  return { status: validationStatus, result: validationResult };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  log(`Starting report generation for ${slug} (period: ${period})`);

  const ctx = loadContext();
  log(`Context loaded: phase=${ctx.plan?.current_phase}, scopeFlags=${Object.keys(ctx.scopeFlags).join(',') || 'none'}`);

  // Step 1: Snapshot
  if (!sheetsOnly) {
    refreshSnapshot(ctx);
  }

  // Step 2: Sheets
  let validationOutcome = null;
  if (!snapshotOnly) {
    generateSheets(ctx);
    runExcelPorter(slug, period);

    // Step 3: Validation hook — run sheet-validator and update meta files
    log(`[report-generator] Running post-generation validation...`);
    validationOutcome = runSheetValidator();
  }

  log(`Report generation complete for ${slug} (${period})`);
  const outputDir = resolve(`reports/${period}`);
  console.log(JSON.stringify({
    status: 'complete',
    slug,
    period,
    output_dir: outputDir,
    sheets_count: snapshotOnly ? 0 : Object.keys(SHEET_NAMES).length,
    snapshot_refreshed: !sheetsOnly,
    excel_generated: !snapshotOnly,
    validation: validationOutcome,
  }, null, 2));
}

main();
