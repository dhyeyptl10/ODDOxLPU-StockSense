// routes/warehouses.js — Warehouse CRUD + per-warehouse stock overview
const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { v4: uuidv4 } = require('uuid')
const db     = require('../db/database')
const { auth, managerOrAdmin } = require('../middleware/auth')

// ─── GET /api/warehouses ──────────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  const warehouses = db.prepare('SELECT * FROM warehouses WHERE is_active = 1 ORDER BY created_at').all()

  // Enrich each warehouse with stock summary
  const enriched = warehouses.map(wh => {
    const stockSummary = db.prepare(`
      SELECT COUNT(DISTINCT ps.product_id) as product_count,
             COALESCE(SUM(ps.quantity), 0) as total_units
      FROM product_stock ps
      JOIN products p ON ps.product_id = p.id
      WHERE ps.warehouse_id = ? AND p.is_active = 1 AND ps.quantity > 0
    `).get(wh.id)

    return { ...wh, ...stockSummary }
  })

  res.json({ success: true, data: enriched })
})

// ─── GET /api/warehouses/:id ──────────────────────────────────────────────────
router.get('/:id', auth, (req, res) => {
  const wh = db.prepare('SELECT * FROM warehouses WHERE id = ? AND is_active = 1').get(req.params.id)
  if (!wh) return res.status(404).json({ success: false, message: 'Warehouse not found' })

  // Full stock breakdown for this warehouse
  const stock = db.prepare(`
    SELECT p.id, p.name, p.sku, p.category, p.unit, p.reorder_level,
           COALESCE(ps.quantity, 0) as quantity
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id AND ps.warehouse_id = ?
    WHERE p.is_active = 1
    ORDER BY p.category, p.name
  `).all(req.params.id)

  res.json({ success: true, data: { ...wh, stock } })
})

// ─── POST /api/warehouses ─────────────────────────────────────────────────────
router.post('/', auth, managerOrAdmin, [
  body('name').trim().notEmpty().withMessage('Warehouse name required'),
  body('location').trim().notEmpty().withMessage('Location required'),
], (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg })
  }

  const { name, location, description } = req.body
  const shortCode = req.body.shortCode?.trim().toUpperCase()
  const parentId = req.body.parentId || null
  if (shortCode && !/^[A-Z0-9]{2,8}$/.test(shortCode)) return res.status(400).json({success:false,message:'Short code needs 2–8 letters/numbers'})
  if (parentId && !db.prepare('SELECT id FROM warehouses WHERE id = ? AND is_active = 1 AND parent_id IS NULL').get(parentId)) return res.status(400).json({success:false,message:'Select an active parent warehouse'})
  const id = uuidv4()

  db.prepare('INSERT INTO warehouses (id, name, location, description, short_code, parent_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, location, description || null, shortCode || `W${id.replace(/-/g,'').slice(0,7).toUpperCase()}`, parentId)

  // Initialize stock=0 for all existing products in this new warehouse
  const products = db.prepare('SELECT id FROM products WHERE is_active = 1').all()
  const insStock = db.prepare('INSERT OR IGNORE INTO product_stock (product_id, warehouse_id, quantity) VALUES (?, ?, 0)')
  products.forEach(p => insStock.run(p.id, id))

  const wh = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id)
  res.status(201).json({ success: true, message: 'Warehouse created', data: wh })
})

// ─── PUT /api/warehouses/:id ──────────────────────────────────────────────────
router.put('/:id', auth, managerOrAdmin, (req, res) => {
  const wh = db.prepare('SELECT * FROM warehouses WHERE id = ? AND is_active = 1').get(req.params.id)
  if (!wh) return res.status(404).json({ success: false, message: 'Warehouse not found' })

  const { name, location, description } = req.body
  const shortCode = req.body.shortCode?.trim().toUpperCase()
  const parentId = req.body.parentId || null
  if (shortCode && !/^[A-Z0-9]{2,8}$/.test(shortCode)) return res.status(400).json({success:false,message:'Short code needs 2–8 letters/numbers'})
  if (parentId && !db.prepare('SELECT id FROM warehouses WHERE id = ? AND is_active = 1 AND parent_id IS NULL').get(parentId)) return res.status(400).json({success:false,message:'Select an active parent warehouse'})
  if (req.body.parentId !== undefined && parentId !== wh.parent_id) return res.status(400).json({success:false,message:'The parent warehouse cannot be changed after creation'})
  if (shortCode && shortCode !== wh.short_code) return res.status(400).json({success:false,message:'Short code is permanent to preserve operation references'})
  if ((name !== undefined && (typeof name !== 'string' || !name.trim())) || (location !== undefined && (typeof location !== 'string' || !location.trim()))) return res.status(400).json({success:false,message:'Name and address are required'})
  db.prepare(`
    UPDATE warehouses SET
      name        = COALESCE(?, name),
      location    = COALESCE(?, location),
      description = COALESCE(?, description)
    WHERE id = ?
  `).run(name || null, location || null, description ?? null, wh.id)

  const updated = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(wh.id)
  res.json({ success: true, message: 'Warehouse updated', data: updated })
})

// ─── DELETE /api/warehouses/:id ───────────────────────────────────────────────
router.delete('/:id', auth, managerOrAdmin, (req, res) => {
  const wh = db.prepare('SELECT * FROM warehouses WHERE id = ? AND is_active = 1').get(req.params.id)
  if (!wh) return res.status(404).json({ success: false, message: 'Warehouse not found' })

  if (db.prepare('SELECT id FROM warehouses WHERE parent_id = ? AND is_active = 1').get(wh.id)) return res.status(409).json({success:false,message:'Archive child locations first'})
  for (const table of ['receipts','deliveries','transfers']) {
    const where = table === 'transfers' ? '(from_warehouse = ? OR to_warehouse = ?)' : 'warehouse_id = ?'
    if (db.prepare(`SELECT id FROM ${table} WHERE ${where} AND status NOT IN ('done','canceled') LIMIT 1`).get(...(table === 'transfers' ? [wh.id,wh.id] : [wh.id]))) return res.status(409).json({success:false,message:'Warehouse has open operations'})
  }
  // Check if warehouse has stock
  const hasStock = db.prepare('SELECT SUM(quantity) as total FROM product_stock WHERE warehouse_id = ?').get(req.params.id)
  if (hasStock && hasStock.total > 0) {
    return res.status(400).json({ success: false, message: 'Cannot delete warehouse with existing stock. Transfer stock first.' })
  }

  db.prepare('UPDATE warehouses SET is_active = 0 WHERE id = ?').run(req.params.id)
  res.json({ success: true, message: `Warehouse "${wh.name}" deleted` })
})

module.exports = router
