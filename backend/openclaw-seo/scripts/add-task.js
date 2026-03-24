const fs = require('fs');
const path = require('path');

// Usage: node add-task.js <company-slug> [type] [priority] [assigned_to]
// Example: node add-task.js rangani-engineering technical-audit high seo-orchestrator

const ROOT = path.join(__dirname, '..');

const companySlug = process.argv[2];
if (!companySlug) {
    console.error('Usage: node add-task.js <company-slug> [type] [priority] [assigned_to]');
    console.error('Example: node add-task.js rangani-engineering technical-audit high seo-orchestrator');
    process.exit(1);
}

const taskType = process.argv[3] || 'technical-audit';
const priority = process.argv[4] || 'normal';
const assignedTo = process.argv[5] || 'seo-orchestrator';

// Human-readable labels
const TASK_LABELS = {
    'generate-report': 'Generate Report', 'technical-audit': 'Technical Audit',
    'content-publish': 'Publish Content', 'website-edit': 'Website Edit',
    'human-review': 'Human Review', 'delta-evaluation': 'Delta Evaluation',
    'content-draft': 'Draft Content', 'blog-post': 'Blog Post',
    'schema-inject': 'Inject Schema', 'on-page-fix': 'On-Page Fix',
    'sheet-fix': 'Fix Sheet', 'validate-sheets': 'Validate Sheets',
    'excel-generation': 'Generate Excel', 'update-deps': 'Update Dependencies',
    'build-plan': 'Build Plan', 'process-review-decision': 'Process Review',
    'process-human-review': 'Process Human Review',
};

function deriveHoverLabel(type, context) {
    if (type === 'generate-report' && context.period) return `Generate Report — ${context.period}`;
    if (type === 'technical-audit' && context.report_period) return `Technical Audit — ${context.report_period}`;
    if (type === 'human-review' && context.target) return `Human Review: ${context.target}`;
    return TASK_LABELS[type] || type || 'Unknown Task';
}

// Per-company queue path (primary source of truth)
const companyQueuePath = path.join(ROOT, 'companies', companySlug, 'memory', 'tasks', 'queue.json');
const companyQueueDir = path.dirname(companyQueuePath);

// Ensure directory exists
if (!fs.existsSync(companyQueueDir)) {
    fs.mkdirSync(companyQueueDir, { recursive: true });
}

// Read existing queue or start fresh
let queue = [];
if (fs.existsSync(companyQueuePath)) {
    try {
        queue = JSON.parse(fs.readFileSync(companyQueuePath, 'utf-8'));
        if (!Array.isArray(queue)) queue = [];
    } catch (e) {
        console.error('Failed to parse queue.json:', e.message);
        process.exit(1);
    }
}

const now = new Date().toISOString();
const context = {};
const newTask = {
    id: `task-${companySlug}-${taskType}-${Date.now()}`,
    type: taskType,
    company: companySlug,
    report_period: null,
    priority: priority,
    status: 'pending',
    assigned_to: assignedTo,
    context,
    created_at: now,
    updated_at: now,
    iteration: 0,
    result: null,
    result_path: null,
    attempt_count: 0,
    hover_label: deriveHoverLabel(taskType, context),
};

queue.push(newTask);
fs.writeFileSync(companyQueuePath, JSON.stringify(queue, null, 4));
console.log('Task added successfully to per-company queue:', newTask.id);
console.log('Queue file:', companyQueuePath);
console.log('Task:', JSON.stringify(newTask, null, 2));
