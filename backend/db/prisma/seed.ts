// db/prisma/seed.ts
// Production-grade seed script for SEO Dashboard database
// Run with: npx prisma db seed

import { PrismaClient, Role, CompanyRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Production passwords - CHANGE THESE after first login!
// In production, use: openssl rand -base64 24
const PASSWORDS = {
  master: 'P@ssw0rd!2026.S3cur3.M@st3r',
  arpitAdmin: 'Arpit2026!Admin.S3cur3',
  inikaAdmin: 'Inika2026!Admin.S3cur3',
  ranganiAdmin: 'Rangani2026!Admin.S3cur3',
  arpitEditor: 'Arpit2026!Edit.S3cur3',
  inikaEditor: 'Inika2026!Edit.S3cur3',
  ranganiEditor: 'Rangani2026!Edit.S3cur3',
  arpitViewer: 'Arpit2026!View.S3cur3',
  inikaViewer: 'Inika2026!View.S3cur3',
  ranganiViewer: 'Rangani2026!View.S3cur3',
};

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log('🚀 Starting production database seed...\n');

  // Clean up existing data to ensure fresh seed
  console.log('🧹 Cleaning up existing data...')
  await prisma.userCompany.deleteMany({})
  await prisma.session.deleteMany({})
  await prisma.chatMessage.deleteMany({})
  await prisma.user.deleteMany({})
  console.log('✅ Cleanup complete\n')

  // =============================================
  // 1. MASTER USER (System Administrator)
  // =============================================
  const masterPassword = await hashPassword(PASSWORDS.master);
  const masterUser = await prisma.user.upsert({
    where: { email: 'admin@seodashboard.io' },
    update: {
      passwordHash: masterPassword,
      name: 'System Administrator',
    },
    create: {
      email: 'admin@seodashboard.io',
      name: 'System Administrator',
      passwordHash: masterPassword,
      role: Role.MASTER,
    },
  });
  console.log(`✅ Created/Updated MASTER user: ${masterUser.email} (password: ${PASSWORDS.master})`);

  // =============================================
  // 2. COMPANY ADMINS (One per company)
  // =============================================

  // Arpit Sharma Writing - Admin
  const arpitAdminPassword = await hashPassword(PASSWORDS.arpitAdmin);
  const arpitAdmin = await prisma.user.upsert({
    where: { email: 'arpit@arpit-sharma-writing.com' },
    update: { passwordHash: arpitAdminPassword, name: 'Arpit Sharma' },
    create: {
      email: 'arpit@arpit-sharma-writing.com',
      name: 'Arpit Sharma',
      passwordHash: arpitAdminPassword,
      role: Role.COMPANY_ADMIN,
      companies: {
        create: [
          {
            companyId: 'arpit-sharma-writing',
            role: CompanyRole.ADMIN,
            assignedBy: masterUser.id,
          },
        ],
      },
    },
  });
  console.log(`✅ Created COMPANY_ADMIN: ${arpitAdmin.email} (password: ${PASSWORDS.arpitAdmin})`);

  // Inika Resorts - Admin
  const inikaAdminPassword = await hashPassword(PASSWORDS.inikaAdmin);
  const inikaAdmin = await prisma.user.upsert({
    where: { email: 'admin@inika-resorts.com' },
    update: {},
    create: {
      email: 'admin@inika-resorts.com',
      name: 'Inika Resorts Manager',
      passwordHash: inikaAdminPassword,
      role: Role.COMPANY_ADMIN,
      companies: {
        create: [
          {
            companyId: 'inika-resorts',
            role: CompanyRole.ADMIN,
            assignedBy: masterUser.id,
          },
        ],
      },
    },
  });
  console.log(`✅ Created COMPANY_ADMIN: ${inikaAdmin.email} (password: ${PASSWORDS.inikaAdmin})`);

  // Rangani Engineering - Admin
  const ranganiAdminPassword = await hashPassword(PASSWORDS.ranganiAdmin);
  const ranganiAdmin = await prisma.user.upsert({
    where: { email: 'admin@rangani-engineering.com' },
    update: {},
    create: {
      email: 'admin@rangani-engineering.com',
      name: 'Rangani Engineering Manager',
      passwordHash: ranganiAdminPassword,
      role: Role.COMPANY_ADMIN,
      companies: {
        create: [
          {
            companyId: 'rangani-engineering',
            role: CompanyRole.ADMIN,
            assignedBy: masterUser.id,
          },
        ],
      },
    },
  });
  console.log(`✅ Created COMPANY_ADMIN: ${ranganiAdmin.email} (password: ${PASSWORDS.ranganiAdmin})`);

  // =============================================
  // 3. EDITORS (One per company)
  // =============================================

  // Arpit Sharma Writing - Editor
  const arpitEditorPassword = await hashPassword(PASSWORDS.arpitEditor);
  const arpitEditor = await prisma.user.upsert({
    where: { email: 'editor@arpit-sharma-writing.com' },
    update: {},
    create: {
      email: 'editor@arpit-sharma-writing.com',
      name: 'Arpit Content Editor',
      passwordHash: arpitEditorPassword,
      role: Role.VIEWER,
      companies: {
        create: [
          {
            companyId: 'arpit-sharma-writing',
            role: CompanyRole.EDITOR,
            assignedBy: arpitAdmin.id,
          },
        ],
      },
    },
  });
  console.log(`✅ Created EDITOR: ${arpitEditor.email} (password: ${PASSWORDS.arpitEditor})`);

  // Inika Resorts - Editor
  const inikaEditorPassword = await hashPassword(PASSWORDS.inikaEditor);
  const inikaEditor = await prisma.user.upsert({
    where: { email: 'editor@inika-resorts.com' },
    update: {},
    create: {
      email: 'editor@inika-resorts.com',
      name: 'Inika Content Editor',
      passwordHash: inikaEditorPassword,
      role: Role.VIEWER,
      companies: {
        create: [
          {
            companyId: 'inika-resorts',
            role: CompanyRole.EDITOR,
            assignedBy: inikaAdmin.id,
          },
        ],
      },
    },
  });
  console.log(`✅ Created EDITOR: ${inikaEditor.email} (password: ${PASSWORDS.inikaEditor})`);

  // Rangani Engineering - Editor
  const ranganiEditorPassword = await hashPassword(PASSWORDS.ranganiEditor);
  const ranganiEditor = await prisma.user.upsert({
    where: { email: 'editor@rangani-engineering.com' },
    update: {},
    create: {
      email: 'editor@rangani-engineering.com',
      name: 'Rangani Content Editor',
      passwordHash: ranganiEditorPassword,
      role: Role.VIEWER,
      companies: {
        create: [
          {
            companyId: 'rangani-engineering',
            role: CompanyRole.EDITOR,
            assignedBy: ranganiAdmin.id,
          },
        ],
      },
    },
  });
  console.log(`✅ Created EDITOR: ${ranganiEditor.email} (password: ${PASSWORDS.ranganiEditor})`);

  // =============================================
  // 4. VIEWERS (One per company)
  // =============================================

  // Arpit Sharma Writing - Viewer
  const arpitViewerPassword = await hashPassword(PASSWORDS.arpitViewer);
  const arpitViewer = await prisma.user.upsert({
    where: { email: 'viewer@arpit-sharma-writing.com' },
    update: {},
    create: {
      email: 'viewer@arpit-sharma-writing.com',
      name: 'Arpit Viewer',
      passwordHash: arpitViewerPassword,
      role: Role.VIEWER,
      companies: {
        create: [
          {
            companyId: 'arpit-sharma-writing',
            role: CompanyRole.VIEWER,
            assignedBy: arpitAdmin.id,
          },
        ],
      },
    },
  });
  console.log(`✅ Created VIEWER: ${arpitViewer.email} (password: ${PASSWORDS.arpitViewer})`);

  // Inika Resorts - Viewer
  const inikaViewerPassword = await hashPassword(PASSWORDS.inikaViewer);
  const inikaViewer = await prisma.user.upsert({
    where: { email: 'viewer@inika-resorts.com' },
    update: {},
    create: {
      email: 'viewer@inika-resorts.com',
      name: 'Inika Viewer',
      passwordHash: inikaViewerPassword,
      role: Role.VIEWER,
      companies: {
        create: [
          {
            companyId: 'inika-resorts',
            role: CompanyRole.VIEWER,
            assignedBy: inikaAdmin.id,
          },
        ],
      },
    },
  });
  console.log(`✅ Created VIEWER: ${inikaViewer.email} (password: ${PASSWORDS.inikaViewer})`);

  // Rangani Engineering - Viewer
  const ranganiViewerPassword = await hashPassword(PASSWORDS.ranganiViewer);
  const ranganiViewer = await prisma.user.upsert({
    where: { email: 'viewer@rangani-engineering.com' },
    update: {},
    create: {
      email: 'viewer@rangani-engineering.com',
      name: 'Rangani Viewer',
      passwordHash: ranganiViewerPassword,
      role: Role.VIEWER,
      companies: {
        create: [
          {
            companyId: 'rangani-engineering',
            role: CompanyRole.VIEWER,
            assignedBy: ranganiAdmin.id,
          },
        ],
      },
    },
  });
  console.log(`✅ Created VIEWER: ${ranganiViewer.email} (password: ${PASSWORDS.ranganiViewer})`);

  // =============================================
  // 5. System Config
  // =============================================
  await prisma.systemConfig.upsert({
    where: { key: 'cached_companies' },
    update: {},
    create: {
      key: 'cached_companies',
      value: {
        lastUpdated: new Date().toISOString(),
        companies: [
          { slug: 'arpit-sharma-writing', name: 'Arpit Sharma Writing', status: 'active' },
          { slug: 'inika-resorts', name: 'Inika Resorts', status: 'active' },
          { slug: 'rangani-engineering', name: 'Rangani Engineering', status: 'active' },
        ],
      },
    },
  });
  console.log('✅ Updated system config');

  // =============================================
  // SUMMARY
  // =============================================
  console.log('\n✨ Production seed completed successfully!');
  console.log('\n📧 Login credentials:\n');
  console.log('  MASTER (System Admin):');
  console.log('    Email: admin@seodashboard.io');
  console.log('    Password: P@ssw0rd!2026.S3cur3.M@st3r\n');
  console.log('  COMPANY ADMINS:');
  console.log('    arpit-sharma-writing: arpit@arpit-sharma-writing.com / Arpit2026!Admin.S3cur3');
  console.log('    inika-resorts: admin@inika-resorts.com / Inika2026!Admin.S3cur3');
  console.log('    rangani-engineering: admin@rangani-engineering.com / Rangani2026!Admin.S3cur3\n');
  console.log('  EDITORS:');
  console.log('    arpit-sharma-writing: editor@arpit-sharma-writing.com / Arpit2026!Edit.S3cur3');
  console.log('    inika-resorts: editor@inika-resorts.com / Inika2026!Edit.S3cur3');
  console.log('    rangani-engineering: editor@rangani-engineering.com / Rangani2026!Edit.S3cur3\n');
  console.log('  VIEWERS:');
  console.log('    arpit-sharma-writing: viewer@arpit-sharma-writing.com / Arpit2026!View.S3cur3');
  console.log('    inika-resorts: viewer@inika-resorts.com / Inika2026!View.S3cur3');
  console.log('    rangani-engineering: viewer@rangani-engineering.com / Rangani2026!View.S3cur3\n');
  console.log('⚠️  IMPORTANT: Change these passwords after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });