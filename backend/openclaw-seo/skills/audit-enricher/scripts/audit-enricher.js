#!/usr/bin/env node
/**
 * audit-enricher.js
 * Post-processes raw crawl audit JSON to add dashboard-required fields:
 *   summary, health_score, meta_summary, highlights
 *
 * Usage:
 *   node audit-enricher.js <company-slug> [--audit=<filename>]
 *   node audit-enricher.js rangani-engineering
 *   node audit-enricher.js arpit-sharma-writing --audit=2026-03-15-onboarding-crawl.json
 */

const fs = require('fs');
const path = require('path');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR
  || path.join(__dirname, '..', '..', '..');

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: node audit-enricher.js <company-slug> [--audit=<filename>]');
  process.exit(1);
}

const auditArg = process.argv.find(a => a.startsWith('--audit='));
const targetAudit = auditArg ? auditArg.replace('--audit=', '') : null;

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityWeight(sev) {
  const s = (sev || '').toUpperCase();
  if (s === 'CRITICAL') return 15;
  if (s === 'HIGH')     return 8;
  if (s === 'MEDIUM')   return 3;
  if (s === 'LOW')      return 1;
  return 0;
}

function classifyIssues(audit) {
  const all = [];

  for (const key of ['critical_issues', 'high_issues', 'medium_issues', 'low_issues']) {
    const arr = audit[key];
    if (Array.isArray(arr)) {
      for (const issue of arr) {
        const sev = issue.severity || issue.priority || key.replace('_issues', '').toUpperCase();
        all.push({ sev, type: issue.type || issue.message || 'UNKNOWN', message: issue.message || issue.type || '' });
      }
    }
  }

  return {
    critical: all.filter(i => i.sev.toUpperCase() === 'CRITICAL'),
    high:     all.filter(i => i.sev.toUpperCase() === 'HIGH'),
    medium:   all.filter(i => i.sev.toUpperCase() === 'MEDIUM'),
    low:      all.filter(i => i.sev.toUpperCase() === 'LOW'),
    all,
  };
}

