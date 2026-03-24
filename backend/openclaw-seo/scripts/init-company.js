/**
 * init-company.js — OpenClaw SEO company directory initializer
 *
 * Creates ONLY the canonical folder schema. No extra folders.
 * The schema is fixed and company-agnostic — identical for every client.
 * See skills/skill-execution-protocol for write-permission rules per folder.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: node init-company.js <company-slug>");
    process.exit(1);
}

const companySlug = args[0];
const baseDir = path.join(__dirname, '..', 'companies', companySlug);

// CANONICAL folder set — do not add to this list without updating
// skill-execution-protocol's Filesystem Discipline section.
const CANONICAL_DIRS = [
    '',
    'about',           // READ-ONLY after init. Agents never write here.
    'workspace',       // FREE-FORM. Only place agents may create sub-folders.
    'content',
    'content/pending-publish',  // Flat .md drafts only. No sub-folders.
    'memory',
    'memory/sheets',
    'plans',
    'plans/active',
    'reports',
    'reviews',
    'technical',
    'technical/audits',
];

CANONICAL_DIRS.forEach(dir => {
    const fullPath = path.join(baseDir, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`Created: ${dir || '.'}`);
    }
});

// .env template
const envExample = `# ${companySlug} — credentials
# Do not commit .env. Commit only .env.example with placeholder values.

# WordPress / CMS
WP_SITE_URL=https://example.com/
WP_USERNAME=admin@example.com
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

# Analytics
GOOGLE_SERVICE_ACCOUNT_JSON=/home/dev/openclaw-seo/keys/service-account.json
GSC_SITE_URL=https://example.com/
GA4_PROPERTY_ID=

# Data APIs
SERPER_API_KEY=
FIRECRAWL_API_KEY=

# Social
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USERNAME=
REDDIT_PASSWORD=
LINKEDIN_ACCESS_TOKEN=
MEDIUM_INTEGRATION_TOKEN=
QUORA_SESSION_TOKEN=
`;

const envExamplePath = path.join(baseDir, '.env.example');
if (!fs.existsSync(envExamplePath)) {
    fs.writeFileSync(envExamplePath, envExample);
    console.log('Created: .env.example');
}

const envPath = path.join(baseDir, '.env');
if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envExample);
    console.log('Created: .env (fill in credentials)');
}

// about/profile.md stub — operator fills this in before onboarding proceeds
const profilePath = path.join(baseDir, 'about', 'profile.md');
if (!fs.existsSync(profilePath)) {
    fs.writeFileSync(profilePath, `# ${companySlug} — Profile

> OPERATOR: Fill in all [REQUIRED] fields before running the onboarding workflow.
> about/ is READ-ONLY for agents after init. Edit these files manually.

## Business
**Name**: [REQUIRED: Exact legal business name]
**Website**: [REQUIRED: https://]
**CMS**: [WordPress / Webflow / Squarespace / other]
**Industry**: [REQUIRED]
**Location**: [REQUIRED: City, State, Country]

## NAP (Name / Address / Phone)
**Address**: [REQUIRED: Full public address]
**Phone**: [REQUIRED: Public phone number]
**Email**: [public contact email]

## Notes
`);
    console.log('Created: about/profile.md (fill in before onboarding)');
}

// workspace README
const wsReadme = path.join(baseDir, 'workspace', 'README.md');
if (!fs.existsSync(wsReadme)) {
    fs.writeFileSync(wsReadme, `# workspace/

Agent-writable free-form zone for ${companySlug}.

Agents may create sub-folders and any files here.
Use this for: research notes, content briefs, product/service summaries, competitor intel, outreach lists.

Do NOT use for: content drafts ready to publish (use content/pending-publish/) or review files (use reviews/).
`);
    console.log('Created: workspace/README.md');
}

// memory/episodic.md seed
const episodicPath = path.join(baseDir, 'memory', 'episodic.md');
if (!fs.existsSync(episodicPath)) {
    fs.writeFileSync(episodicPath, `# Episodic Memory — ${companySlug}\n\n`);
    console.log('Created: memory/episodic.md');
}

// technical/issues-log.md seed
const issuesPath = path.join(baseDir, 'technical', 'issues-log.md');
if (!fs.existsSync(issuesPath)) {
    fs.writeFileSync(issuesPath, `# Technical Issues Log — ${companySlug}\n\n`);
    console.log('Created: technical/issues-log.md');
}

console.log(`\n✅ ${companySlug} initialized with canonical structure.`);
console.log(`\n⚠️  ACTION REQUIRED: Fill in companies/${companySlug}/about/profile.md before running onboarding.`);
