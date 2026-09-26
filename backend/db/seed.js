// db/seed.js — Seeds the database with initial data matching the frontend store
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const db      = require('./database')
const bcrypt  = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')

console.log('🌱  Seeding CoreInventory database...')

// Demo seed is intentionally non-destructive and cannot run in production.
if (process.env.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production')
if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n || db.prepare('SELECT COUNT(*) AS n FROM products').get().n || db.prepare('SELECT COUNT(*) AS n FROM warehouses').get().n) {
  console.log('Database contains data; seed skipped. Existing records are preserved.')
  process.exit(0)
}

// ─── Users ────────────────────────────────────────────────────────────────────
const adminHash = bcrypt.hashSync('admin123', 10)
const staffHash = bcrypt.hashSync('staff123', 10)

db.prepare(`
  INSERT INTO users (id, name, email, password, role, avatar)
  VALUES (?, ?, ?, ?, ?, ?)
`).run('u1', 'Admin User',     'admin@coreinventory.com', adminHash, 'admin',           'AU')
db.prepare(`
  INSERT INTO users (id, name, email, password, role, avatar)
  VALUES (?, ?, ?, ?, ?, ?)
`).run('u2', 'Warehouse Staff','staff@coreinventory.com', staffHash, 'warehouse_staff', 'WS')
db.prepare(`
  INSERT INTO users (id, name, email, password, role, avatar)
  VALUES (?, ?, ?, ?, ?, ?)
`).run('u3', 'Manager Singh',  'manager@coreinventory.com', bcrypt.hashSync('manager123',10), 'manager', 'MS')

// ─── Warehouses ───────────────────────────────────────────────────────────────
const warehouses = [
  { id:'wh1', name:'Main Warehouse',   location:'Mumbai', description:'Primary storage facility' },
  { id:'wh2', name:'Production Floor', location:'Mumbai', description:'Manufacturing support area' },
  { id:'wh3', name:'Delhi Store',      location:'Delhi',  description:'North India distribution hub' },
]
const insWH = db.prepare('INSERT INTO warehouses (id,name,location,description) VALUES (?,?,?,?)')
warehouses.forEach(w => insWH.run(w.id, w.name, w.location, w.description))

// ─── Products ─────────────────────────────────────────────────────────────────
const products = [
  { id:'p1', name:'Steel Rod',        sku:'STL-001', category:'Raw Materials', unit:'kg',     reorder_level:20  },
  { id:'p2', name:'Office Chair',     sku:'CHR-001', category:'Furniture',     unit:'pieces', reorder_level:10  },
  { id:'p3', name:'Conference Table', sku:'TBL-001', category:'Furniture',     unit:'pieces', reorder_level:5   },
  { id:'p4', name:'M8 Screws',        sku:'SCW-001', category:'Spare Parts',   unit:'pieces', reorder_level:500 },
  { id:'p5', name:'Industrial Paint', sku:'PNT-001', category:'Chemicals',     unit:'liters', reorder_level:50  },
  { id:'p6', name:'Copper Wire',      sku:'COP-001', category:'Electronics',   unit:'meters', reorder_level:100 },
  { id:'p7', name:'Packing Box L',    sku:'PKG-001', category:'Packaging',     unit:'pieces', reorder_level:100 },
  { id:'p8', name:'Cotton Fabric',    sku:'CTN-001', category:'Textiles',      unit:'meters', reorder_level:200 },
]
const insProd = db.prepare('INSERT INTO products (id,name,sku,category,unit,reorder_level,created_at) VALUES (?,?,?,?,?,?,?)')
const dates = ['2024-01-10','2024-01-12','2024-01-15','2024-01-18','2024-01-20','2024-01-22','2024-01-25','2024-01-28']
products.forEach((p,i) => insProd.run(p.id, p.name, p.sku, p.category, p.unit, p.reorder_level, dates[i]))

// ─── Product Stock (per warehouse) ────────────────────────────────────────────
const stockData = {
  p1: { wh1:97,  wh2:30,  wh3:0   },
  p2: { wh1:45,  wh2:0,   wh3:20  },
  p3: { wh1:12,  wh2:0,   wh3:3   },
  p4: { wh1:2300,wh2:450, wh3:0   },
  p5: { wh1:15,  wh2:0,   wh3:0   },
  p6: { wh1:0,   wh2:0,   wh3:0   },
  p7: { wh1:380, wh2:0,   wh3:50  },
  p8: { wh1:8,   wh2:0,   wh3:0   },
}
const insStock = db.prepare('INSERT INTO product_stock (product_id,warehouse_id,quantity) VALUES (?,?,?)')
Object.entries(stockData).forEach(([pid, whs]) => {
  Object.entries(whs).forEach(([wid, qty]) => insStock.run(pid, wid, qty))
})

