const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const { checkCompanyAccess, requireRole } = require('../middleware/permissions');

const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(__dirname, '..', '..', 'openclaw-seo');

const CONTENT_FOLDERS = ['pending-publish', 'in-review', 'approved', 'published', 'rejected'];

// Derive a human-readable hover_label from task type + context
function deriveHoverLabel(task) {
  const type = task.type || '';
  const ctx  = task.context || {};
  if (type === 'content-publish' || type === 'content-refresh-publish') {
    if (ctx.draft_filename) return `Publish Content: ${ctx.draft_filename}`;
    if (ctx.target_keyword) return `Publish Content: keyword "${ctx.target_keyword}"`;
  }
  return type || 'Unknown Task';
}

// Ensure all content status folders exist
async function ensureContentFolders(companyDir) {
  for (const folder of CONTENT_FOLDERS) {
    const folderPath = path.join(companyDir, folder);
    try {
      await fs.access(folderPath);
    } catch {
      await fs.mkdir(folderPath, { recursive: true });
    }
  }
}

// Extract a one-sentence summary (max 150 chars) from markdown content.
// Skips frontmatter and the title, then finds the first paragraph.
function extractSummaryFromContent(content) {
  if (!content) return null;
  // Strip frontmatter
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '');
  // Strip markdown syntax
  const plain = withoutFrontmatter
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^[|>-].*/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
  // Find first sentence-ending punctuation
  const match = plain.match(/[^.!?]*[.!?]/);
  if (match) {
    const sentence = match[0].trim();
    return sentence.length > 150 ? sentence.slice(0, 147) + '...' : sentence;
  }
  // Fallback: first 150 chars
  return plain.slice(0, 150) || null;
}

// Extract H2 headings as highlights (max 5 items, max 80 chars each).
function extractHighlightsFromContent(content) {
  if (!content) return [];
  const h2Matches = content.match(/^##\s+(.+)$/gm) || [];
  return h2Matches
    .slice(0, 5)
    .map(h => h.replace(/^##\s+/, '').trim().slice(0, 80));
}

// Generate default metadata from content file
async function generateContentMeta(mdPath, folder, baseName) {
  const metaPath = `${mdPath.replace('.md', '')}.meta.json`;

  try {
    await fs.access(metaPath);
    const content = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Generate from content
    let title = baseName.replace(/-/g, ' ');
    let word_count = 0;
    let contentBody = '';

    try {
      contentBody = await fs.readFile(mdPath, 'utf-8');
      word_count = contentBody.split(/\s+/).filter(w => w.length > 0).length;

      // Try to extract title from first H1
      const h1Match = contentBody.match(/^#\s+(.+)$/m);
      if (h1Match) {
        title = h1Match[1];
      }
    } catch {}

    const now = new Date().toISOString();
    return {
      title,
      type: 'blog-post',
      status: folder,
      word_count,
      seo_score: null,
      target_url: null,
      author: null,
      gap_id: null,
      week_target: null,
      priority: null,
      keywords: [],
      summary: extractSummaryFromContent(contentBody),
      highlights: extractHighlightsFromContent(contentBody),
      created_at: now,
      updated_at: now,
      published_at: null,
      gate_status: 'pending',
      gate_notes: null,
      _auto_generated: true,
      publishing_status: null,
      publishing_task_id: null,
      publishing_error: null
    };
  }
}

// Get all content for a company
router.get('/:slug/content', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const companyDir = path.join(OPENCLAW_DIR, 'companies', slug, 'content');

    try {
      await fs.access(companyDir);
    } catch {
      // Create content folder structure for new companies
      await ensureContentFolders(companyDir);
      return res.json({ content: [], _initialized: true });
    }

    const allContent = [];

    for (const folder of CONTENT_FOLDERS) {
      const folderPath = path.join(companyDir, folder);
      try {
        await fs.access(folderPath);
      } catch {
        // Create missing folder
        await fs.mkdir(folderPath, { recursive: true });
        continue;
      }

      try {
        const entries = await fs.readdir(folderPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.meta.json'))) {
            if (entry.name.endsWith('.meta.json')) continue;

            const fullPath = path.join(folderPath, entry.name);
            const stats = await fs.stat(fullPath);
            const baseName = entry.name.replace('.md', '');

            const meta = await generateContentMeta(fullPath, folder, baseName);

            allContent.push({
              filename: entry.name,
              path: folder,
              status: folder,
              title: meta.title || baseName,
              type: meta.type || 'unknown',
              word_count: meta.word_count,
              seo_score: meta.seo_score,
              target_url: meta.target_url,
              author: meta.author,
              summary: meta.summary || null,
              highlights: meta.highlights || null,
              created_at: meta.created_at || stats.birthtime.toISOString(),
              updated_at: meta.updated_at || stats.mtime.toISOString(),
              modified: stats.mtime.toISOString(),
              _meta_auto_generated: meta._auto_generated || false,
              publishing_status: meta.publishing_status || null,
              publishing_task_id: meta.publishing_task_id || null,
              publishing_error: meta.publishing_error || null
            });
          }
        }
      } catch {}
    }

    allContent.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    res.json({ content: allContent });
  } catch (err) {
    next(err);
  }
});

// Get specific content file
router.get('/:slug/content/:filename', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, filename } = req.params;
    const companyDir = path.join(OPENCLAW_DIR, 'companies', slug, 'content');

    for (const folder of CONTENT_FOLDERS) {
      const filePath = path.join(companyDir, folder, filename);
      try {
        await fs.access(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);

        return res.json({
          filename,
          path: folder,
          content,
          size: stats.size,
          modified: stats.mtime.toISOString()
        });
      } catch {}
    }

    return res.status(404).json({ error: 'Content file not found' });
  } catch (err) {
    next(err);
  }
});

