/**
 * SEO Dashboard Database Package
 *
 * This package provides database access for the SEO Dashboard system.
 * It contains the Prisma client and authentication helpers.
 *
 * Usage:
 *   const { prisma } = require('./db')
 *   const auth = require('./db/lib/auth')
 */

const { prisma } = require('./lib/db')
const auth = require('./lib/auth')

module.exports = {
  prisma,
  ...auth,
}
