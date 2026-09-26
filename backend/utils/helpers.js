// utils/helpers.js — Shared utility functions
const { v4: uuidv4 } = require('uuid')

// Generate a short unique ID with optional prefix
const makeId = (prefix = '') => prefix + uuidv4().replace(/-/g, '').slice(0, 12)

// Today's date as YYYY-MM-DD
const toDay = () => new Intl.DateTimeFormat('en-CA', {timeZone:process.env.INVENTORY_TIMEZONE || 'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())

// Generate a 6-digit numeric OTP
const generateOTP = () => require('crypto').randomInt(100000, 1000000).toString()

// Generate next reference number (e.g. RCT-005)
const nextRef = (db, table, column, code, warehouseId) => {
  const op = { RCT:'IN', DLV:'OUT', TRF:'INT', ADJ:'ADJ' }[code]
  if (!op || !['receipts','deliveries','transfers','adjustments'].includes(table) || column !== 'ref') throw new Error('Invalid reference sequence')
  const wh = warehouseId && db.prepare('SELECT short_code FROM warehouses WHERE id = ?').get(warehouseId)
  const prefix = `${wh?.short_code || 'WH'}/${op}`
  const existing = db.prepare(`SELECT ref FROM ${table} WHERE ref LIKE ?`).all(`${prefix}/%`)
  const max = existing.reduce((n, r) => Math.max(n, Number(r.ref.match(/(\d+)$/)?.[1] || 0)), 0)
  const row = db.prepare(`INSERT INTO reference_sequences(prefix, value) VALUES (?, ?)
    ON CONFLICT(prefix) DO UPDATE SET value = MAX(reference_sequences.value, ?) + 1 RETURNING value`).get(prefix, max + 1, max)
  return `${prefix}/${String(row.value).padStart(4, '0')}`
}

// Compute total stock across all warehouses for a product
const totalStock = (db, productId) => {
  const row = db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM product_stock WHERE product_id = ?').get(productId)
  return row ? row.total : 0
}

// Get stock for a product in a specific warehouse
const warehouseStock = (db, productId, warehouseId) => {
  const row = db.prepare('SELECT quantity FROM product_stock WHERE product_id = ? AND warehouse_id = ?').get(productId, warehouseId)
  return row ? row.quantity : 0
}

// Upsert stock: add delta to product_stock row
const adjustStock = (db, productId, warehouseId, delta) => {
  const current = warehouseStock(db, productId, warehouseId)
  const newQty = current + Number(delta)
  if (!Number.isSafeInteger(newQty) || newQty < 0) throw Object.assign(new Error('Insufficient stock or invalid quantity'), { status: 409 })
  db.prepare(`
    INSERT INTO product_stock (product_id, warehouse_id, quantity, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(product_id, warehouse_id)
    DO UPDATE SET quantity = ?, updated_at = datetime('now')
  `).run(productId, warehouseId, newQty, newQty)
  return newQty
}

// Set stock to absolute value
const setStock = (db, productId, warehouseId, quantity) => {
  db.prepare(`
    INSERT INTO product_stock (product_id, warehouse_id, quantity, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(product_id, warehouse_id)
    DO UPDATE SET quantity = ?, updated_at = datetime('now')
  `).run(productId, warehouseId, quantity, quantity)
}

// Log a movement to the stock ledger
const logMovement = (db, { type, productId, qty, fromWarehouse, toWarehouse, ref, createdBy }) => {
  db.prepare(`
    INSERT INTO stock_movements (id, date, type, product_id, qty, from_warehouse, to_warehouse, ref, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(makeId('mv'), toDay(), type, productId, qty, fromWarehouse || null, toWarehouse || null, ref, createdBy || null)
}

module.exports = { makeId, toDay, generateOTP, nextRef, totalStock, warehouseStock, adjustStock, setStock, logMovement }
