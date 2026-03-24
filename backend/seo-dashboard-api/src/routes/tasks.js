const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const { checkCompanyAccess, requireRole } = require('../middleware/permissions');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(__dirname, '..', '..', 'openclaw-seo');
const TASK_QUEUE_FILE = path.join(OPENCLAW_DIR, 'memory', 'task-queue.json');

// Human-readable labels for each task type
const TASK_LABELS = {
  'generate-report':          'Generate Report',
  'sheet-fix':               'Fix Sheet',
  'validate-sheets':          'Validate Sheets',
  'excel-generation':        'Generate Excel',
  'daily-snapshot':           'Daily Snapshot',
  'technical-audit':          'Technical Audit',
  'content-publish':          'Publish Content',
  'content-refresh':          'Refresh Content',
  'content-refresh-publish':  'Refresh & Publish',
  'website-edit':             'Website Edit',
  'company-onboard':          'Company Onboard',
  'human-review':             'Human Review',
  'delta-evaluation':         'Delta Evaluation',
  'build-plan':               'Build Plan',
  'update-deps':              'Update Dependencies',
  'content-draft':            'Draft Content',
  'content-refresh-draft':    'Refresh Draft',
  'schema-inject':            'Inject Schema',
  'on-page-fix':               'On-Page Fix',
  'blog-post':                'Blog Post',
  'metadata-audit':           'Metadata Audit',
  'generate':                 'Generate',
  'process-review-decision':   'Process Review',
  'process-human-review':      'Process Human Review',
  'distribute-content':        'Distribute Content',
};

/**
 * Derive a human-readable hover_label from task type + context.
 * Falls back to the TASK_LABELS map if no context-derived label is possible.
 */
function deriveHoverLabel(task) {
  const type = task.type || '';
  const ctx  = task.context || {};

  if (type === 'content-draft' || type === 'content-refresh-draft') {
    if (ctx.keyword)    return `${TASK_LABELS[type] || type}: "${ctx.keyword}"`;
    if (ctx.target_url) return `${TASK_LABELS[type] || type}: ${ctx.target_url}`;
  }

  if (type === 'website-edit' || type === 'on-page-fix' || type === 'schema-inject') {
    if (ctx.gap_id)     return `${TASK_LABELS[type] || type}: ${ctx.gap_id}`;
    if (ctx.target_url) return `${TASK_LABELS[type] || type}: ${ctx.target_url}`;
    if (ctx.fix_type)  return `${TASK_LABELS[type] || type}: ${ctx.fix_type}`;
  }

  if (type === 'generate-report') {
    if (ctx.period) return `${TASK_LABELS[type] || type} — ${ctx.period}`;
  }

  if (type === 'content-publish' || type === 'content-refresh-publish') {
    if (ctx.draft_filename)  return `${TASK_LABELS[type] || type}: ${ctx.draft_filename}`;
    if (ctx.target_keyword)  return `${TASK_LABELS[type] || type}: keyword "${ctx.target_keyword}"`;
  }

  if (type === 'technical-audit') {
    if (ctx.report_period) return `${TASK_LABELS[type] || type} — ${ctx.report_period}`;
  }

  if (type === 'human-review') {
    if (ctx.target) return `Human Review: ${ctx.target}`;
  }

  return TASK_LABELS[type] || type || 'Unknown Task';
}

/**
 * Returns true if the given ISO timestamp falls within the requested yearMonth.
 * yearMonth format: "YYYY-MM"  e.g. "2026-03"
 */
function isInYearMonth(isoTimestamp, yearMonth) {
  if (!yearMonth) return true;
  if (!isoTimestamp) return false;
  return isoTimestamp.slice(0, 7) === yearMonth;
}

/**
 * Returns true if the given ISO timestamp falls within the [from, to] date range.
 * from/to: ISO date strings e.g. "2026-03-16"
 */
function isInDateRange(isoTimestamp, from, to) {
  if (!from && !to) return true;
  if (!isoTimestamp) return false;
  const ts = isoTimestamp.slice(0, 10); // "YYYY-MM-DD"
  if (from && ts < from) return false;
  if (to   && ts > to)   return false;
  return true;
}

// Helper: get company task directory
function getCompanyTasksDir(slug) {
  return path.join(OPENCLAW_DIR, 'companies', slug, 'memory', 'tasks');
}

