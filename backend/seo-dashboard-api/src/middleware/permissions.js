/**
 * Permission Middleware
 *
 * RBAC (Role-Based Access Control) middleware for company-specific routes.
 * Uses the auth helpers from lib/auth.js
 */

const auth = require('../lib/auth')

/**
 * Middleware to check company access
 *
 * Verifies that the current user has access to the company specified in :slug param.
 * Adds req.companyAccess = { role, userRole } on success, or returns 403.
 *
 * Usage: Add after authMiddleware, before route handler
 *   router.get('/:slug/tasks', checkCompanyAccess, handler)
 */
async function checkCompanyAccess(req, res, next) {
  const { slug } = req.params

  // No company in route - skip check
  if (!slug) {
    return next()
  }

  // API key auth has MASTER-level access (full access)
  if (req.isApiKey) {
    req.companyAccess = { role: 'MASTER', userRole: 'MASTER' }
    return next()
  }

  // No user session - can't check permissions
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  // Check if user has access to this company
  const access = await auth.checkCompanyAccess(req.user.id, slug)

  if (!access) {
    return res.status(403).json({
      error: 'Access denied to this company',
      company: slug
    })
  }

  // Attach company access info to request
  req.companyAccess = access
  next()
}

/**
 * Middleware factory to require specific roles
 *
 * @param {string[]} roles - Array of roles that are allowed
 * Usage: requireRole(['ADMIN', 'EDITOR'])
 *
 * Must be used AFTER checkCompanyAccess
 */
function requireRole(roles) {
  return (req, res, next) => {
    // No company access check done yet
    if (!req.companyAccess) {
      return res.status(403).json({ error: 'Company context required' })
    }

    // Role hierarchy: VIEWER < EDITOR < ADMIN < MASTER
    const roleHierarchy = {
      VIEWER: 0,
      EDITOR: 1,
      ADMIN: 2,
      MASTER: 3
    }

    const userRoleLevel = roleHierarchy[req.companyAccess.role] || 0
    const requiredLevels = roles.map(r => roleHierarchy[r] ?? 0)
    const requiredLevel = Math.min(...requiredLevels)

    if (userRoleLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.companyAccess.role
      })
    }

    next()
  }
}

/**
 * Middleware to require MASTER role only
 *
 * Usage: requireMaster
 */
function requireMaster(req, res, next) {
  if (req.isApiKey) {
    return next()
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  if (req.user.role !== 'MASTER') {
    return res.status(403).json({ error: 'MASTER role required' })
  }

  next()
}

module.exports = {
  checkCompanyAccess,
  requireRole,
  requireMaster
}
