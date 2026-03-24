const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const { checkCompanyAccess } = require('../middleware/permissions');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(__dirname, '..', '..', 'openclaw-seo');

// Infer review type from filename
function inferReviewType(filename) {
  const name = filename.toLowerCase();
  if (name.includes('technical-audit') || name.includes('technical')) return 'technical-review';
  if (name.includes('on-page') || name.includes('onpage')) return 'on-page-review';
  if (name.includes('schema')) return 'schema-review';
  if (name.includes('content')) return 'content-review';
  return 'general-review';
}

// Map raw technical text to plain-language labels and severity
function toPlainLanguage(raw) {
  const upper = raw.toUpperCase();
  const lower = raw.toLowerCase();

  // Extract score number from raw text (e.g. "score: 75" → 75)
  const scoreMatch = raw.match(/\d{2,3}/)
  const score = scoreMatch ? parseInt(scoreMatch[0]) : null

  // Determine severity and plain label
  let severity = 'warning'
  let label = raw

  if (upper.includes('CRITICAL') || upper.includes('BLOCKED') || upper.includes('FAILED') || upper.includes('ZERO')) {
    severity = 'critical'
    if (upper.includes('MISSING') || upper.includes('NOT IMPLEMENTED') || upper.includes('NOT FOUND')) {
      label = 'Important item missing'
    } else if (upper.includes('BLOCKED')) {
      label = 'Progress is blocked'
    } else if (upper.includes('FAILED') || upper.includes('ZERO')) {
      label = score !== null ? `Major issue found (score: ${score})` : 'Major issue found'
    } else {
      label = 'Major issue found'
    }
  } else if (upper.includes('MISSING') || upper.includes('NOT IMPLEMENTED') || upper.includes('NOT FOUND')) {
    severity = 'warning'
    label = 'Important item missing'
  } else if (upper.includes('PASS') || lower.includes('completed') || lower.includes('correctly') || lower.includes('implemented')) {
    severity = 'passed'
    if (lower.includes('completed')) {
      label = 'Completed successfully'
    } else if (lower.includes('correctly')) {
      label = 'Working correctly'
    } else {
      label = 'Passed check'
    }
  } else if (/\d+ issues?/.test(lower)) {
    const issueMatch = raw.match(/(\d+) issues?/i)
    severity = 'warning'
    label = issueMatch ? `${issueMatch[1]} issues found` : 'Issues found'
  } else if (/\d+ pages?/.test(lower)) {
    const pageMatch = raw.match(/(\d+) pages?/i)
    severity = 'warning'
    label = pageMatch ? `${pageMatch[1]} pages affected` : 'Multiple pages affected'
  } else if (score !== null && upper.includes('SCORE')) {
    if (score >= 80) {
      severity = 'passed'
      label = `Score: ${score}/100 — good`
    } else if (score >= 60) {
      severity = 'warning'
      label = `Score: ${score}/100 — needs work`
    } else {
      severity = 'critical'
      label = `Score: ${score}/100 — failed`
    }
  } else {
    // Generic: strip trailing score regex artifacts
    label = raw.replace(/score.*\d+/gi, '').replace(/\|/g, '').trim()
    if (label.length < 3) label = raw
    if (label.length > 80) label = label.substring(0, 77) + '...'
  }

  return { text: raw, plainText: label, severity }
}

