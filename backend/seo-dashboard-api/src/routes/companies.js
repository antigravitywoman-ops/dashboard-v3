const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const auth = require('../lib/auth');
const { checkCompanyAccess } = require('../middleware/permissions');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(__dirname, '..', '..', 'openclaw-seo');
const COMPANIES_FILE = path.join(OPENCLAW_DIR, 'runtime', 'companies.json');

// Get all companies (filtered by user permissions)
router.get('/', async (req, res, next) => {
  try {
    const content = await fs.readFile(COMPANIES_FILE, 'utf-8');
    const data = JSON.parse(content);

    const allActive = data.active || [];
    const allPaused = data.paused || [];

    // If API key auth, return all companies
    if (req.isApiKey) {
      return res.json({
        active: allActive.map(c => ({ ...c, status: 'active' })),
        paused: allPaused.map(c => ({ ...c, status: 'paused' })),
        total: allActive.length + allPaused.length
      });
    }

    // If no user session, return empty
    if (!req.user) {
      return res.json({
        active: [],
        paused: [],
        total: 0
      });
    }

    // Get user's accessible companies
    const allowedCompanies = await auth.getUserCompanyIds(req.user.id);

    // MASTER role gets all companies
    if (allowedCompanies === null) {
      return res.json({
        active: allActive.map(c => ({ ...c, status: 'active' })),
        paused: allPaused.map(c => ({ ...c, status: 'paused' })),
        total: allActive.length + allPaused.length
      });
    }

    // Filter companies by user's access
    const filterByAccess = (companies, status) => {
      return companies
        .filter(c => allowedCompanies.includes(c.slug))
        .map(c => ({ ...c, status }));
    };

    res.json({
      active: filterByAccess(allActive, 'active'),
      paused: filterByAccess(allPaused, 'paused'),
      total: [...allActive, ...allPaused].filter(c => allowedCompanies.includes(c.slug)).length
    });
  } catch (err) {
    next(err);
  }
});

// Get company details
router.get('/companies/:slug', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const content = await fs.readFile(COMPANIES_FILE, 'utf-8');
    const data = JSON.parse(content);

    const company = [...(data.active || []), ...(data.paused || [])]
      .find(c => c.slug === slug);

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const companyDir = path.join(OPENCLAW_DIR, 'companies', slug);
    const exists = await fs.access(companyDir).then(() => true).catch(() => false);

    res.json({
      ...company,
      status: data.active?.some(c => c.slug === slug) ? 'active' : 'paused',
      folder_exists: exists
    });
  } catch (err) {
    next(err);
  }
});

// Get task summary for a company
router.get('/:slug/tasks/summary', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { yearMonth, from, to } = req.query; // yearMonth="2026-03" or from/to="2026-03-16"
    const taskQueueFile = path.join(OPENCLAW_DIR, 'memory', 'task-queue.json');
    const companyQueueFile = path.join(OPENCLAW_DIR, 'companies', slug, 'memory', 'tasks', 'queue.json');

    let tasks = [];

    if (yearMonth) {
      // Read from per-company task history for the requested month
      const historyDir = path.join(OPENCLAW_DIR, 'companies', slug, 'memory', 'tasks', 'history', yearMonth);
      const historyFile = path.join(historyDir, 'all.json');
      try {
        const content = await fs.readFile(historyFile, 'utf-8');
        const history = JSON.parse(content);
        tasks = history.tasks || [];
      } catch {
        tasks = [];
      }
    } else {
      // Default: prefer per-company queue (authoritative), fall back to global
      try {
        const content = await fs.readFile(companyQueueFile, 'utf-8');
        const parsed = JSON.parse(content);
        tasks = Array.isArray(parsed) ? parsed : [];
      } catch {}
      if (tasks.length === 0) {
        try {
          const content = await fs.readFile(taskQueueFile, 'utf-8');
          tasks = JSON.parse(content).filter(t => t.company === slug);
        } catch {}
      }
    }

    // Apply date range filter if from/to specified
    if (from || to) {
      tasks = tasks.filter(t => {
        if (!t.created_at) return false;
        const ts = t.created_at.slice(0, 10);
        if (from && ts < from) return false;
        if (to   && ts > to)   return false;
        return true;
      });
    }

    const summary = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in-progress').length,
      pending_verification: tasks.filter(t => t.status === 'pending-verification').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
    };

    res.json(summary);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
