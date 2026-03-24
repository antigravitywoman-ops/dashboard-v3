/**
 * User Management Routes
 *
 * These routes require a valid session and MASTER role for most operations.
 *
 * GET /api/users - List all users (MASTER only)
 * POST /api/users - Create new user (MASTER only)
 * GET /api/users/:id - Get user by ID
 * PATCH /api/users/:id - Update user
 * DELETE /api/users/:id - Delete user (MASTER only)
 * GET /api/users/:id/companies - Get user's companies
 * POST /api/users/:id/companies - Assign company to user
 * DELETE /api/users/:id/companies/:companyId - Remove company from user
 * PATCH /api/users/:id/password - Change password
 */

const express = require('express')
const router = express.Router()
const auth = require('../lib/auth')

// Middleware to check if user is MASTER
async function requireMaster(req, res, next) {
  const sessionToken = req.headers['x-session-token']
  if (!sessionToken) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const session = await auth.validateSession(sessionToken)
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' })
  }

  if (session.user.role !== 'MASTER') {
    return res.status(403).json({ error: 'MASTER role required' })
  }

  req.user = session.user
  next()
}

// Middleware to check if user is authenticated
async function requireAuth(req, res, next) {
  const sessionToken = req.headers['x-session-token']
  if (!sessionToken) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const session = await auth.validateSession(sessionToken)
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' })
  }

  req.user = session.user
  next()
}

// GET /api/users - List all users (MASTER only)
router.get('/', requireMaster, async (req, res, next) => {
  try {
    const users = await auth.listUsers()
    res.json({ users })
  } catch (error) {
    next(error)
  }
})

// POST /api/users - Create new user (MASTER only)
router.post('/', requireMaster, async (req, res, next) => {
  try {
    const { email, name, password, role } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Check if user already exists
    const existing = await auth.findUserByEmail(email)
    if (existing) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const user = await auth.createUser({ email, name, password, role })

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    })
  } catch (error) {
    next(error)
  }
})

// GET /api/users/:id - Get user by ID
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { prisma } = require('../lib/prisma')
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        companies: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Only MASTER can see other users
    if (req.user.id !== req.params.id && req.user.role !== 'MASTER') {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json({ user })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/users/:id - Update user
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    const { name, avatarUrl, password } = req.body

    // Users can only update themselves, MASTER can update anyone
    if (req.user.id !== id && req.user.role !== 'MASTER') {
      return res.status(403).json({ error: 'Access denied' })
    }

    const user = await auth.updateUser(id, { name, avatarUrl, password })

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      }
    })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/users/:id - Delete user (MASTER only)
router.delete('/:id', requireMaster, async (req, res, next) => {
  try {
    const { prisma } = require('../lib/prisma')

    // Cannot delete yourself
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' })
    }

    await prisma.user.delete({
      where: { id: req.params.id }
    })

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// PATCH /api/users/:id/password - Change password
router.patch('/:id/password', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    const { password } = req.body

    // Users can only change their own password
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' })
    }

    await auth.updateUser(id, { password })

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// GET /api/users/:id/companies - Get user's companies
router.get('/:id/companies', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params

    // Users can only see their own companies, MASTER can see anyone
    if (req.user.id !== id && req.user.role !== 'MASTER') {
      return res.status(403).json({ error: 'Access denied' })
    }

    const user = await auth.getUserWithCompanies(id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // MASTER can see all companies
    if (user.role === 'MASTER') {
      return res.json({
        role: user.role,
        companies: null // null means all companies
      })
    }

    res.json({
      role: user.role,
      companies: user.companies
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/users/:id/companies - Assign company to user
router.post('/:id/companies', requireMaster, async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, role } = req.body

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' })
    }

    const userCompany = await auth.assignCompanyToUser(id, companyId, role || 'VIEWER', req.user.id)

    res.json({ userCompany })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/users/:id/companies/:companyId - Remove company from user
router.delete('/:id/companies/:companyId', requireMaster, async (req, res, next) => {
  try {
    const { id, companyId } = req.params

    await auth.removeCompanyFromUser(id, companyId)

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

module.exports = router
