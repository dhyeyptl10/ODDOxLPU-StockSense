// routes/users.js — User management (admin only)
const router  = require('express').Router()
const { passwordValid, passwordMessage, wrap } = require('../utils/validation')
const bcrypt  = require('bcryptjs')
const { body, validationResult } = require('express-validator')
const { v4: uuidv4 } = require('uuid')
const db      = require('../db/database')
const { auth, adminOnly } = require('../middleware/auth')

const safeUser = u => ({
  id:         u.id,
  loginId: u.login_id,
  name:       u.name,
  email:      u.email,
  role:       u.role,
  avatar:     u.avatar,
  is_active:  u.is_active,
  created_at: u.created_at,
})

// ─── GET /api/users ───────────────────────────────────────────────────────────
router.get('/', auth, adminOnly, (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all()
  res.json({ success: true, data: users.map(safeUser) })
})

// ─── GET /api/users/stats ─────────────────────────────────────────────────────
router.get('/stats', auth, adminOnly, (req, res) => {
  const total    = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt
  const active   = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE is_active = 1").get().cnt
  const admins   = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'").get().cnt
  const managers = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'manager'").get().cnt
  const staff    = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'warehouse_staff'").get().cnt
  res.json({ success: true, data: { total, active, admins, managers, staff } })
})

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
router.get('/:id', auth, adminOnly, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ success: false, message: 'User not found' })
  res.json({ success: true, data: safeUser(user) })
})

// ─── POST /api/users — Admin creates user with any role ───────────────────────
router.post('/', auth, adminOnly, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password').custom(passwordValid).withMessage(passwordMessage),
  body('role').optional().isIn(['admin','manager','warehouse_staff']).withMessage('Invalid role'),
], wrap(async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg })
  }
  const { name, email, password, role = 'warehouse_staff' } = req.body
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ success: false, message: 'Email already registered' })
  }
  if (req.body.loginId && db.prepare('SELECT id FROM users WHERE login_id = ? COLLATE NOCASE').get(req.body.loginId)) return res.status(409).json({success:false,message:'Login ID already registered'})
  const hash   = await bcrypt.hash(password, 12)
  const id     = uuidv4()
  const loginId = req.body.loginId || `user${id.replace(/-/g,'').slice(0,8)}`
  if (!/^[a-zA-Z0-9_]{6,12}$/.test(loginId)) return res.status(400).json({success:false,message:'Login ID must be 6–12 letters/numbers/underscores'})
  const avatar = name.slice(0, 2).toUpperCase()
  db.prepare('INSERT INTO users (id, name, email, password, role, avatar, login_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, name, email, hash, role, avatar, loginId.toLowerCase())
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  res.status(201).json({ success: true, message: 'User created', data: safeUser(user) })
}))

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
router.put('/:id', auth, adminOnly, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ success: false, message: 'User not found' })

  const { name, role, is_active } = req.body
  if (is_active !== undefined && ![0,1].includes(is_active)) return res.status(400).json({success:false,message:'Invalid active status'})
  if (req.params.id === req.user.id && ((role && role !== 'admin') || is_active === 0)) return res.status(400).json({success:false,message:'You cannot remove your own administrator access'})
  const validRoles = ['admin', 'manager', 'warehouse_staff']
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role. Must be: ' + validRoles.join(', ') })
  }

  db.prepare(`
    UPDATE users SET
      name      = COALESCE(?, name),
      role      = COALESCE(?, role),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(name || null, role || null, is_active !== undefined ? is_active : null, user.id)

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)
  res.json({ success: true, message: 'User updated', data: safeUser(updated) })
})

// ─── DELETE /api/users/:id ────────────────────────────────────────────────────
router.delete('/:id', auth, adminOnly, (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ success: false, message: 'Cannot delete your own account' })
  }
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(req.params.id)
  res.json({ success: true, message: 'User deactivated' })
})

module.exports = router
