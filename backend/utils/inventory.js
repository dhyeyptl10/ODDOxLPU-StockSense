const db = require('../db/database')
const { warehouseStock, toDay } = require('./helpers')
const specs = {
  receipts: { item:'receipt_items', fk:'receipt_id', party:'supplier', source:null, target:'warehouse_id', code:'RCT', type:'receipt' },
  deliveries: { item:'delivery_items', fk:'delivery_id', party:'customer', source:'warehouse_id', target:null, code:'DLV', type:'delivery' },
  transfers: { item:'transfer_items', fk:'transfer_id', source:'from_warehouse', target:'to_warehouse', code:'TRF', type:'transfer' },
}
function itemsFor(table,id) {
  const c = specs[table]
  return db.prepare(`SELECT i.*, p.name AS product_name, p.sku, p.unit FROM ${c.item} i JOIN products p ON p.id = i.product_id WHERE ${c.fk} = ?`).all(id)
}
function refreshAvailability() {
  // Allocate whole orders in schedule/creation order. Drafts do not reserve stock.
  const orders = ['deliveries','transfers'].flatMap(table => db.prepare(`SELECT * FROM ${table} WHERE status IN ('ready','waiting')`).all().map(o => ({...o,table})))
  orders.sort((a,b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at) || a.ref.localeCompare(b.ref))
  const reserved = new Map()
  for (const order of orders) {
    const c = specs[order.table], source = order[c.source], items = itemsFor(order.table,order.id)
    const totals = new Map()
    items.forEach(i => totals.set(i.product_id,(totals.get(i.product_id)||0)+i.qty))
    const available = [...totals].every(([p,qty]) => qty <= warehouseStock(db,p,source) - (reserved.get(`${source}:${p}`)||0))
    const status = items.length && available ? 'ready' : 'waiting'
    db.prepare(`UPDATE ${order.table} SET status = ? WHERE id = ?`).run(status,order.id)
    if (status === 'ready') for (const [p,qty] of totals) reserved.set(`${source}:${p}`,(reserved.get(`${source}:${p}`)||0)+qty)
  }
  return reserved
}
function reservedStock(productId,warehouseId,excludeId) {
  let qty = 0
  for (const table of ['deliveries','transfers']) {
    const c = specs[table]
    qty += db.prepare(`SELECT COALESCE(SUM(i.qty),0) AS qty FROM ${c.item} i JOIN ${table} o ON o.id = i.${c.fk} WHERE o.status = 'ready' AND i.product_id = ? AND o.${c.source} = ? AND o.id != ?`).get(productId,warehouseId,excludeId || '').qty
  }
  return qty
}
function buildOperation(table, order) {
  const c = specs[table], source = c.source && order[c.source]
  const items = itemsFor(table,order.id).map(i => ({...i, available:source ? Math.max(0,warehouseStock(db,i.product_id,source)-reservedStock(i.product_id,source,order.id)) : null}))
  const name = id => db.prepare('SELECT name FROM warehouses WHERE id = ?').get(id)?.name
  const terminal = ['done','canceled'].includes(order.status)
  return {...order, items, responsible_name:db.prepare('SELECT name FROM users WHERE id = ?').get(order.created_by)?.name || 'Unknown', warehouse_name: order.warehouse_id ? name(order.warehouse_id) : undefined,
    from_warehouse_name:source ? name(source):undefined, to_warehouse_name:c.target ? name(order[c.target]):undefined,
    late:!terminal && order.date < toDay(), waiting:!terminal && (order.date > toDay() || order.status === 'waiting'), operation_type:c.type }
}
module.exports = { specs, itemsFor, refreshAvailability, reservedStock, buildOperation }
