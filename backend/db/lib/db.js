/**
 * SEO Dashboard Database Client
 *
 * This module provides a singleton Prisma client for database operations.
 * Import this in any module that needs database access.
 *
 * Usage:
 *   const { prisma } = require('../db')
 *   const user = await prisma.user.findUnique({ where: { email } })
 */

const { PrismaClient } = require('@prisma/client')

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

module.exports = {
  prisma,
}
