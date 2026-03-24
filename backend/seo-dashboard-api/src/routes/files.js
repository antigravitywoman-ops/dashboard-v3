const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const { checkCompanyAccess, requireRole } = require('../middleware/permissions');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(__dirname, '..', '..', 'openclaw-seo');

// Get all folders with .md file counts
router.get('/:slug/folders', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const companyDir = path.join(OPENCLAW_DIR, 'companies', slug);

    try {
      await fs.access(companyDir);
    } catch {
      return res.status(404).json({ error: 'Company not found' });
    }

    const folders = await scanFolders(companyDir, '');
    res.json({ folders });
  } catch (err) {
    next(err);
  }
});

// List files in a specific folder
router.get('/:slug/files', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { path: folderPath } = req.query;

    if (!folderPath) {
      return res.status(400).json({ error: 'Missing path query parameter' });
    }

    const companyDir = path.join(OPENCLAW_DIR, 'companies', slug);
    const targetDir = path.join(companyDir, folderPath);

    const resolvedCompanyDir = path.resolve(companyDir);
    const resolvedTargetDir = path.resolve(targetDir);

    if (!resolvedTargetDir.startsWith(resolvedCompanyDir + path.sep) && resolvedTargetDir !== resolvedCompanyDir) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    try {
      await fs.access(targetDir);
    } catch {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(targetDir, entry.name);
        const stats = await fs.stat(filePath);
        files.push({
          name: entry.name,
          path: folderPath,
          size: stats.size,
          modified: stats.mtime.toISOString()
        });
      }
    }

    files.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    res.json({ path: folderPath, files });
  } catch (err) {
    next(err);
  }
});

// Read a specific file
router.get('/:slug/file', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { path: filePath } = req.query;

    if (!filePath) {
      return res.status(400).json({ error: 'Missing path query parameter' });
    }

    const companyDir = path.join(OPENCLAW_DIR, 'companies', slug);
    const targetFile = path.join(companyDir, filePath);

    const resolvedCompanyDir = path.resolve(companyDir);
    const resolvedTargetFile = path.resolve(targetFile);

    if (!resolvedTargetFile.startsWith(resolvedCompanyDir + path.sep) && resolvedTargetFile !== resolvedCompanyDir) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    try {
      await fs.access(targetFile);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    const content = await fs.readFile(targetFile, 'utf-8');
    const stats = await fs.stat(targetFile);

    res.json({
      path: filePath,
      content,
      size: stats.size,
      modified: stats.mtime.toISOString()
    });
  } catch (err) {
    next(err);
  }
});

// Write a specific file (requires EDITOR or ADMIN)
router.put('/:slug/file', checkCompanyAccess, requireRole(['ADMIN', 'EDITOR']), async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { path: filePath, content } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'Missing path in request body' });
    }

    if (content === undefined) {
      return res.status(400).json({ error: 'Missing content in request body' });
    }

    const companyDir = path.join(OPENCLAW_DIR, 'companies', slug);
    const targetFile = path.join(companyDir, filePath);

    const resolvedCompanyDir = path.resolve(companyDir);
    const resolvedTargetFile = path.resolve(targetFile);

    if (!resolvedTargetFile.startsWith(resolvedCompanyDir + path.sep) && resolvedTargetFile !== resolvedCompanyDir) {
      return res.status(403).json({ error: 'Invalid path' });
    }

    const dir = path.dirname(targetFile);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(targetFile, content, 'utf-8');
    res.json({ success: true, path: filePath });
  } catch (err) {
    next(err);
  }
});

async function scanFolders(baseDir, relativePath) {
  const folders = [];
  const fullDir = path.join(baseDir, relativePath);

  try {
    const entries = await fs.readdir(fullDir, { withFileTypes: true });
    const mdFiles = entries.filter(e => e.isFile() && e.name.endsWith('.md'));

    if (mdFiles.length > 0 || relativePath === '') {
      folders.push({
        name: relativePath.split('/').pop() || 'root',
        path: relativePath || '.',
        fileCount: mdFiles.length
      });
    }

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const subPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        const subFolders = await scanFolders(baseDir, subPath);
        folders.push(...subFolders);
      }
    }
  } catch (err) {}

  return folders;
}

module.exports = router;