// Parse highlights from review markdown content
function parseHighlights(content, baseName) {
  const rawHighlights = [];
  const lines = content.split('\n');

  // Priority terms that indicate important findings
  const priorityTerms = ['CRITICAL', 'MISSING', 'BLOCKED', 'FAILED', 'OPEN', 'not implemented', 'not found', 'zero'];
  // Positive terms
  const passTerms = ['PASS', '✓', 'completed', 'correctly', 'implemented'];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip heading lines (keep title-level only)
    if (trimmed.startsWith('# ')) continue;

    // Capture table rows that contain priority issues or pass signals
    if (trimmed.includes('|') && (trimmed.includes('MISSING') || trimmed.includes('CRITICAL') ||
        trimmed.includes('BLOCKED') || trimmed.includes('NOT IMPLEMENTED') || trimmed.includes('PASS') ||
        trimmed.includes('COMPLETED'))) {
      // Extract meaningful cell content
      const cells = trimmed.split('|').filter(c => c.trim());
      for (const cell of cells) {
        const text = cell.trim();
        if (text.length > 5 && (priorityTerms.some(t => text.toUpperCase().includes(t)) ||
            passTerms.some(t => text.toLowerCase().includes(t)) ||
            /\d+ issues?/.test(text.toLowerCase()) ||
            /score.*\d+/i.test(text))) {
          if (text.length < 120) {
            rawHighlights.push(text);
          }
        }
      }
      continue;
    }

    // Capture bullet points with key findings
    if ((trimmed.startsWith('- ') || trimmed.startsWith('* ')) && trimmed.length > 15) {
      const bullet = trimmed.substring(2);
      if (priorityTerms.some(t => bullet.toUpperCase().includes(t)) ||
          /\d+ pages?/.test(bullet) ||
          /score.*\d+/i.test(bullet)) {
        rawHighlights.push(bullet.substring(0, 120));
        continue;
      }
    }

    // Capture numbered list items with important findings
    if (/^\d+\.\s/.test(trimmed) && trimmed.length > 20) {
      const numItem = trimmed.replace(/^\d+\.\s*/, '');
      if (priorityTerms.some(t => numItem.toUpperCase().includes(t)) ||
          numItem.toLowerCase().includes('issue') ||
          numItem.toLowerCase().includes('gap')) {
        rawHighlights.push(numItem.substring(0, 120));
      }
    }
  }

  // De-duplicate and limit to 6 raw entries
  const seen = new Set();
  const unique = [];
  for (const h of rawHighlights) {
    const key = h.toLowerCase().substring(0, 40);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(h);
    }
    if (unique.length >= 6) break;
  }

  // Convert to plain-language with severity
  return unique.map(toPlainLanguage);
}

// Generate metadata for review
async function generateReviewMeta(reviewPath, baseName) {
  const metaPath = `${reviewPath.replace('.md', '')}.meta.json`;

  try {
    await fs.access(metaPath);
    const content = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    const now = new Date().toISOString();
    return {
      review_type: inferReviewType(baseName),
      target_url: null,
      status: 'pending',
      score: null,
      issues_found: 0,
      issues_resolved: 0,
      reviewer: null,
      target_item: null,
      created_at: now,
      updated_at: now,
      _auto_generated: true,
      highlights: []
    };
  }
}

// Get all reviews for a company
router.get('/:slug/reviews', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const reviewsDir = path.join(OPENCLAW_DIR, 'companies', slug, 'reviews');

    try {
      await fs.access(reviewsDir);
    } catch {
      return res.json({ reviews: [] });
    }

    const reviews = [];
    const entries = await fs.readdir(reviewsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.endsWith('.meta.json')) {
        const fullPath = path.join(reviewsDir, entry.name);
        const stats = await fs.stat(fullPath);
        const baseName = entry.name.replace('.md', '');

        // Get metadata
        const meta = await generateReviewMeta(fullPath, baseName);

        // Read content for title, summary, and highlights
        let title = baseName.replace(/-/g, ' ');
        let summary = null;
        let highlights = meta.highlights || [];
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const lines = content.split('\n').filter(l => l.trim());
          // Extract first heading as title
          const headingLine = lines.find(l => l.startsWith('#'));
          if (headingLine) {
            title = headingLine.replace(/^#+\s*/, '').trim();
          }
          // Get first paragraph as summary
          const paraLine = lines.find(l => !l.startsWith('#') && l.trim().length > 20);
          if (paraLine) {
            summary = paraLine.trim().substring(0, 150);
          }
          // Parse highlights from content only if not already in meta
          if (highlights.length === 0) {
            highlights = parseHighlights(content, baseName);
          }
        } catch {}

        reviews.push({
          filename: entry.name,
          title,
          summary,
          highlights,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          review_type: meta.review_type,
          status: meta.status,
          score: meta.score,
          _meta_auto_generated: meta._auto_generated || false,
          // Human decision fields
          human_decision: meta.human_decision || null,
          human_comment: meta.human_comment || null,
          human_reviewer: meta.human_reviewer || null,
          human_decision_at: meta.human_decision_at || null,
          humanReadableSummary: meta.humanReadableSummary || null
        });
      }
    }

    reviews.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json({
      reviews,
      _has_reviews: reviews.length > 0
    });
  } catch (err) {
    next(err);
  }
});

// Get specific review file
router.get('/:slug/reviews/:filename', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, filename } = req.params;

    // Validate filename
    if (filename.includes('..') || !filename.endsWith('.md')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const reviewPath = path.join(OPENCLAW_DIR, 'companies', slug, 'reviews', filename);

    try {
      await fs.access(reviewPath);
    } catch {
      return res.status(404).json({ error: 'Review file not found' });
    }

    const content = await fs.readFile(reviewPath, 'utf-8');
    const stats = await fs.stat(reviewPath);

    res.json({
      filename,
      content,
      size: stats.size,
      modified: stats.mtime.toISOString()
    });
  } catch (err) {
    next(err);
  }
});