function computeHealthScore(classified, spaDetected) {
  let score = 100;
  score -= classified.critical.length * 15;
  score -= classified.high.length * 8;
  score -= classified.medium.length * 3;
  score -= classified.low.length * 1;
  if (spaDetected) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function generateMetaSummary(classified) {
  const { critical, high, medium } = classified;

  if (critical.length > 0) {
    return `Site health is critical — ${critical.length} critical issue${critical.length > 1 ? 's' : ''} need${critical.length === 1 ? 's' : ''} immediate attention.`;
  }
  if (high.length >= 3) {
    return `Site has structural issues — ${high.length} high-priority problems found.`;
  }

  // Find the most impactful MEDIUM issue
  if (medium.length > 0) {
    const topMedium = medium[0];
    const typeStr = topMedium.type ? ` — ${truncate(topMedium.type, 60)}` : '';
    return `Site structure is sound but${typeStr} needs attention.`;
  }

  if (high.length > 0) {
    const topHigh = high[0];
    const typeStr = topHigh.type ? ` — ${truncate(topHigh.type, 60)}` : '';
    return `Site has minor issues${typeStr}.`;
  }

  return 'No crawl issues detected. Site is fully accessible to search engines.';
}

function truncate(str, max) {
  if (!str) return '';
  return str.length <= max ? str : str.substring(0, max - 3) + '...';
}

function generateHighlights(classified) {
  const seen = new Set();
  const highlights = [];

  const order = ['critical', 'high', 'medium'];
  for (const sev of order) {
    for (const issue of classified[sev]) {
      const type = issue.type || '';
      if (seen.has(type)) continue;

      const msg = issue.message ? ` — ${truncate(issue.message.replace(/\s+/g, ' '), 45)}` : '';
      const text = truncate(`[${sev.toUpperCase()}] ${type}${msg}`, 80);

      highlights.push(text);
      seen.add(type);
      if (highlights.length >= 5) break;
    }
    if (highlights.length >= 5) break;
  }

  return highlights;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const auditsDir = path.join(OPENCLAW_DIR, 'companies', slug, 'technical', 'audits');

if (!fs.existsSync(auditsDir)) {
  console.error(`ERROR: Audits directory not found: ${auditsDir}`);
  process.exit(1);
}

let auditFile;
if (targetAudit) {
  auditFile = path.join(auditsDir, targetAudit);
  if (!fs.existsSync(auditFile)) {
    console.error(`ERROR: Audit file not found: ${auditFile}`);
    process.exit(1);
  }
} else {
  // Find most recent audit JSON
  const files = fs.readdirSync(auditsDir)
    .filter(f => f.endsWith('.json') && !f.endsWith('.meta.json'))
    .sort()
    .reverse();
  if (files.length === 0) {
    console.error('ERROR: No audit JSON files found.');
    process.exit(1);
  }
  auditFile = path.join(auditsDir, files[0]);
  console.log(`Most recent audit: ${path.basename(auditFile)}`);
}

const raw = fs.readFileSync(auditFile, 'utf-8');
let audit;
try {
  audit = JSON.parse(raw);
} catch (e) {
  console.error(`ERROR: Invalid JSON in ${auditFile}: ${e.message}`);
  process.exit(1);
}

// Skip if already enriched
if (audit.health_score !== undefined && audit.summary && audit.meta_summary) {
  console.log('Audit already enriched. Re-running to update counts.');
}

// Classify issues
const classified = classifyIssues(audit);

// Compute derived fields
const summary = {
  total_issues: classified.all.length,
  critical: classified.critical.length,
  high: classified.high.length,
  medium: classified.medium.length,
  low: classified.low.length,
  fixed: audit.summary?.fixed || 0,
};

// Health score — check crawl_meta for SPA flag
const spaDetected = audit.crawl_meta?.spa_detected || false;
const health_score = computeHealthScore(classified, spaDetected);
const meta_summary = generateMetaSummary(classified);
const highlights = generateHighlights(classified);

// Add crawl_timestamp at top level if not present
const crawl_timestamp = audit.crawl_timestamp || audit.crawl_meta?.crawled_at || new Date().toISOString();

// Write enriched output (in-place)
const enriched = {
  ...audit,
  crawl_timestamp,
  summary,
  health_score,
  meta_summary,
  highlights,
};

fs.writeFileSync(auditFile, JSON.stringify(enriched, null, 2), 'utf-8');

// Write .meta.json sidecar
const metaFile = auditFile.replace(/\.json$/, '.meta.json');
const metaJson = {
  audit_type: 'full-site',
  crawl_timestamp,
  pages_crawled: Array.isArray(audit.pages) ? audit.pages.length : 0,
  total_issues: summary.total_issues,
  critical: summary.critical,
  high: summary.high,
  medium: summary.medium,
  low: summary.low,
  fixed: summary.fixed,
  health_score,
  meta_summary,
  highlights,
  scope_flags: audit.scope_flags || null,
  tool: audit.crawl_meta?.crawler || 'unknown',
  created_at: audit.created_at || crawl_timestamp,
  updated_at: new Date().toISOString()
};
fs.writeFileSync(metaFile, JSON.stringify(metaJson, null, 2), 'utf-8');

console.log(`\nEnriched: ${path.basename(auditFile)}`);
console.log(`  health_score : ${health_score}`);
console.log(`  summary      : ${summary.critical}C / ${summary.high}H / ${summary.medium}M / ${summary.low}L = ${summary.total_issues} total`);
console.log(`  meta_summary : ${meta_summary.substring(0, 80)}${meta_summary.length > 80 ? '...' : ''}`);
if (highlights.length > 0) {
  console.log(`  highlights   :`);
  highlights.forEach(h => console.log(`    - ${h}`));
}
console.log(`  meta sidecar : ${path.basename(metaFile)}`);
