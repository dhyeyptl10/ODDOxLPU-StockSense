const router = require('express').Router()
const db = require('../db/database')
const { auth } = require('../middleware/auth')
const { refreshAvailability, buildOperation } = require('../utils/inventory')
const { toDay } = require('../utils/helpers')
router.get('/',auth,(req,res) => {
  refreshAvailability()
  const {warehouseId,category,status,type} = req.query
  const products=db.prepare('SELECT * FROM products WHERE is_active = 1').all().filter(p=>!category||p.category===category).map(p=>({...p,totalStock:db.prepare(`SELECT COALESCE(SUM(quantity),0) AS n FROM product_stock WHERE product_id=? ${warehouseId?'AND warehouse_id=?':''}`).get(...(warehouseId?[p.id,warehouseId]:[p.id])).n}))
  const ids=new Set(products.map(p=>p.id))
  const operations={}
  for (const table of ['receipts','deliveries','transfers']) operations[table]=db.prepare(`SELECT * FROM ${table}`).all().map(o=>buildOperation(table,o)).filter(o=>(!warehouseId||[o.warehouse_id,o.from_warehouse,o.to_warehouse].includes(warehouseId))&&(!category||o.items.some(i=>ids.has(i.product_id)))&&(!status||o.status===status)&&(!type||o.operation_type===type))
  const adjustments=db.prepare('SELECT * FROM adjustments').all().filter(o=>(!warehouseId||o.warehouse_id===warehouseId)&&(!category||ids.has(o.product_id))&&(!status||status==='done')&&(!type||type==='adjustment'))
  const counts=rows=>({total:rows.length,pending:rows.filter(o=>!['done','canceled'].includes(o.status)).length,late:rows.filter(o=>o.late).length,waiting:rows.filter(o=>o.waiting).length,done:rows.filter(o=>o.status==='done').length})
  const operationCounts=Object.fromEntries(Object.entries(operations).map(([k,v])=>[k,counts(v)]))
  const all=[...Object.values(operations).flat(),...adjustments]
  let movements=db.prepare('SELECT * FROM stock_movements ORDER BY date, rowid').all().filter(m=>(!warehouseId||[m.from_warehouse,m.to_warehouse].includes(warehouseId))&&(!category||ids.has(m.product_id))&&(!type||m.type===type)&&(!status||status==='done'))
  // Historical data is labelled with its actual dates; never rewrite old user records.
  const trendEnd=movements.at(-1)?.date || toDay()
  const end=trendEnd<toDay()?trendEnd:toDay()
  const start=new Date(`${end}T00:00:00Z`);start.setUTCDate(start.getUTCDate()-13)
  const movementTrend=Array.from({length:14},(_,i)=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+i);return {date:d.toISOString().slice(0,10),receipts:0,deliveries:0,transfers:0,adjustments:0}})
  const trendKeys={receipt:'receipts',delivery:'deliveries',transfer:'transfers',adjustment:'adjustments'}
  movements.forEach(m=>{const row=movementTrend.find(r=>r.date===m.date);const key=trendKeys[m.type];if(row&&key)row[key]+=Math.abs(m.qty)})
  const byCategory=Object.values(products.reduce((acc,p)=>{acc[p.category]||={category:p.category,total_stock:0,product_count:0};acc[p.category].total_stock+=p.totalStock;acc[p.category].product_count++;return acc},{}))
  res.json({success:true,data:{
    kpis:{totalProducts:products.length,productsInStock:products.filter(p=>p.totalStock>0).length,outOfStock:products.filter(p=>p.totalStock===0).length,lowStock:products.filter(p=>p.totalStock>0&&p.totalStock<=p.reorder_level).length,totalStockUnits:products.reduce((a,p)=>a+p.totalStock,0),warehouseCount:db.prepare('SELECT COUNT(*) AS n FROM warehouses WHERE is_active=1').get().n,receiptsTotal:operationCounts.receipts.total,receiptsPending:operationCounts.receipts.pending,deliveriesTotal:operationCounts.deliveries.total,deliveriesPending:operationCounts.deliveries.pending,transfersTotal:operationCounts.transfers.total,transfersPending:operationCounts.transfers.pending,late:all.filter(o=>o.late).length,waiting:all.filter(o=>o.waiting).length,done:all.filter(o=>o.status==='done').length,totalOperations:all.length},
    operationCounts,byCategory,movementTrend,trendRange:{from:movementTrend[0].date,to:end,historical:end<toDay()},recentMovements:movements.slice(-10).reverse(),lowStockAlerts:products.filter(p=>p.totalStock<=p.reorder_level).map(p=>({...p,reorderLevel:p.reorder_level})),topStocked:[...products].sort((a,b)=>b.totalStock-a.totalStock).slice(0,5)
  }})
})
module.exports=router