// Helper: read company task queue (returns array)
async function getCompanyTaskQueue(slug) {
  const queueFile = path.join(getCompanyTasksDir(slug), 'queue.json');
  try {
    const content = await fs.readFile(queueFile, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Helper: save company task queue (queue is an array)
async function saveCompanyTaskQueue(slug, queue) {
  const tasksDir = getCompanyTasksDir(slug);
  await fs.mkdir(tasksDir, { recursive: true });
  const queueFile = path.join(tasksDir, 'queue.json');
  const updated = Array.isArray(queue) ? queue : [];
  await fs.writeFile(queueFile, JSON.stringify(updated, null, 2));
}

// Helper: read company task history
async function getCompanyTaskHistory(slug, yearMonth) {
  const historyDir = path.join(getCompanyTasksDir(slug), 'history', yearMonth);
  const historyFile = path.join(historyDir, 'all.json');
  try {
    const content = await fs.readFile(historyFile, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { period: yearMonth, company: slug, tasks: [], created_at: new Date().toISOString() };
  }
}

// Helper: add to company task history
async function addToCompanyTaskHistory(slug, task) {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const historyDir = path.join(getCompanyTasksDir(slug), 'history', yearMonth);
  await fs.mkdir(historyDir, { recursive: true });

  const historyFile = path.join(historyDir, 'all.json');
  let history = await getCompanyTaskHistory(slug, yearMonth);

  history.tasks.push(task);
  history.updated_at = new Date().toISOString();

  await fs.writeFile(historyFile, JSON.stringify(history, null, 2));
}

// Get all tasks for a company
router.get('/:slug/tasks', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { yearMonth, from, to } = req.query; // yearMonth="2026-03" or from="2026-03-16" to="2026-03-22"

    let tasks = [];

    if (yearMonth) {
      // Read from per-company task history for the requested month
      const history = await getCompanyTaskHistory(slug, yearMonth);
      tasks = history.tasks || [];
    } else {
      // Read from per-company queue (primary source), fall back to global queue
      try {
        tasks = await getCompanyTaskQueue(slug);
      } catch {}

      if (tasks.length === 0) {
        try {
          const content = await fs.readFile(TASK_QUEUE_FILE, 'utf-8');
          const allTasks = JSON.parse(content);
          tasks = allTasks.filter(t => t.company === slug);
        } catch {}
      }
    }

    // Apply date filter if from/to range is specified
    const matchesDateRange = (t) => {
      if (!from && !to) return true;
      return isInDateRange(t.created_at, from, to);
    };

    const companyTasks = tasks
      .filter(t => {
        if (t.company !== slug) return false;
        if (yearMonth) return isInYearMonth(t.created_at, yearMonth);
        if (from || to) return matchesDateRange(t);
        return true;
      })
      .map(t => ({
        id: t.id,
        type: t.type,
        status: t.status,
        priority: t.priority,
        assigned_to: t.assigned_to,
        company: t.company,
        created_at: t.created_at,
        updated_at: t.updated_at,
        completed_at: t.completed_at || null,
        result: t.result || null,
        progress: t.progress || null,
        report_period: t.report_period || null,
        iteration: t.iteration ?? 0,
        result_path: t.result_path || null,
        attempt_count: t.attempt_count ?? 0,
        context: t.context || null,
        hover_label: t.hover_label || deriveHoverLabel(t),
      }));

    res.json(companyTasks);
  } catch (err) {
    next(err);
  }
});

// Get specific task
router.get('/:slug/tasks/:taskId', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, taskId } = req.params;

    let task = null;

    // Check per-company queue first (new flow)
    try {
      const companyQueue = await getCompanyTaskQueue(slug);
      task = companyQueue.find(t => t.id === taskId && t.company === slug) || null;
    } catch {}

    // Fall back to global queue (old flow)
    if (!task) {
      try {
        const content = await fs.readFile(TASK_QUEUE_FILE, 'utf-8');
        const tasks = JSON.parse(content);
        task = tasks.find(t => t.id === taskId && t.company === slug) || null;
      } catch {}
    }

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      ...task,
      report_period: task.report_period || null,
      iteration: task.iteration ?? 0,
      result_path: task.result_path || null,
      attempt_count: task.attempt_count ?? 0,
      context: task.context || null,
      hover_label: task.hover_label || deriveHoverLabel(task),
    });
  } catch (err) {
    next(err);
  }
});

// Get task as formatted markdown
router.get('/:slug/tasks/:taskId/md', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, taskId } = req.params;

    let task = null;

    // Check per-company queue first (new flow)
    try {
      const companyQueue = await getCompanyTaskQueue(slug);
      task = companyQueue.find(t => t.id === taskId && t.company === slug) || null;
    } catch {}

    // Fall back to global queue (old flow)
    if (!task) {
      try {
        const content = await fs.readFile(TASK_QUEUE_FILE, 'utf-8');
        const tasks = JSON.parse(content);
        task = tasks.find(t => t.id === taskId && t.company === slug) || null;
      } catch {}
    }

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const label = task.hover_label || deriveHoverLabel(task);

    let md = `# Task: ${task.id}\n\n`;
    md += `**Task**: ${label}\n`;
    md += `**Type**: ${task.type}\n`;
    md += `**Status**: ${task.status}\n`;
    md += `**Priority**: ${task.priority}\n`;
    md += `**Assigned To**: ${task.assigned_to}\n\n`;
    md += `## Context\n\n`;

    if (task.context) {
      if (task.context.instruction) md += `**Instructions**: ${task.context.instruction}\n\n`;
      if (task.context.target_url) md += `**Target URL**: ${task.context.target_url}\n\n`;
      if (task.context.gap_id) md += `**Gap ID**: ${task.context.gap_id}\n\n`;
      if (task.context.fix_type) md += `**Fix Type**: ${task.context.fix_type}\n\n`;
    }

    if (task.result) {
      md += `## Result\n\n${task.result}\n`;
    }

    md += `\n---\n`;
    md += `*Created: ${task.created_at} | Updated: ${task.updated_at}*\n`;

    res.type('text/markdown').send(md);
  } catch (err) {
    next(err);
  }
});

