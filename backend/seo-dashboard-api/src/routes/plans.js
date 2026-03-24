const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const { checkCompanyAccess } = require('../middleware/permissions');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(__dirname, '..', '..', 'openclaw-seo');

// Ensure plans folder structure exists
async function ensurePlansFolders(plansDir) {
  const activeDir = path.join(plansDir, 'active');
  const archiveDir = path.join(plansDir, 'archive');
  try {
    await fs.access(activeDir);
  } catch {
    await fs.mkdir(activeDir, { recursive: true });
  }
  try {
    await fs.access(archiveDir);
  } catch {
    await fs.mkdir(archiveDir, { recursive: true });
  }
}

// Parse week from filename
function parseWeekFromFilename(filename) {
  const baseName = filename.replace('.md', '').replace('.json', '');
  // Match patterns like 2026-W11, 2026-03, etc.
  const match = baseName.match(/^(\d{4})[-_]?(W\d{2}|\d{2})$/);
  if (match) {
    return baseName;
  }
  return null;
}

// Extract "Missed Items / Next Week's Plan" section from plan markdown.
function extractMissedItemsNote(content) {
  if (!content) return null;
  // Match the Missed Items section (case-insensitive, flexible spacing)
  const match = content.match(/##\s+Missed Items[\s\S]*?(?=##\s|\n##\s|$)/i);
  if (!match) return null;
  // Strip the header line and trim
  return match[0].replace(/^##\s+Missed Items.*?\n/i, '').trim().slice(0, 500) || null;
}

// Extract summary and highlights from plan markdown content.
function extractPlanSummaryAndHighlights(content) {
  if (!content) return { summary: null, highlights: [] };

  // Find "## This Week's Focus" section as the summary source
  const focusMatch = content.match(/##\s+This Week'?s? Focus[\s\S]*?\n([^\n#]+)/i);
  const summary = focusMatch
    ? focusMatch[1].trim().slice(0, 150)
    : null;

  // Extract focus area lines (lines starting with - or * under a ## Focus header)
  const focusLines = [];
  const lines = content.split('\n');
  let inFocusSection = false;
  for (const line of lines) {
    if (/^##\s+.*(?:focus|area)/i.test(line)) {
      inFocusSection = true;
      continue;
    }
    if (inFocusSection && /^##\s+/.test(line)) {
      inFocusSection = false;
    }
    if (inFocusSection && /^[-*]\s+(.+)/.test(line)) {
      focusLines.push(line.replace(/^[-*]\s+/, '').trim().slice(0, 80));
    }
  }
  const highlights = focusLines.length > 0 ? focusLines.slice(0, 5) : [];

  return { summary, highlights };
}

// Get all plans for a company
router.get('/:slug/plans', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const plansDir = path.join(OPENCLAW_DIR, 'companies', slug, 'plans');

    try {
      await fs.access(plansDir);
    } catch {
      // Create plans folder structure for new companies
      await ensurePlansFolders(plansDir);
      return res.json({ plans: [], active_plan: null, _initialized: true });
    }

    // Ensure folder structure
    await ensurePlansFolders(plansDir);

    const activeDir = path.join(plansDir, 'active');
    const archiveDir = path.join(plansDir, 'archive');

    // ── Parallel file reads ─────────────────────────────────────────────────────
    // Read active dir, archive dir, and active-plan.json all in parallel.
    // This cuts sequential I/O from ~8 calls to ~3 parallel batches.
    const [activeEntries, archiveEntries, activePlanRaw] = await Promise.all([
      fs.readdir(activeDir, { withFileTypes: true }).catch(() => []),
      fs.readdir(archiveDir, { withFileTypes: true }).catch(() => []),
      fs.readFile(path.join(activeDir, 'active-plan.json'), 'utf-8').catch(() => null),
    ]);

    // ── Build plans list from active dir (parallel reads per plan) ─────────────
    const activeMdEntries = activeEntries.filter(e =>
      e.isFile() && e.name.endsWith('.md')
    );
    const activePlanPromises = activeMdEntries.map(async (entry) => {
      const baseName = entry.name.replace('.md', '');
      const fullPath = path.join(activeDir, entry.name);
      const [stats, jsonContent, metaContent] = await Promise.all([
        fs.stat(fullPath),
        fs.readFile(path.join(activeDir, `${baseName}.json`), 'utf-8').catch(() => null),
        fs.readFile(path.join(activeDir, `${baseName}.meta.json`), 'utf-8').catch(() => null),
      ]);
      let meta = metaContent ? JSON.parse(metaContent) : { status: 'active' };
      // Backward compat: generate if no .meta.json
      if (!metaContent) {
        const mdContent = await fs.readFile(fullPath, 'utf-8').catch(() => '');
        const { summary, highlights } = extractPlanSummaryAndHighlights(mdContent);
        meta = {
          week: parseWeekFromFilename(baseName),
          status: 'active',
          total_tasks: 0,
          completed_tasks: 0,
          pending_tasks: 0,
          blocked_tasks: 0,
          focus_areas: [],
          gaps_addressed: [],
          priority_tasks: [],
          summary,
          highlights,
          notes: null,
          _auto_generated: true,
        };
      }
      return {
        filename: entry.name,
        path: 'active',
        week: meta.week || parseWeekFromFilename(baseName),
        modified: stats.mtime.toISOString(),
        size: stats.size,
        meta: jsonContent ? JSON.parse(jsonContent) : meta,
        status: meta.status || 'active',
      };
    });

    // ── Build plans list from archive dir ───────────────────────────────────────
    const archiveMdEntries = archiveEntries.filter(e =>
      e.isFile() && e.name.endsWith('.md')
    );
    const archivePlanPromises = archiveMdEntries.map(async (entry) => {
      const baseName = entry.name.replace('.md', '');
      const fullPath = path.join(archiveDir, entry.name);
      const [stats, metaContent] = await Promise.all([
        fs.stat(fullPath),
        fs.readFile(path.join(archiveDir, `${baseName}.meta.json`), 'utf-8').catch(() => null),
      ]);
      let meta = metaContent ? JSON.parse(metaContent) : {};
      if (!metaContent) {
        const mdContent = await fs.readFile(fullPath, 'utf-8').catch(() => '');
        const { summary, highlights } = extractPlanSummaryAndHighlights(mdContent);
        meta = {
          week: parseWeekFromFilename(baseName),
          status: 'archived',
          summary,
          highlights,
          _auto_generated: true,
        };
      }
      return {
        filename: entry.name,
        path: 'archive',
        week: meta.week || parseWeekFromFilename(baseName),
        modified: stats.mtime.toISOString(),
        size: stats.size,
        status: meta.status || 'archived',
      };
    });

    // ── Resolve all plans in parallel ───────────────────────────────────────────
    const plans = await Promise.all([...activePlanPromises, ...archivePlanPromises]);
    plans.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    // ── Build active_plan from the most recent weekly .meta.json ─────────────────
    // (task counts from heartbeat-synced weekly meta, enriched from active-plan.json)
    let activePlan = null;
    const metaFiles = activeEntries
      .filter(f => f.isFile() && f.name.endsWith('.meta.json'))
      .map(f => f.name)
      .sort();

    if (metaFiles.length > 0) {
      const latestMetaPath = path.join(activeDir, metaFiles[metaFiles.length - 1]);
      // Read weekly meta + companion markdown in parallel
      const [weeklyMetaContent, weeklyMdContent] = await Promise.all([
        fs.readFile(latestMetaPath, 'utf-8'),
        fs.readFile(latestMetaPath.replace(/\.meta\.json$/, '.md'), 'utf-8').catch(() => ''),
      ]);
      const weeklyMeta = JSON.parse(weeklyMetaContent);

      activePlan = {
        filename: latestMetaPath.split(/[/\\]/).pop(),
        week: weeklyMeta.week || null,
        status: weeklyMeta.status || 'active',
        total_tasks: weeklyMeta.total_tasks ?? 0,
        completed_tasks: weeklyMeta.completed_tasks ?? 0,
        pending_tasks: weeklyMeta.pending_tasks ?? 0,
        blocked_tasks: weeklyMeta.blocked_tasks ?? 0,
        in_progress_tasks: weeklyMeta.in_progress_tasks ?? 0,
        progress_percent: weeklyMeta.progress_percent ?? 0,
        focus_areas: weeklyMeta.focus_areas || [],
        priority_tasks: weeklyMeta.priority_tasks || [],
        notes: weeklyMeta.notes || null,
        gaps_addressed: weeklyMeta.gaps_addressed || [],
        last_heartbeat_at: weeklyMeta.last_heartbeat_at || null,
        updated_at: weeklyMeta.updated_at || null,
        _source: 'weekly_meta',
      };

      // ── Enrich from active-plan.json (monthly-level data) ───────────────────
      if (activePlanRaw) {
        const monthlyPlan = JSON.parse(activePlanRaw);
        if (monthlyPlan.current_phase) activePlan.current_phase = monthlyPlan.current_phase;
        if (monthlyPlan.current_week_label) activePlan.current_week_label = monthlyPlan.current_week_label;
        if (monthlyPlan.current_week) activePlan.current_week = monthlyPlan.current_week;
        if (monthlyPlan.priority_focus) activePlan.priority_focus = monthlyPlan.priority_focus;
        if (monthlyPlan.success_metrics) {
          activePlan.success_metrics = {};
          for (const [key, val] of Object.entries(monthlyPlan.success_metrics)) {
            if (typeof val === 'object' && val !== null && 'done' in val) {
              activePlan.success_metrics[key] = val;
            } else {
              activePlan.success_metrics[key] = {
                target: typeof val === 'number' ? String(val) : '—',
                current: '—',
                done: false,
              };
            }
          }
        }
        if (monthlyPlan.tasks && monthlyPlan.tasks.length > 0 && weeklyMeta.total_tasks === 0) {
          activePlan.tasks = monthlyPlan.tasks;
        }
        if (!activePlan.summary && activePlan.current_phase && activePlan.current_week_label) {
          activePlan.summary = `Week ${activePlan.current_week} — ${activePlan.current_phase} phase. Focus: ${activePlan.priority_focus || 'See tasks for details.'}`;
        }
        if (!activePlan.highlights) {
          const generatedHighlights = [];
          if (activePlan.focus_areas?.length > 0) {
            activePlan.focus_areas.slice(0, 3).forEach(area => {
              generatedHighlights.push(`Focus: ${String(area).slice(0, 75)}`);
            });
          }
          if (activePlan.gaps_addressed?.length > 0) {
            activePlan.gaps_addressed.slice(0, 2).forEach(gap => {
              generatedHighlights.push(`Gap: ${String(gap).slice(0, 75)}`);
            });
          }
          if (generatedHighlights.length > 0) {
            activePlan.highlights = generatedHighlights;
          }
        }
      }

      // ── Extract executive_summary from weekly markdown ───────────────────────
      if (weeklyMdContent) {
        const focusMatch = weeklyMdContent.match(/##\s+This Week'?s? Focus[\s\S]*?\n([^\n#]+)/i);
        if (focusMatch) {
          activePlan.executive_summary = focusMatch[1].trim().slice(0, 150);
        }
      }
    }

    // Cache-Control: allow 30s stale while revalidate (live data changes ~30 min via heartbeat)
    res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=60');
    res.json({
      plans,
      active_plan: activePlan,
      _has_plans: plans.length > 0,
      _has_active_plan: activePlan !== null,
    });
  } catch (err) {
    next(err);
  }
});

// Get specific plan file
router.get('/:slug/plans/:path(*)', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, path: planPath } = req.params;
    const plansDir = path.join(OPENCLAW_DIR, 'companies', slug, 'plans');

    // Handle path traversal attempts
    if (planPath.includes('..')) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    const filePath = path.join(plansDir, planPath);

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Plan file not found' });
    }

    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Path is a directory' });
    }

    const content = await fs.readFile(filePath, 'utf-8');

    if (filePath.endsWith('.json') && !filePath.endsWith('.meta.json')) {
      // Plain .json files return parsed JSON (e.g. active-plan.json)
      res.json(JSON.parse(content));
      return;
    }

    if (filePath.endsWith('.meta.json')) {
      // For .meta.json, return structured data + companion markdown content
      const meta = JSON.parse(content);
      const mdPath = filePath.replace(/\.meta\.json$/, '.md');
      let markdownContent = '';
      let executiveSummary = null;
      let missedItemsNote = null;

      try {
        markdownContent = await fs.readFile(mdPath, 'utf-8');
        const focusMatch = markdownContent.match(/##\s+This Week'?s? Focus[\s\S]*?\n([^\n#]+)/i);
        if (focusMatch) {
          executiveSummary = focusMatch[1].trim().slice(0, 150);
        }
        missedItemsNote = extractMissedItemsNote(markdownContent);
      } catch {}

      res.json({
        content: markdownContent,
        meta,
        parsed_sections: {
          executive_summary: executiveSummary,
          missed_items_note: missedItemsNote,
          tasks_summary: {
            total: meta.total_tasks ?? 0,
            completed: meta.completed_tasks ?? 0,
            pending: meta.pending_tasks ?? 0,
            blocked: meta.blocked_tasks ?? 0,
          }
        }
      });
      return;
    }

    // For .md files and other extensions, return plain markdown
    res.type('text/markdown').send(content);
  } catch (err) {
    next(err);
  }
});

// Update success metrics for the active plan
router.patch('/:slug/plans/metrics', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { success_metrics, notes } = req.body;

    if (!success_metrics && notes === undefined) {
      return res.status(400).json({ error: 'Request body must include success_metrics or notes' });
    }

    const activeDir = path.join(OPENCLAW_DIR, 'companies', slug, 'plans', 'active');
    const activePlanPath = path.join(activeDir, 'active-plan.json');

    let plan = {};
    try {
      const content = await fs.readFile(activePlanPath, 'utf-8');
      plan = JSON.parse(content);
    } catch {
      return res.status(404).json({ error: 'active-plan.json not found' });
    }

    if (success_metrics) {
      plan.success_metrics = success_metrics;
    }
    if (notes !== undefined) {
      plan.notes = notes;
    }
    plan.updated_at = new Date().toISOString();

    await fs.writeFile(activePlanPath, JSON.stringify(plan, null, 2), 'utf-8');

    res.json({ success: true, success_metrics: plan.success_metrics, notes: plan.notes });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
