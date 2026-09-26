// routes/movements.js — Stock movement ledger (read-only audit trail)
const router = require('express').Router()
const db     = require('../db/database')
const { auth } = require('../middleware/auth')

// ─── GET /api/movements ───────────────────────────────────────────────────────
// Full ledger with pagination, filtering
router.get('/', auth, (req, res) => {
  const { type, productId, warehouseId, from, to, page = 1, limit = 50 } = req.query

  if (!Number.isInteger(Number(page)) || Number(page)<1 || !Number.isInteger(Number(limit)) || Number(limit)<1 || Number(limit)>200) return res.status(400).json({success:false,message:'Page must be positive and limit between 1 and 200'})
  let sql    = `
    SELECT
      m.*,
      p.name  AS product_name,
      p.sku   AS product_sku,
      p.unit  AS product_unit,
      w1.name AS from_name,
      w2.name AS to_name,
      COALESCE(r.supplier,d.customer,'Internal') AS contact, 'done' AS status
    FROM stock_movements m
    LEFT JOIN products   p  ON m.product_id    = p.id
    LEFT JOIN warehouses w1 ON m.from_warehouse = w1.id
    LEFT JOIN warehouses w2 ON m.to_warehouse   = w2.id
    LEFT JOIN receipts r ON r.ref=m.ref AND m.type='receipt'
    LEFT JOIN deliveries d ON d.ref=m.ref AND m.type='delivery'
    WHERE 1=1
  `
  const params = []

  if (type)        { sql += ' AND m.type = ?';            params.push(type) }
  if (productId)   { sql += ' AND m.product_id = ?';      params.push(productId) }
  if (warehouseId) { sql += ' AND (m.from_warehouse = ? OR m.to_warehouse = ?)'; params.push(warehouseId, warehouseId) }
  if (from)        { sql += ' AND m.date >= ?';           params.push(from) }
  if (to)          { sql += ' AND m.date <= ?';           params.push(to) }

  if (req.query.search) { sql += ' AND (m.ref LIKE ? OR p.name LIKE ? OR p.sku LIKE ? OR r.supplier LIKE ? OR d.customer LIKE ?)'; params.push(...Array(5).fill(`%${req.query.search}%`)) }
  // Count total for pagination
  const countSql   = sql.replace(/SELECT[\s\S]+?FROM/, 'SELECT COUNT(*) as total FROM')
  const { total }  = db.prepare(countSql).get(...params)

  const offset     = (parseInt(page) - 1) * parseInt(limit)
  sql             += ' ORDER BY m.created_at DESC, m.rowid DESC LIMIT ? OFFSET ?'
  params.push(parseInt(limit), offset)

  const movements  = db.prepare(sql).all(...params)

  res.json({
    success: true,
    data:    movements,
    count:   movements.length,
    total,
    page:    parseInt(page),
    pages:   Math.ceil(total / parseInt(limit)),
  })
})

// ─── GET /api/movements/summary ───────────────────────────────────────────────
// Aggregate summary (for dashboard charts)
router.get('/summary', auth, (req, res) => {
  const { days = 30 } = req.query
  if (!Number.isInteger(Number(days)) || Number(days)<1 || Number(days)>3660) return res.status(400).json({success:false,message:'Days must be between 1 and 3660'})

  const byType = db.prepare(`
    SELECT type, COUNT(*) as count, SUM(ABS(qty)) as total_qty
    FROM stock_movements
    WHERE date >= date('now', '-${parseInt(days)} days')
    GROUP BY type
  `).all()

  const byDay = db.prepare(`
    SELECT date, type, SUM(ABS(qty)) as qty
    FROM stock_movements
    WHERE date >= date('now', '-${parseInt(days)} days')
    GROUP BY date, type
    ORDER BY date ASC
  `).all()

  const topProducts = db.prepare(`
    SELECT m.product_id, p.name, p.sku, SUM(ABS(m.qty)) as movement_count
    FROM stock_movements m
    LEFT JOIN products p ON m.product_id = p.id
    WHERE m.date >= date('now', '-${parseInt(days)} days')
    GROUP BY m.product_id
    ORDER BY movement_count DESC
    LIMIT 5
  `).all()

  res.json({ success: true, data: { byType, byDay, topProducts } })
})

module.exports = router