// Get content metadata
router.get('/:slug/content/:filename/meta', checkCompanyAccess, async (req, res, next) => {
  try {
    const { slug, filename } = req.params;
    const companyDir = path.join(OPENCLAW_DIR, 'companies', slug, 'content');
    const baseName = filename.replace('.md', '');

    for (const folder of CONTENT_FOLDERS) {
      const metaPath = path.join(companyDir, folder, `${baseName}.meta.json`);
      try {
        const content = await fs.readFile(metaPath, 'utf-8');
        const meta = JSON.parse(content);
        return res.json(meta);
      } catch {}
    }

    return res.status(404).json({ error: 'Metadata file not found' });
  } catch (err) {
    next(err);
  }
});

// Update content file (requires EDITOR or ADMIN)
router.put('/:slug/content/:filename', checkCompanyAccess, requireRole(['ADMIN', 'EDITOR']), async (req, res, next) => {
  try {
    const { slug, filename } = req.params;
    const { content, move_to_status } = req.body;
    const companyDir = path.join(OPENCLAW_DIR, 'companies', slug, 'content');

    let currentPath = null;
    let currentFolder = null;

    for (const folder of CONTENT_FOLDERS) {
      const filePath = path.join(companyDir, folder, filename);
      try {
        await fs.access(filePath);
        currentPath = filePath;
        currentFolder = folder;
        break;
      } catch {}
    }

    if (move_to_status && CONTENT_FOLDERS.includes(move_to_status) && currentFolder !== move_to_status) {
      let fileContent = content;
      if (!fileContent && currentPath) {
        fileContent = await fs.readFile(currentPath, 'utf-8');
      }

      if (fileContent) {
        const targetPath = path.join(companyDir, move_to_status, filename);
        await fs.writeFile(targetPath, fileContent, 'utf-8');
      }

      const baseName = filename.replace('.md', '');
      const sourceMetaPath = path.join(companyDir, currentFolder, `${baseName}.meta.json`);
      const targetMetaPath = path.join(companyDir, move_to_status, `${baseName}.meta.json`);

      try {
        const metaContent = await fs.readFile(sourceMetaPath, 'utf-8');
        const meta = JSON.parse(metaContent);
        meta.status = move_to_status;
        meta.updated_at = new Date().toISOString();
        await fs.writeFile(targetMetaPath, JSON.stringify(meta, null, 2), 'utf-8');
        await fs.unlink(sourceMetaPath);
      } catch {}

      if (currentPath && currentPath !== path.join(companyDir, move_to_status, filename)) {
        await fs.unlink(currentPath);
      }

      return res.json({ success: true, path: move_to_status, filename });
    }

    if (content !== undefined && currentPath) {
      await fs.writeFile(currentPath, content, 'utf-8');
      return res.json({ success: true, path: currentFolder, filename });
    }

    if (!currentPath) {
      return res.status(404).json({ error: 'Content file not found' });
    }

    return res.status(400).json({ error: 'No content provided' });
  } catch (err) {
    next(err);
  }
});

