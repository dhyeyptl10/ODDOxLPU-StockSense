// middleware/auth.js — JWT authentication middleware
const { secret } = require('../config')
const jwt = require('jsonwebtoken')
const db  = require('../db/database')

// ── Verify JWT and attach user to request ────────────────────────────────────
const auth = (req, res, next) => {
  const header = req.headers['authorization']
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided — please log in' })
  }

  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, secret)
    const user = db.prepare('SELECT id, name, email, role, avatar, login_id, phone, token_version FROM users WHERE id = ? AND is_active = 1').get(decoded.id)
    if (decoded.purpose !== 'session' || decoded.version !== user?.token_version) return res.status(401).json({ success:false, message:'Session expired; please sign in again' })
    if (!user) return res.status(401).json({ success: false, message: 'User not found or deactivated' })
    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired — please log in again' })
    }
    return res.status(401).json({ success: false, message: 'Invalid token' })
  }
}

// ── Role-based access control ────────────────────────────────────────────────
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' })
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Access denied — requires role: ${roles.join(' or ')}` })
  }
  next()
}

// ── Admin only ────────────────────────────────────────────────────────────────
const adminOnly = requireRole('admin')

// ── Admin or Manager ─────────────────────────────────────────────────────────
const managerOrAdmin = requireRole('admin', 'manager')

module.exports = { auth, requireRole, adminOnly, managerOrAdmin }
