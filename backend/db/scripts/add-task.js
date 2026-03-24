const fs = require('fs');
const path = require('path');

// Usage: node add-task.js <company-slug> [type] [priority] [assigned_to]
// Example: node add-task.js rangani-engineering technical-audit high seo-orchestrator

const companySlug = process.argv[2];
if (!companySlug) {
    console.error('Usage: node add-task.js <company-slug> [type] [priority] [assigned_to]');
    console.error('Example: node add-task.js rangani-engineering technical-audit high seo-orchestrator');
    process.exit(1);
}

const taskType = process.argv[3] || 'technical-audit';
const priority = process.argv[4] || 'normal';
const assignedTo = process.argv[5] || 'seo-orchestrator';

// ROOT is openclaw-seo (parent of db folder)
const ROOT = path.join(__dirname, '..', '..', 'openclaw-seo');

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
const newTask = {
    id: `task-${companySlug}-${taskType}-${Date.now()}`,
    type: taskType,
    company: companySlug,
    report_period: null,
    priority: priority,
    status: 'pending',
    assigned_to: assignedTo,
    context: {},
    created_at: now,
    updated_at: now,
    iteration: 0,
    result: null,
    result_path: null,
    attempt_count: 0,
};

queue.push(newTask);
fs.writeFileSync(companyQueuePath, JSON.stringify(queue, null, 4));
console.log('Task added successfully to per-company queue:', newTask.id);
console.log('Queue file:', companyQueuePath);
console.log('Task:', JSON.stringify(newTask, null, 2));
