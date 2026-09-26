const routerFactory = table => {
  const router = require('express').Router()
  const { randomUUID } = require('crypto')
  const db = require('../db/database')
  const { auth, managerOrAdmin } = require('../middleware/auth')
  const { fail, wrap, validDate } = require('../utils/validation')
  const { nextRef, adjustStock, logMovement, toDay } = require('../utils/helpers')
  const { specs, itemsFor, refreshAvailability, buildOperation } = require('../utils/inventory')
  const c = specs[table]
  const find = id => { const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id); if (!row) fail('Operation not found',404); return row }
  const mutable = row => { if (['done','canceled'].includes(row.status)) fail('Completed or canceled operations cannot be modified',409) }
  const reply = (res,id,status=200) => res.status(status).json({success:true,data:buildOperation(table,find(id))})
  router.use(auth)
  router.get('/',wrap((req,res) => {
    refreshAvailability()
    let rows = db.prepare(`SELECT * FROM ${table} ORDER BY created_at DESC, rowid DESC`).all()
    const q = String(req.query.search || req.query[c.party] || '').toLowerCase()
    rows = rows.filter(o => (!req.query.status || o.status === req.query.status) && (!q || `${o.ref} ${o[c.party]||''} ${o.notes||''}`.toLowerCase().includes(q)) && (!req.query.warehouseId || o[c.source] === req.query.warehouseId || o[c.target] === req.query.warehouseId))
    res.json({success:true,data:rows.map(o => buildOperation(table,o)),count:rows.length})
  }))
  router.get('/:id',wrap((req,res) => {refreshAvailability();reply(res,req.params.id)}))
  function payload(body,old) {
    if (body.status !== undefined && body.status !== 'draft') fail('Use the Ready, Validate or Cancel action to change status')
    const row = {...old}
    if (c.party) {
      const party = body[c.party] ?? old?.[c.party]
      if (typeof party !== 'string' || !party.trim() || party.length > 200) fail('Supplier/customer required (maximum 200 characters)')
      row[c.party] = party.trim()
    }
    for (const [field,api] of table === 'transfers' ? [['from_warehouse','fromWarehouse'],['to_warehouse','toWarehouse']] : [['warehouse_id','warehouseId']]) {
      row[field] = body[api] ?? old?.[field]
      if (!row[field] || !db.prepare('SELECT id FROM warehouses WHERE id = ? AND is_active = 1').get(row[field])) fail('Select an active warehouse/location')
    }
    if (table === 'transfers' && row.from_warehouse === row.to_warehouse) fail('Source and destination must be different')
    row.date = body.date ?? old?.date ?? toDay()
    if (!validDate(row.date)) fail('Use a valid scheduled date (YYYY-MM-DD)')
    row.notes = body.notes ?? old?.notes ?? ''
    if (typeof row.notes !== 'string' || row.notes.length > 2000) fail('Notes must be text up to 2000 characters')
    if (table === 'deliveries') {
      row.delivery_address = body.deliveryAddress ?? old?.delivery_address ?? ''
      if (typeof row.delivery_address !== 'string' || row.delivery_address.length > 1000) fail('Invalid delivery address')
    }
    const raw = body.items ?? (old && itemsFor(table,old.id).map(i => ({productId:i.product_id,qty:i.qty})))
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > 100) fail('Add 1–100 product rows')
    const totals = new Map()
    for (const item of raw) {
      if (!item || !Number.isSafeInteger(Number(item.qty)) || Number(item.qty) <= 0 || Number(item.qty) > 1000000000) fail('Quantities must be positive whole numbers up to 1 billion')
      if (typeof item.productId !== 'string' || !db.prepare('SELECT id FROM products WHERE id = ? AND is_active = 1').get(item.productId)) fail('Select an active product')
      const qty = (totals.get(item.productId)||0) + Number(item.qty)
      if (qty > 1000000000) fail('Combined product quantity exceeds limit')
      totals.set(item.productId,qty)
    }
    return {row,items:[...totals].map(([productId,qty]) => ({productId,qty}))}
  }
  function save(body,old,userId) {
    const {row,items} = payload(body,old)
    const id = old?.id || randomUUID()
    db.transaction(() => {
      const fields = [...(c.party?[c.party]:[]),...(table === 'transfers'?['from_warehouse','to_warehouse']:['warehouse_id']),'date','notes',...(table === 'deliveries'?['delivery_address']:[])]
      if (old) {
        db.prepare(`UPDATE ${table} SET ${fields.map(f=>`${f} = ?`).join(',')}, status = 'draft' ${table === 'deliveries'?", fulfillment_stage = 'pending'":''} WHERE id = ?`).run(...fields.map(f=>row[f]),id)
        db.prepare(`DELETE FROM ${c.item} WHERE ${c.fk} = ?`).run(id)
      } else {
        const ref = nextRef(db,table,'ref',c.code,row.warehouse_id || row.from_warehouse)
        db.prepare(`INSERT INTO ${table}(id,ref,created_by,status,${fields.join(',')}) VALUES(?,?,?,'draft',${fields.map(()=>'?').join(',')})`).run(id,ref,userId,...fields.map(f=>row[f]))
      }
      const ins = db.prepare(`INSERT INTO ${c.item}(id,${c.fk},product_id,qty) VALUES(?,?,?,?)`)
      items.forEach(i => ins.run(randomUUID(),id,i.productId,i.qty))
      refreshAvailability()
    })()
    return id
  }
  router.post('/',wrap((req,res) => reply(res,save(req.body,null,req.user.id),201)))
  router.put('/:id',wrap((req,res) => {const old = find(req.params.id);mutable(old);reply(res,save(req.body,old,req.user.id))}))
  router.post('/:id/ready',wrap((req,res) => {
    db.transaction(() => {const row=find(req.params.id);mutable(row);payload({},row);db.prepare(`UPDATE ${table} SET status = 'ready' WHERE id = ?`).run(row.id);refreshAvailability()})()
    reply(res,req.params.id)
  }))
  if (table === 'deliveries') router.post('/:id/fulfillment',wrap((req,res) => {
    const row=find(req.params.id);mutable(row)
    const next = {pending:'picked',picked:'packed'}[row.fulfillment_stage]
    refreshAvailability()
    if (find(row.id).status !== 'ready' || req.body.stage !== next) fail('Ready stock must be picked, then packed, before dispatch',409)
    db.prepare('UPDATE deliveries SET fulfillment_stage = ? WHERE id = ?').run(next,row.id)
    reply(res,row.id)
  }))
  router.post('/:id/validate',managerOrAdmin,wrap((req,res) => {
    refreshAvailability()
    db.transaction(() => {
      const row=find(req.params.id);mutable(row)
      if (row.status !== 'ready') fail(row.status === 'waiting' ? 'Insufficient stock: operation is waiting' : 'Mark the operation Ready before validation',409)
      if (table === 'deliveries' && row.fulfillment_stage !== 'packed') fail('Pick and pack the order before dispatch',409)
      payload({},row)
      for (const item of itemsFor(table,row.id)) {
        if (c.source) adjustStock(db,item.product_id,row[c.source],-item.qty)
        if (c.target) adjustStock(db,item.product_id,row[c.target],item.qty)
        logMovement(db,{type:c.type,productId:item.product_id,qty:table === 'deliveries'?-item.qty:item.qty,fromWarehouse:c.source?row[c.source]:null,toWarehouse:c.target?row[c.target]:null,ref:row.ref,createdBy:req.user.id})
      }
      db.prepare(`UPDATE ${table} SET status = 'done' WHERE id = ?`).run(row.id)
      refreshAvailability()
    })()
    reply(res,req.params.id)
  }))
  router.post('/:id/cancel',managerOrAdmin,wrap((req,res) => {
    const row=find(req.params.id);mutable(row)
    db.transaction(() => {db.prepare(`UPDATE ${table} SET status = 'canceled' WHERE id = ?`).run(row.id);refreshAvailability()})()
    reply(res,row.id)
  }))
  router.delete('/:id',managerOrAdmin,wrap((req,res) => {
    const row=find(req.params.id)
    if (!['draft','canceled'].includes(row.status)) fail('Only drafts or canceled operations may be deleted',409)
    db.transaction(() => {db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(row.id);refreshAvailability()})()
    res.json({success:true})
  }))
  return router
}
module.exports = routerFactory
