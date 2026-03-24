/**
 * Authentication Routes
 *
 * POST /api/auth/signin - Login with email/password
 * POST /api/auth/signout - Logout (invalidate session)
 * GET /api/auth/me - Get current user info
 */

const express = require('express')
const router = express.Router()
const auth = require('../lib/auth')

// POST /api/auth/signin
// Login with email and password
router.post('/signin', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Find user by email
    const user = await auth.findUserByEmail(email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Validate password
    const isValid = await auth.validatePassword(password, user.passwordHash)
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Create session
    const session = await auth.createSession(user.id)

    // Get user's companies
    const companyIds = await auth.getUserCompanyIds(user.id)

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      session: {
        token: session.sessionToken,
        expires: session.expires.toISOString(),
      },
      companies: companyIds, // null means all companies (MASTER)
    })
  } catch (error) {
    next(error)
  }
})

// POST /api/auth/signout
// Logout (invalidate current session)
router.post('/signout', async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token'] || req.body.sessionToken

    if (sessionToken) {
      await auth.deleteSession(sessionToken)
    }

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
})

// GET /api/auth/me
// Get current user info from session
router.get('/me', async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token']

    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token provided' })
    }

    const session = await auth.validateSession(sessionToken)
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    // Get user's accessible companies
    const companyIds = await auth.getUserCompanyIds(session.user.id)

    res.json({
      user: session.user,
      companies: companyIds, // null means all companies (MASTER)
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router
