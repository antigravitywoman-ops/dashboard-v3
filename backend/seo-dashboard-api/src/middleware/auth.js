/**
 * Authentication Middleware
 *
 * Supports two authentication methods:
 * 1. X-API-Key header (for service-to-service communication)
 * 2. X-Session-Token header (for user sessions from database)
 */

const API_KEY = process.env.NEXT_PUBLIC_VM_API_KEY
const auth = require('../lib/auth')

// Allow auth routes to bypass middleware
const authPaths = ['/health', '/api/auth/signin', '/api/auth/signout', '/api/auth/me']

const authMiddleware = async (req, res, next) => {
  // Skip auth for health check and auth routes (except signout)
  if (authPaths.includes(req.path)) {
    return next()
  }

  // Try API key first
  const apiKey = req.headers['x-api-key']
  const sessionToken = req.headers['x-session-token']

  // API key authentication (service-to-service)
  if (apiKey) {
    if (!API_KEY) {
      return res.status(500).json({ error: 'Server misconfigured: VM_API_KEY not set' })
    }

    if (apiKey !== API_KEY) {
      return res.status(403).json({ error: 'Invalid API key' })
    }

    // Add a mock user for API key auth
    req.user = {
      id: 'api-key',
      role: 'MASTER',
      email: 'api@service.local'
    }
    req.isApiKey = true
    return next()
  }

  // Session token authentication (user sessions)
  if (sessionToken) {
    try {
      const session = await auth.validateSession(sessionToken)
      if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' })
      }

      req.user = session.user
      req.session = session
      return next()
    } catch (error) {
      return res.status(500).json({ error: 'Session validation failed' })
    }
  }

  // No authentication provided
  return res.status(401).json({
    error: 'Authentication required',
    hint: 'Provide either X-API-Key or X-Session-Token header'
  })
}

module.exports = authMiddleware