// ─── Receipts ─────────────────────────────────────────────────────────────────
const receipts = [
  { id:'r1', ref:'RCT-001', supplier:'SteelCo Ltd',   warehouse_id:'wh1', status:'done',    date:'2024-01-10', notes:'Regular quarterly order', items:[{product_id:'p1',qty:100}] },
  { id:'r2', ref:'RCT-002', supplier:'FurniWorld',    warehouse_id:'wh1', status:'done',    date:'2024-01-12', notes:'',                        items:[{product_id:'p2',qty:20},{product_id:'p3',qty:5}] },
  { id:'r3', ref:'RCT-003', supplier:'ChemBase Corp', warehouse_id:'wh1', status:'waiting', date:'2024-01-20', notes:'Urgent order',             items:[{product_id:'p5',qty:50}] },
  { id:'r4', ref:'RCT-004', supplier:'SteelCo Ltd',   warehouse_id:'wh1', status:'ready',   date:'2024-01-25', notes:'',                        items:[{product_id:'p1',qty:50}] },
]
const insRcpt     = db.prepare('INSERT INTO receipts (id,ref,supplier,warehouse_id,status,date,notes,created_by) VALUES (?,?,?,?,?,?,?,?)')
const insRcptItem = db.prepare('INSERT INTO receipt_items (id,receipt_id,product_id,qty) VALUES (?,?,?,?)')
receipts.forEach(r => {
  insRcpt.run(r.id, r.ref, r.supplier, r.warehouse_id, r.status, r.date, r.notes, 'u1')
  r.items.forEach(item => insRcptItem.run(uuidv4(), r.id, item.product_id, item.qty))
})

// ─── Deliveries ───────────────────────────────────────────────────────────────
const deliveries = [
  { id:'d1', ref:'DLV-001', customer:'Acme Corp',      warehouse_id:'wh1', status:'done',    date:'2024-01-15', notes:'',                  items:[{product_id:'p2',qty:10}] },
  { id:'d2', ref:'DLV-002', customer:'BuildRight Ltd', warehouse_id:'wh1', status:'done',    date:'2024-01-18', notes:'',                  items:[{product_id:'p1',qty:20},{product_id:'p4',qty:500}] },
  { id:'d3', ref:'DLV-003', customer:'TechSolutions',  warehouse_id:'wh1', status:'ready',   date:'2024-01-26', notes:'',                  items:[{product_id:'p3',qty:2}] },
  { id:'d4', ref:'DLV-004', customer:'HomeMakers Co',  warehouse_id:'wh1', status:'waiting', date:'2024-01-27', notes:'Priority delivery', items:[{product_id:'p2',qty:5}] },
]
const insDlv     = db.prepare('INSERT INTO deliveries (id,ref,customer,warehouse_id,status,date,notes,created_by) VALUES (?,?,?,?,?,?,?,?)')
const insDlvItem = db.prepare('INSERT INTO delivery_items (id,delivery_id,product_id,qty) VALUES (?,?,?,?)')
deliveries.forEach(d => {
  insDlv.run(d.id, d.ref, d.customer, d.warehouse_id, d.status, d.date, d.notes, 'u1')
  d.items.forEach(item => insDlvItem.run(uuidv4(), d.id, item.product_id, item.qty))
})

// ─── Transfers ────────────────────────────────────────────────────────────────
const transfers = [
  { id:'t1', ref:'TRF-001', from_warehouse:'wh1', to_warehouse:'wh2', status:'done',    date:'2024-01-11', notes:'Production batch',  items:[{product_id:'p1',qty:30}] },
  { id:'t2', ref:'TRF-002', from_warehouse:'wh1', to_warehouse:'wh3', status:'done',    date:'2024-01-14', notes:'Delhi restocking',  items:[{product_id:'p2',qty:20},{product_id:'p7',qty:50}] },
  { id:'t3', ref:'TRF-003', from_warehouse:'wh1', to_warehouse:'wh2', status:'waiting', date:'2024-01-26', notes:'',                 items:[{product_id:'p4',qty:450}] },
]
const insTrf     = db.prepare('INSERT INTO transfers (id,ref,from_warehouse,to_warehouse,status,date,notes,created_by) VALUES (?,?,?,?,?,?,?,?)')
const insTrfItem = db.prepare('INSERT INTO transfer_items (id,transfer_id,product_id,qty) VALUES (?,?,?,?)')
transfers.forEach(t => {
  insTrf.run(t.id, t.ref, t.from_warehouse, t.to_warehouse, t.status, t.date, t.notes, 'u1')
  t.items.forEach(item => insTrfItem.run(uuidv4(), t.id, item.product_id, item.qty))
})

