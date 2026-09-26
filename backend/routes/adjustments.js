// routes/adjustments.js — Stock adjustments (physical count corrections)
// Real-world: physical count = 97, system = 100 → adjustment = -3
const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { v4: uuidv4 } = require('uuid')
const db     = require('../db/database')
const { auth, managerOrAdmin } = require('../middleware/auth')
const { nextRef, warehouseStock, setStock, logMovement, toDay } = require('../utils/helpers')

// ── Helper: build adjustment with names ───────────────────────────────────────
const buildAdjustment = (adj) => {
  const product   = db.prepare('SELECT name, sku, unit FROM products WHERE id = ?').get(adj.product_id)
  const warehouse = db.prepare('SELECT name FROM warehouses WHERE id = ?').get(adj.warehouse_id)
  return {
    ...adj,
    product_name:   product?.name,
    product_sku:    product?.sku,
    product_unit:   product?.unit,
    warehouse_name: warehouse?.name,
    difference:     adj.new_qty - adj.old_qty,
  }
}

// ─── GET /api/adjustments ─────────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  const { productId, warehouseId } = req.query
  let sql = 'SELECT * FROM adjustments WHERE 1=1'
  const params = []

  if (productId)   { sql += ' AND product_id = ?';   params.push(productId) }
  if (warehouseId) { sql += ' AND warehouse_id = ?';  params.push(warehouseId) }

  const adjustments = db.prepare(sql + ' ORDER BY created_at DESC').all(...params)
  res.json({ success: true, data: adjustments.map(buildAdjustment), count: adjustments.length })
})

// ─── GET /api/adjustments/:id ─────────────────────────────────────────────────
router.get('/:id', auth, (req, res) => {
  const adj = db.prepare('SELECT * FROM adjustments WHERE id = ?').get(req.params.id)
  if (!adj) return res.status(404).json({ success: false, message: 'Adjustment not found' })
  res.json({ success: true, data: buildAdjustment(adj) })
})

// ─── POST /api/adjustments ────────────────────────────────────────────────────
// Creates and immediately applies a stock adjustment
router.post('/', auth, managerOrAdmin, [
  body('productId').notEmpty().withMessage('Product required'),
  body('warehouseId').notEmpty().withMessage('Warehouse required'),
  body('newQty').isInt({ min: 0, max: 1000000000 }).withMessage('New quantity must be 0 or more'),
  body('reason').trim().notEmpty().withMessage('Reason for adjustment required'),
], (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg })
  }

  const { productId, warehouseId, newQty, reason, date } = req.body

  const product   = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(productId)
  if (!product) return res.status(400).json({ success: false, message: 'Product not found' })

  const warehouse = db.prepare('SELECT * FROM warehouses WHERE id = ? AND is_active = 1').get(warehouseId)
  if (!warehouse) return res.status(400).json({ success: false, message: 'Warehouse not found' })

  // Get current (old) quantity
  const oldQty = warehouseStock(db, productId, warehouseId)
  const diff   = Number(newQty) - oldQty

  if (diff === 0) {
    return res.status(400).json({ success: false, message: `No change: current stock is already ${oldQty}` })
  }

  const ref = nextRef(db, 'adjustments', 'ref', 'ADJ', warehouseId)
  const id  = uuidv4()

  // Run in transaction
  db.transaction(() => {
    // Set stock to new absolute value
    setStock(db, productId, warehouseId, Number(newQty))

    // Create adjustment record
    db.prepare(`
      INSERT INTO adjustments (id, ref, product_id, warehouse_id, old_qty, new_qty, reason, status, date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'done', ?, ?)
    `).run(id, ref, productId, warehouseId, oldQty, Number(newQty), reason, date || toDay(), req.user.id)

    // Log to stock ledger
    logMovement(db, {
      type:          'adjustment',
      productId,
      qty:           diff,
      fromWarehouse: warehouseId,
      toWarehouse:   warehouseId,
      ref,
      createdBy:     req.user.id,
    })
  })()

  require('../utils/inventory').refreshAvailability()
  const adj = db.prepare('SELECT * FROM adjustments WHERE id = ?').get(id)
  res.status(201).json({
    success: true,
    message: `Adjustment ${ref} applied: ${product.name} in ${warehouse.name} ${diff > 0 ? '+' : ''}${diff} (${oldQty} → ${newQty})`,
    data: buildAdjustment(adj),
  })
})

// ─── GET /api/adjustments/product/:productId/history ──────────────────────────
// All adjustments for a specific product
router.get('/product/:productId/history', auth, (req, res) => {
  const adjustments = db.prepare(`
    SELECT a.*, w.name as warehouse_name
    FROM adjustments a
    LEFT JOIN warehouses w ON a.warehouse_id = w.id
    WHERE a.product_id = ?
    ORDER BY a.created_at DESC
  `).all(req.params.productId)

  res.json({ success: true, data: adjustments })
})

module.exports = router