// Get review metadata (.meta.json)
router.get('/:slug/reviews/:filename/meta', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, filename } = req.params;

    // Validate filename — accept .md or .meta.json
    // Frontend sends .meta.json filenames; backend normalizes to .meta.json path
    if (filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Normalize: .md → .meta.json, .meta.json → .meta.json
    const metaFilename = filename.endsWith('.meta.json')
      ? filename
      : filename.replace('.md', '.meta.json');

    const metaPath = path.join(OPENCLAW_DIR, 'companies', slug, 'reviews', metaFilename);

    try {
      await fs.access(metaPath);
    } catch {
      return res.status(404).json({ error: 'Review metadata not found' });
    }

    const metaContent = await fs.readFile(metaPath, 'utf-8');
    const meta = JSON.parse(metaContent);

    res.json(meta);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// Helper: sync task counts from queue.json into the active weekly .meta.json
// Called after human review decisions so counts are immediately accurate (not stale until next heartbeat).
// ─────────────────────────────────────────────
async function syncPlanTaskCounts(slug) {
  const companyTasksDir = path.join(OPENCLAW_DIR, 'companies', slug, 'memory', 'tasks');
  const queueFile = path.join(companyTasksDir, 'queue.json');
  const plansDir = path.join(OPENCLAW_DIR, 'companies', slug, 'plans', 'active');

  // Find the most recent weekly .meta.json
  let metaPath = null;
  try {
    const entries = await fs.readdir(plansDir);
    const metaFiles = entries.filter(f => f.endsWith('.meta.json')).sort();
    if (metaFiles.length > 0) {
      metaPath = path.join(plansDir, metaFiles[metaFiles.length - 1]);
    }
  } catch {}

  if (!metaPath) return; // No active plan yet — nothing to sync

  try {
    let queue = [];
    try {
      const content = await fs.readFile(queueFile, 'utf-8');
      queue = JSON.parse(content);
    } catch {}

    const tasks = Array.isArray(queue) ? queue : [];
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));

    meta.total_tasks = tasks.length;
    meta.completed_tasks = tasks.filter(t => t.status === 'completed').length;
    meta.pending_tasks = tasks.filter(t => t.status === 'pending').length;
    meta.blocked_tasks = tasks.filter(t => t.status === 'blocked').length;
    meta.in_progress_tasks = tasks.filter(t => t.status === 'in-progress').length;
    meta.progress_percent = tasks.length > 0
      ? Math.round((meta.completed_tasks / meta.total_tasks) * 100)
      : 0;
    meta.last_heartbeat_at = new Date().toISOString();
    meta.updated_at = new Date().toISOString();

    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
  } catch {}
}

// Update review metadata (.meta.json) - for human approval/rejection
router.patch('/:slug/reviews/:filename', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, filename } = req.params;

    // Validate filename — accept .md or .meta.json
    // Frontend sends .meta.json filenames; backend normalizes to .meta.json path
    if (filename.includes('..')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Normalize: .md → .meta.json, .meta.json → .meta.json
    const metaFilename = filename.endsWith('.meta.json')
      ? filename
      : filename.replace('.md', '.meta.json');

    const metaPath = path.join(OPENCLAW_DIR, 'companies', slug, 'reviews', metaFilename);

    // Read existing metadata or create default structure
    let meta = {};
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      meta = JSON.parse(metaContent);
    } catch {
      // If meta.json doesn't exist, create default structure
      const now = new Date().toISOString();
      meta = {
        review_type: inferReviewType(filename),
        status: 'pending',
        score: null,
        issues_found: 0,
        issues_resolved: 0,
        reviewer: null,
        target_item: null,
        created_at: now,
        updated_at: now,
        highlights: [],
        humanReadableSummary: null
      };
    }

    // Update fields based on request body
    const { human_decision, human_comment, human_reviewer } = req.body;

    if (human_decision !== undefined) {
      meta.human_decision = human_decision;
      meta.human_decision_at = new Date().toISOString();

      // Update status based on decision
      if (human_decision === 'approved') {
        meta.status = 'approved';
      } else if (human_decision === 'rejected') {
        meta.status = 'rejected';
      }
    }

    if (human_comment !== undefined) {
      meta.human_comment = human_comment;
    }

    if (human_reviewer !== undefined) {
      meta.human_reviewer = human_reviewer;
    }

    // Always update the updated_at timestamp
    meta.updated_at = new Date().toISOString();

    // Write updated metadata back
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

    // Immediately sync plan task counts so dashboard/plans page shows correct numbers
    await syncPlanTaskCounts(slug);

    res.json({
      success: true,
      meta
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
