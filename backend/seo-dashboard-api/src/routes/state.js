const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(__dirname, '..', '..', 'openclaw-seo');
const HEARTBEAT_FILE = path.join(OPENCLAW_DIR, 'memory', 'heartbeat-state.json');
const CRON_LOG_FILE = path.join(OPENCLAW_DIR, 'memory', 'cron.log');

// Get heartbeat state
router.get('/heartbeat', async (req, res, next) => {
  try {
    let state = {};
    try {
      const content = await fs.readFile(HEARTBEAT_FILE, 'utf-8');
      state = JSON.parse(content);
    } catch {
      state = {};
    }

    res.json(state);
  } catch (err) {
    next(err);
  }
});

// Get cron log
router.get('/cron', async (req, res, next) => {
  try {
    try {
      await fs.access(CRON_LOG_FILE);
    } catch {
      return res.json({ log: '', error: 'cron.log not found' });
    }

    const content = await fs.readFile(CRON_LOG_FILE, 'utf-8');
    const stats = await fs.stat(CRON_LOG_FILE);

    res.json({
      log: content,
      size: stats.size,
      modified: stats.mtime.toISOString()
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
