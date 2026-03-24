/**
 * Database Authentication Helpers
 *
 * Functions for user authentication using the database.
 */

const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
const { prisma } = require('./db')

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      companies: {
        include: {
          // UserCompany relation
        }
      }
    }
  })
}

/**
 * Validate user password
 * @param {string} password - Plain text password
 * @param {string} passwordHash - Hashed password from database
 * @returns {Promise<boolean>} True if password is valid
 */
async function validatePassword(password, passwordHash) {
  if (!passwordHash) return false
  return bcrypt.compare(password, passwordHash)
}

/**
 * Create a new session for user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Session object
 */
async function createSession(userId) {
  const sessionToken = uuidv4()
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  return prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
        }
      }
    }
  })
}

/**
 * Validate session token
 * @param {string} sessionToken - Session token
 * @returns {Promise<Object|null>} Session with user or null
 */
async function validateSession(sessionToken) {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
        }
      }
    }
  })

  if (!session) return null

  // Check if session expired
  if (session.expires < new Date()) {
    await prisma.session.delete({ where: { sessionToken } })
    return null
  }

  return session
}

/**
 * Delete a session
 * @param {string} sessionToken - Session token
 * @returns {Promise<void>}
 */
async function deleteSession(sessionToken) {
  return prisma.session.delete({
    where: { sessionToken }
  }).catch(() => {
    // Ignore if session doesn't exist
  })
}

/**
 * Delete all sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function deleteAllUserSessions(userId) {
  return prisma.session.deleteMany({
    where: { userId }
  })
}

/**
 * Get user with their companies and roles
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User with companies
 */
async function getUserWithCompanies(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      companies: {
        include: {
          // Include company data
        }
      }
    }
  })
}

/**
 * Get companies accessible to a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of company slugs
 */
async function getUserCompanies(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      companies: true
    }
  })

  if (!user) return []

  // MASTER role can access all companies
  if (user.role === 'MASTER') {
    // Return all companies from file system
    // This will be handled by the API layer
    return null // null means all companies
  }

  return user.companies.map(uc => uc.companyId)
}

/**
 * Check if user has access to a specific company
 * @param {string} userId - User ID
 * @param {string} companyId - Company slug
 * @returns {Promise<Object|null>} UserCompany or null
 */
async function checkCompanyAccess(userId, companyId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      companies: true
    }
  })

  if (!user) return null

  // MASTER role has access to all
  if (user.role === 'MASTER') {
    return { role: 'MASTER' }
  }

  return user.companies.find(uc => uc.companyId === companyId) || null
}

/**
 * Create chat message
 * @param {Object} data - Chat message data
 * @returns {Promise<Object>} Created message
 */
async function createChatMessage(data) {
  return prisma.chatMessage.create({
    data: {
      userId: data.userId,
      companyId: data.companyId,
      role: data.role,
      content: data.content,
      filePath: data.filePath,
      tokens: data.tokens,
    }
  })
}

/**
 * Get chat history for a company
 * @param {string} companyId - Company slug
 * @param {number} limit - Max messages to return
 * @returns {Promise<Array>} Chat messages
 */
async function getChatHistory(companyId, limit = 50) {
  return prisma.chatMessage.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  })
}

/**
 * Clear chat history for a company
 * @param {string} companyId - Company slug
 * @returns {Promise<void>}
 */
async function clearChatHistory(companyId) {
  return prisma.chatMessage.deleteMany({
    where: { companyId }
  })
}

/**
 * Create a new user
 * @param {Object} data - User data
 * @returns {Promise<Object>} Created user
 */
async function createUser(data) {
  const { email, name, password, role } = data

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10)

  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: role || 'VIEWER',
    }
  })
}

/**
 * Update an existing user
 * @param {string} userId - User ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated user
 */
async function updateUser(userId, data) {
  const { name, avatarUrl, password } = data

  const updateData = {}
  if (name !== undefined) updateData.name = name
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
  if (password !== undefined) {
    updateData.passwordHash = await bcrypt.hash(password, 10)
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData
  })
}

/**
 * List all users
 * @returns {Promise<Array>} Array of users
 */
async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
      companies: {
        select: {
          companyId: true,
          role: true,
          assignedAt: true,
          assignedBy: true
        }
      }
    }
  })
}

/**
 * Assign a company to a user
 * @param {string} userId - User ID
 * @param {string} companyId - Company slug
 * @param {string} role - Company role
 * @param {string} assignedBy - User ID of who assigned
 * @returns {Promise<Object>} UserCompany relation
 */
async function assignCompanyToUser(userId, companyId, role = 'VIEWER', assignedBy) {
  return prisma.userCompany.upsert({
    where: {
      userId_companyId: {
        userId,
        companyId
      }
    },
    update: {
      role,
      assignedBy
    },
    create: {
      userId,
      companyId,
      role,
      assignedBy
    }
  })
}

/**
 * Remove a company from a user
 * @param {string} userId - User ID
 * @param {string} companyId - Company slug
 * @returns {Promise<Object>} Delete result
 */
async function removeCompanyFromUser(userId, companyId) {
  return prisma.userCompany.delete({
    where: {
      userId_companyId: {
        userId,
        companyId
      }
    }
  }).catch(() => ({ success: true }))
}

module.exports = {
  findUserByEmail,
  validatePassword,
  createSession,
  validateSession,
  deleteSession,
  deleteAllUserSessions,
  getUserWithCompanies,
  getUserCompanies,
  getUserCompanyIds: getUserCompanies, // Alias for compatibility
  checkCompanyAccess,
  createChatMessage,
  getChatHistory,
  clearChatHistory,
  createUser,
  updateUser,
  listUsers,
  assignCompanyToUser,
  removeCompanyFromUser,
}