// ─── Adjustments ──────────────────────────────────────────────────────────────
const adjustments = [
  { id:'a1', ref:'ADJ-001', product_id:'p1', warehouse_id:'wh1', old_qty:100, new_qty:97, reason:'Damage in transit',     date:'2024-01-13' },
  { id:'a2', ref:'ADJ-002', product_id:'p5', warehouse_id:'wh1', old_qty:50,  new_qty:15, reason:'Usage without records', date:'2024-01-21' },
  { id:'a3', ref:'ADJ-003', product_id:'p8', warehouse_id:'wh1', old_qty:200, new_qty:8,  reason:'Counting discrepancy',  date:'2024-01-28' },
]
const insAdj = db.prepare('INSERT INTO adjustments (id,ref,product_id,warehouse_id,old_qty,new_qty,reason,status,date,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)')
adjustments.forEach(a => insAdj.run(a.id, a.ref, a.product_id, a.warehouse_id, a.old_qty, a.new_qty, a.reason, 'done', a.date, 'u1'))

// ─── Stock Movements ──────────────────────────────────────────────────────────
const movements = [
  { id:'m1',  date:'2024-01-10', type:'receipt',    product_id:'p1', qty:100,  from_warehouse:null,  to_warehouse:'wh1', ref:'RCT-001' },
  { id:'m2',  date:'2024-01-11', type:'transfer',   product_id:'p1', qty:30,   from_warehouse:'wh1', to_warehouse:'wh2', ref:'TRF-001' },
  { id:'m3',  date:'2024-01-12', type:'receipt',    product_id:'p2', qty:20,   from_warehouse:null,  to_warehouse:'wh1', ref:'RCT-002' },
  { id:'m4',  date:'2024-01-12', type:'receipt',    product_id:'p3', qty:5,    from_warehouse:null,  to_warehouse:'wh1', ref:'RCT-002' },
  { id:'m5',  date:'2024-01-13', type:'adjustment', product_id:'p1', qty:-3,   from_warehouse:'wh1', to_warehouse:'wh1', ref:'ADJ-001' },
  { id:'m6',  date:'2024-01-14', type:'transfer',   product_id:'p2', qty:20,   from_warehouse:'wh1', to_warehouse:'wh3', ref:'TRF-002' },
  { id:'m7',  date:'2024-01-14', type:'transfer',   product_id:'p7', qty:50,   from_warehouse:'wh1', to_warehouse:'wh3', ref:'TRF-002' },
  { id:'m8',  date:'2024-01-15', type:'delivery',   product_id:'p2', qty:-10,  from_warehouse:'wh1', to_warehouse:null,  ref:'DLV-001' },
  { id:'m9',  date:'2024-01-18', type:'delivery',   product_id:'p1', qty:-20,  from_warehouse:'wh1', to_warehouse:null,  ref:'DLV-002' },
  { id:'m10', date:'2024-01-18', type:'delivery',   product_id:'p4', qty:-500, from_warehouse:'wh1', to_warehouse:null,  ref:'DLV-002' },
  { id:'m11', date:'2024-01-21', type:'adjustment', product_id:'p5', qty:-35,  from_warehouse:'wh1', to_warehouse:'wh1', ref:'ADJ-002' },
  { id:'m12', date:'2024-01-28', type:'adjustment', product_id:'p8', qty:-192, from_warehouse:'wh1', to_warehouse:'wh1', ref:'ADJ-003' },
]
const insMov = db.prepare('INSERT INTO stock_movements (id,date,type,product_id,qty,from_warehouse,to_warehouse,ref,created_by) VALUES (?,?,?,?,?,?,?,?,?)')
movements.forEach(m => insMov.run(m.id, m.date, m.type, m.product_id, m.qty, m.from_warehouse, m.to_warehouse, m.ref, 'u1'))

console.log('✅  Seed complete!')
console.log('   Default accounts:')
console.log('   admin@coreinventory.com   / admin123  (admin)')
console.log('   manager@coreinventory.com / manager123 (manager)')
console.log('   staff@coreinventory.com   / staff123  (warehouse_staff)')

// Refresh demo dates only while creating a new demo database.
const seedAnchor = new Date('2024-01-28T00:00:00Z')
const today = new Date(); today.setUTCHours(0,0,0,0)
const shift = Math.floor((today-seedAnchor)/86400000)
for (const table of ['receipts','deliveries','transfers','adjustments','stock_movements']) db.prepare(`UPDATE ${table} SET date = date(date, ?)`).run(`${shift} days`)
require('./migrate')(db)