// Create new task (requires EDITOR or ADMIN)
router.post('/:slug/tasks', checkCompanyAccess, requireRole(['ADMIN', 'EDITOR']), async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { type, priority, context, assigned_to } = req.body;

    if (!type || !context) {
      return res.status(400).json({ error: 'Missing required fields: type, context' });
    }

    let tasks = [];
    try {
      const content = await fs.readFile(TASK_QUEUE_FILE, 'utf-8');
      tasks = JSON.parse(content);
    } catch {}

    const timestamp = Date.now();
    const taskId = `task-${slug}-${type}-${timestamp}`;

    const newTask = {
      id: taskId,
      type,
      company: slug,
      report_period: null,
      priority: priority || 'medium',
      status: 'pending',
      assigned_to: assigned_to || 'seo-orchestrator',
      context: context || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      iteration: 0,
      result: null,
      result_path: null,
      attempt_count: 0,
      progress: null,  // For streaming updates
      hover_label: deriveHoverLabel({ type, context: context || {} }),
    };

    tasks.push(newTask);
    await fs.writeFile(TASK_QUEUE_FILE, JSON.stringify(tasks, null, 2));

    // Also write to per-company queue so both queues stay in sync
    try {
      const companyQueue = await getCompanyTaskQueue(slug);
      companyQueue.push(newTask);
      await saveCompanyTaskQueue(slug, companyQueue);
    } catch {}

    res.status(201).json(newTask);
  } catch (err) {
    next(err);
  }
});

// Update task status (requires EDITOR or ADMIN)
router.patch('/:slug/tasks/:taskId', checkCompanyAccess, requireRole(['ADMIN', 'EDITOR']), async (req, res, next) => {
  try {
    const { slug, taskId } = req.params;
    const { status, result } = req.body;

    const updatedAt = new Date().toISOString();
    let updatedTask = null;

    // Check per-company queue first (new flow), then global (old flow)
    let taskFound = false;

    // Try per-company queue
    try {
      const companyQueue = await getCompanyTaskQueue(slug);
      const cqIdx = companyQueue.findIndex(t => t.id === taskId && t.company === slug);
      if (cqIdx >= 0) {
        if (status) companyQueue[cqIdx].status = status;
        if (result !== undefined) companyQueue[cqIdx].result = result;
        companyQueue[cqIdx].updated_at = updatedAt;
        await saveCompanyTaskQueue(slug, companyQueue);
        updatedTask = companyQueue[cqIdx];
        taskFound = true;
      }
    } catch {}

    // If not found in per-company, try global queue
    if (!taskFound) {
      let tasks = [];
      try {
        const content = await fs.readFile(TASK_QUEUE_FILE, 'utf-8');
        tasks = JSON.parse(content);
      } catch {}
      const globalIdx = tasks.findIndex(t => t.id === taskId && t.company === slug);
      if (globalIdx >= 0) {
        if (status) tasks[globalIdx].status = status;
        if (result !== undefined) tasks[globalIdx].result = result;
        tasks[globalIdx].updated_at = updatedAt;
        await fs.writeFile(TASK_QUEUE_FILE, JSON.stringify(tasks, null, 2));
        updatedTask = tasks[globalIdx];
        taskFound = true;
      }
    }

    // Sync the update to the other queue if task was found
    if (taskFound && updatedTask) {
      try {
        const companyQueue = await getCompanyTaskQueue(slug);
        const cqIdx = companyQueue.findIndex(t => t.id === taskId);
        if (cqIdx >= 0) {
          if (status) companyQueue[cqIdx].status = status;
          if (result !== undefined) companyQueue[cqIdx].result = result;
          companyQueue[cqIdx].updated_at = updatedAt;
          await saveCompanyTaskQueue(slug, companyQueue);
        }
      } catch {}

      // Also sync to global if task is in per-company (not yet in global)
      try {
        const content = await fs.readFile(TASK_QUEUE_FILE, 'utf-8');
        const tasks = JSON.parse(content);
        const globalIdx = tasks.findIndex(t => t.id === taskId);
        if (globalIdx === -1) {
          tasks.push({ ...updatedTask });
          await fs.writeFile(TASK_QUEUE_FILE, JSON.stringify(tasks, null, 2));
        }
      } catch {}
    }

    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ ...updatedTask, updated_at: updatedAt });
  } catch (err) {
    next(err);
  }
});

// Get company task queue (new per-company endpoint)
router.get('/:slug/tasks/queue', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;

    const queue = await getCompanyTaskQueue(slug);
    res.json(queue);
  } catch (err) {
    next(err);
  }
});

// Get company task history by month
router.get('/:slug/tasks/history/:yearMonth', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, yearMonth } = req.params;

    const history = await getCompanyTaskHistory(slug, yearMonth);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// Get current month task history
router.get('/:slug/tasks/history', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const history = await getCompanyTaskHistory(slug, yearMonth);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