// Update content metadata (requires EDITOR or ADMIN)
router.put('/:slug/content/:filename/meta', checkCompanyAccess, requireRole(['ADMIN', 'EDITOR']), async (req, res, next) => {
  try {
    const { slug, filename } = req.params;
    const companyDir = path.join(OPENCLAW_DIR, 'companies', slug, 'content');
    const baseName = filename.replace('.md', '');

    for (const folder of CONTENT_FOLDERS) {
      const filePath = path.join(companyDir, folder, filename);
      try {
        await fs.access(filePath);

        const metaPath = path.join(companyDir, folder, `${baseName}.meta.json`);
        let meta = {};
        try {
          const content = await fs.readFile(metaPath, 'utf-8');
          meta = JSON.parse(content);
        } catch {}

        meta = { ...meta, ...req.body, updated_at: new Date().toISOString() };
        await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

        return res.json(meta);
      } catch {}
    }

    return res.status(404).json({ error: 'Content file not found' });
  } catch (err) {
    next(err);
  }
});

// Update content status (requires EDITOR or ADMIN)
router.patch('/:slug/content/:filename/status', checkCompanyAccess, requireRole(['ADMIN', 'EDITOR']), async (req, res, next) => {
  try {
    const { slug, filename } = req.params;
    const { status } = req.body;

    if (!status || !CONTENT_FOLDERS.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const companyDir = path.join(OPENCLAW_DIR, 'companies', slug, 'content');
    const baseName = filename.replace('.md', '');

    for (const folder of CONTENT_FOLDERS) {
      const filePath = path.join(companyDir, folder, filename);
      try {
        await fs.access(filePath);

        const content = await fs.readFile(filePath, 'utf-8');
        const targetPath = path.join(companyDir, status, filename);
        await fs.writeFile(targetPath, content, 'utf-8');

        const metaPath = path.join(companyDir, folder, `${baseName}.meta.json`);
        const targetMetaPath = path.join(companyDir, status, `${baseName}.meta.json`);

        try {
          const metaContent = await fs.readFile(metaPath, 'utf-8');
          const meta = JSON.parse(metaContent);
          meta.status = status;
          meta.updated_at = new Date().toISOString();
          await fs.writeFile(targetMetaPath, JSON.stringify(meta, null, 2), 'utf-8');
          await fs.unlink(metaPath);
        } catch {}

        await fs.unlink(filePath);
        return res.json({ success: true, status, filename });
      } catch {}
    }

    return res.status(404).json({ error: 'Content file not found' });
  } catch (err) {
    next(err);
  }
});

// Publish content — creates a content-publish task in the queue (requires EDITOR or ADMIN)
// This is the correct flow: user click -> task created -> content-publisher agent -> CMS push -> verification -> published/
router.post('/:slug/content/:filename/publish', checkCompanyAccess, requireRole(['ADMIN', 'EDITOR']), async (req, res, next) => {
  try {
    const { slug, filename } = req.params;
    const companyDir = path.join(OPENCLAW_DIR, 'companies', slug, 'content');
    const baseName = filename.replace('.md', '');

    // Verify file is in 'approved' folder
    const approvedDir = path.join(companyDir, 'approved');
    const approvedFilePath = path.join(approvedDir, filename);

    try {
      await fs.access(approvedFilePath);
    } catch {
      return res.status(400).json({ error: 'Content file must be in approved status to publish' });
    }

    // Read the content file to extract frontmatter for task context
    let content = '';
    let meta = {};
    try {
      content = await fs.readFile(approvedFilePath, 'utf-8');
    } catch {}

    const metaPath = path.join(approvedDir, `${baseName}.meta.json`);
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      meta = JSON.parse(metaContent);
    } catch {}

    // Extract frontmatter fields
    const frontmatter = {};
    const lines = content.split('\n');
    let inFrontmatter = false;
    for (const line of lines) {
      if (line.trim() === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
          continue;
        } else {
          break;
        }
      }
      if (inFrontmatter) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const key = line.slice(0, colonIdx).trim();
          const value = line.slice(colonIdx + 1).trim();
          frontmatter[key] = value;
        }
      }
    }

    // Read existing per-company task queue (source of truth for the pipeline)
    const taskQueuePath = path.join(OPENCLAW_DIR, 'companies', slug, 'memory', 'tasks', 'queue.json');
    let tasks = [];
    try {
      const content = await fs.readFile(taskQueuePath, 'utf-8');
      tasks = JSON.parse(content);
    } catch {}

    // Check for existing pending/in-progress content-publish task for this file
    const existingPublishTask = tasks.find(t =>
      t.company === slug &&
      t.context &&
      t.context.draft_filename === filename &&
      ['pending', 'in-progress', 'pending-verification'].includes(t.status)
    );
    if (existingPublishTask) {
      return res.status(409).json({
        error: 'A publish task already exists for this content',
        task_id: existingPublishTask.id,
        task_status: existingPublishTask.status
      });
    }

    // Generate task ID
    const timestamp = Date.now();
    const taskId = `task-${slug}-content-publish-${timestamp}`;

    // Read gate result if it exists
    // Gate result is stored as <task-id>-gate.json, where task-id comes from the content-writer task
    // For agent-generated content, task_id is in meta.json.task_id
    // For manually-created content, fall back to baseName
    const taskIdForGate = meta.task_id || frontmatter.task_id || baseName;
    const gateResultPath = path.join(companyDir, 'gate-results', `${taskIdForGate}-gate.json`);
    let gateStatus = 'pending'; // Default: gate has not been run yet — orchestrator will trigger it
    let gateResult = null;
    try {
      const gateContent = await fs.readFile(gateResultPath, 'utf-8');
      gateResult = JSON.parse(gateContent);
      gateStatus = gateResult.pass ? 'passed' : 'failed';
    } catch {}

    // Create the content-publish task
    const newTask = {
      id: taskId,
      type: 'content-publish',
      company: slug,
      report_period: null,
      priority: 'high',
      status: 'pending',
      assigned_to: 'content-publisher', // content-publisher handles gate check inline if gate_status is pending
      context: {
        company: slug,
        draft_filename: filename,
        draft_path: `companies/${slug}/content/approved/${filename}`,
        gate_status: gateStatus,
        gate_result_path: gateResult ? `companies/${slug}/content/gate-results/${taskIdForGate}-gate.json` : null,
        source_task_id: meta.task_id || frontmatter.task_id || null,
        target_keyword: meta.target_keyword || frontmatter.target_keyword || null,
        cms_type: meta.cms_type || frontmatter.cms_type || 'wordpress',
        publish_live: meta.publish_live || frontmatter.publish_live || false,
        distribution_channels: meta.distribution_channels || frontmatter.distribution_channels || [],
        meta_title: meta.meta_title || frontmatter.meta_title || null,
        meta_description: meta.meta_description || frontmatter.meta_description || null,
        original_url: meta.original_url || frontmatter.original_url || null,
        original_post_id: meta.original_post_id || frontmatter.original_post_id || null,
        post_type: meta.type || frontmatter.type || 'new',
        trigger: 'dashboard-manual-publish'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      iteration: 0,
      result: null,
      result_path: null,
      attempt_count: 0,
      progress: null,
    };
    newTask.hover_label = deriveHoverLabel(newTask);

    tasks.push(newTask);
    await fs.writeFile(taskQueuePath, JSON.stringify(tasks, null, 2));

    // Update the content meta.json with publishing status so the dashboard reflects progress
    const updatedMeta = {
      ...meta,
      publishing_status: 'gate-checking',
      publishing_task_id: taskId,
      publishing_error: null,
      updated_at: new Date().toISOString()
    };
    await fs.writeFile(metaPath, JSON.stringify(updatedMeta, null, 2));

    res.status(201).json({
      success: true,
      task: newTask,
      publishing_status: 'gate-checking',
      publishing_task_id: taskId,
      message: `Publish task created. The content-publisher agent will now push this content to the CMS and verification will follow.`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
