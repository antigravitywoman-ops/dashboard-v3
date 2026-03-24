/**
 * BLOG UPDATE SKILL
 * Reads GSC/GA4 history and current SERP gaps,
 * surgically refreshes an existing post without losing original SEO value.
 *
 * Patch Policy:
 *   MINOR  -> auto-apply within existing structure (no human gate)
 *   MAJOR  -> write to reviews/ and set status waiting-human
 *   NEVER  -> brand colors, logo, fonts, nav, brand voice (blocked unless explicit operator instruction)
 */
import fs from 'fs';
import path from 'path';

// Fields/patterns that are NEVER touched without explicit operator instruction
const PROTECTED_PATTERNS = [
  /brand.color/i,
  /--color-/i,
  /#[0-9a-f]{3,6}/i,
  /rgb\(/i,
  /font-family/i,
  /logo/i,
  /favicon/i,
  /navigation/i,
  /nav-menu/i,
];

// Changes that require human review (MAJOR)
const MAJOR_CHANGE_ACTIONS = [
  'reorder-sections',
  'add-section',
  'remove-section',
  'change-primary-keyword',
  'replace-body-bulk',
  'add-schema-type',
  'restructure-template',
];

function classifyUpdate(patchInstructions) {
  for (const instr of patchInstructions) {
    if (MAJOR_CHANGE_ACTIONS.includes(instr.action)) {
      return 'major';
    }
    const contentStr = JSON.stringify(instr.content || '');
    if (PROTECTED_PATTERNS.some(p => p.test(contentStr))) {
      return 'blocked';
    }
  }
  return 'minor';
}

export async function updateBlogPost(urlSlug, companySlug, patchInstructions = []) {
  console.log();

  const classification = classifyUpdate(patchInstructions);

  if (classification === 'blocked') {
    console.warn();
    return {
      success: false,
      status: 'blocked',
      reason: 'BLOCKED: touches brand/design protected fields — operator instruction required',
    };
  }

  if (classification === 'major') {
    console.log();
    const reviewPath = ;
    return {
      success: false,
      status: 'waiting-human',
      reviewPath,
      reason: 'Major structural update requires operator review before publishing.',
      patch: { patchInstructions },
    };
  }

  // MINOR update — apply within existing structure only
  const patch = {
    updatedDate: new Date().toISOString(),
    classification: 'minor',
    patchInstructions,
  };

  console.log();
  return { success: true, status: 'applied', patch };
}
