const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const { checkCompanyAccess } = require('../middleware/permissions');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(__dirname, '..', '..', 'openclaw-seo');

// Map filenames to file types
const FILE_TYPE_MAP = {
  'profile.md': 'profile',
  'audience.md': 'audience',
  'brand-voice.md': 'brand-voice',
  'competitors.md': 'competitors',
  'goals.md': 'goals',
  'keywords.md': 'keywords',
  'scope.md': 'scope',
  'access.md': 'access',
  'missing-dependencies.md': 'missing-dependencies',
};

// Get all about files for a company
router.get('/:slug/about', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const aboutDir = path.join(OPENCLAW_DIR, 'companies', slug, 'about');

    let files = [];
    try {
      const entries = await fs.readdir(aboutDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          const fullPath = path.join(aboutDir, entry.name);
          const stats = await fs.stat(fullPath);
          const fileType = FILE_TYPE_MAP[entry.name] || entry.name.replace('.md', '');

          // Read full meta file (including summary, highlights, and all other fields)
          let meta = {};
          try {
            const metaPath = path.join(aboutDir, entry.name.replace('.md', '.meta.json'));
            const metaContent = await fs.readFile(metaPath, 'utf-8');
            meta = JSON.parse(metaContent);
          } catch {}

          files.push({
            filename: entry.name,
            path: 'about',
            title: fileType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            file_type: fileType,
            // Summary and highlights from meta (used in dashboard cards)
            summary: meta.summary || null,
            highlights: meta.highlights || [],
            // Full meta object passed to frontend for extended display
            category: meta.category || fileType,
            review_status: meta.review_status || 'pending',
            version: meta.version || 1,
            author: meta.author || null,
            last_reviewed: meta.last_reviewed || null,
            linked_sheets: meta.linked_sheets || [],
            created_at: meta.created_at || stats.mtime.toISOString(),
            updated_at: meta.updated_at || stats.mtime.toISOString(),
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      }
    } catch (err) {
      // About folder doesn't exist - return empty array
      if (err.code === 'ENOENT') {
        return res.json({ files: [] });
      }
      throw err;
    }

    res.json({ files });
  } catch (err) {
    next(err);
  }
});

// Get specific about file content
router.get('/:slug/about/:filename', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, filename } = req.params;
    const aboutDir = path.join(OPENCLAW_DIR, 'companies', slug, 'about');

    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.join(aboutDir, filename);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      const fileType = FILE_TYPE_MAP[filename] || filename.replace('.md', '');

      res.json({
        filename,
        path: 'about',
        content,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        file_type: fileType
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'File not found' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// Get about file metadata (.meta.json)
router.get('/:slug/about/:filename/meta', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, filename } = req.params;
    const aboutDir = path.join(OPENCLAW_DIR, 'companies', slug, 'about');

    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const metaPath = path.join(aboutDir, filename.replace('.md', '.meta.json'));

    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaContent);
      const stats = await fs.stat(metaPath);

      res.json({
        filename,
        meta_path: metaPath,
        meta,
        modified: stats.mtime.toISOString(),
        size: stats.size
      });
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'Metadata file not found' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// Update about file metadata (.meta.json)
router.put('/:slug/about/:filename/meta', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, filename } = req.params;
    const aboutDir = path.join(OPENCLAW_DIR, 'companies', slug, 'about');

    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const { meta } = req.body;
    if (!meta || typeof meta !== 'object') {
      return res.status(400).json({ error: 'Invalid metadata object' });
    }

    const metaPath = path.join(aboutDir, filename.replace('.md', '.meta.json'));
    const aboutPath = path.join(aboutDir, filename);

    try {
      // Verify the about file exists
      await fs.access(aboutPath);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return res.status(404).json({ error: 'About file not found' });
      }
      throw err;
    }

    // Merge with existing meta, adding updated_at timestamp
    let existingMeta = {};
    try {
      const existingContent = await fs.readFile(metaPath, 'utf-8');
      existingMeta = JSON.parse(existingContent);
    } catch {}

    const updatedMeta = {
      ...existingMeta,
      ...meta,
      updated_at: new Date().toISOString()
    };

    await fs.writeFile(metaPath, JSON.stringify(updatedMeta, null, 2), 'utf-8');

    res.json({
      success: true,
      filename,
      meta: updatedMeta
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
