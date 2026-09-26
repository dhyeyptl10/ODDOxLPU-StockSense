import React, { useState } from 'react'
import { Ico, ExportCSV, CT } from '../components/UI.jsx'
import { totalStock, stockStatus, prodName, whName, fNum, fDate, toDay } from '../store/index.js'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const WEEK = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const PIE_CLR = ['#00f0ff','#10b981','#a78bfa','#f59e0b','#f43f5e','#38bdf8','#818cf8','#ec4899']

export default function ManagerDashboard({ s, refresh }) {
  const { products, receipts, deliveries, transfers, warehouses, adjustments, movements } = s
  const [activeTab, setActiveTab] = useState('overview')

  /* ── Computed stats ── */
  const totalProducts   = products.length
  const totalUnits      = products.reduce((a, p) => a + totalStock(p), 0)
  const lowStock        = products.filter(p => stockStatus(p) === 'low')
  const outOfStock      = products.filter(p => stockStatus(p) === 'out')

  const pendingRcpt     = receipts.filter(r => ['waiting','ready','draft'].includes(r.status))
  const pendingDlv      = deliveries.filter(d => ['waiting','ready','draft'].includes(d.status))
  const pendingTrf      = transfers.filter(t => ['waiting','ready','draft'].includes(t.status))

  const doneRcpt        = receipts.filter(r => r.status === 'done').length
  const doneDlv         = deliveries.filter(d => d.status === 'done').length
  const doneTrf         = transfers.filter(t => t.status === 'done').length

  /* ── Category breakdown ── */
  const byCat = {}
  products.forEach(p => {
    byCat[p.category] = (byCat[p.category] || 0) + totalStock(p)
  })
  const pieData = Object.entries(byCat).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))

  /* ── Operations summary for bar chart ── */
  const opsData = (s.dashboard?.movementTrend||[]).map(r=>({...r,day:fDate(r.date)}))

  /* ── Top moving products ── */
  const productMovements = {}
  movements.forEach(m => {
    if (!productMovements[m.productId]) productMovements[m.productId] = 0
    productMovements[m.productId] += Math.abs(m.qty)
  })
  const topProducts = Object.entries(productMovements)
    .map(([id, qty]) => ({ name: prodName(s.products, id), qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6)

  /* ── Warehouse stock breakdown ── */
  const warehouseStock = warehouses.map(w => ({
    name: w.name.length > 14 ? w.name.slice(0, 14) + '…' : w.name,
    stock: products.reduce((a, p) => a + (p.stock?.[w.id] || 0), 0),
  }))

  const TABS = [
    { id: 'overview',    label: 'Command Overview', icon: 'dashboard' },
    { id: 'operations',  label: 'Live Operations',  icon: 'activity', count: pendingRcpt.length + pendingDlv.length + pendingTrf.length },
    { id: 'stock',       label: 'Stock Intel',      icon: 'box',      count: outOfStock.length + lowStock.length },
    { id: 'reports',     label: 'Executive Reports',icon: 'barChart' },
  ]

  return (
    <div className="au">
      {/* ── Alerts ── */}
      {outOfStock.length > 0 && (
        <div className="as asr au" style={{ borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ico n="xCircle" size={16} color="var(--rd)"/>
            <span><b>CRITICAL: {outOfStock.length} products out of stock</b> — {outOfStock.map(p => p.name).slice(0,3).join(', ')}</span>
          </div>
          <span className="mono" style={{ fontSize: 11, background: 'var(--rdd)', padding: '2px 8px', borderRadius: 5 }}>NEEDS ACTION</span>
        </div>
      )}

      {lowStock.length > 0 && outOfStock.length === 0 && (
        <div className="as asw au d1" style={{ borderRadius: 10 }}>
          <Ico n="alert" size={16} color="var(--am)"/>
          <span><b>{lowStock.length} products below reorder level</b> — immediate restocking recommended</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="phd" style={{ marginBottom: 18 }}>
        <div>
          <div className="pt">Operations Command Center</div>
          <div className="ps">Real-time throughput metrics, approvals & warehouse status · {fDate(toDay())}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn bs bsm" onClick={refresh}>
            <Ico n="refresh" size={13}/> Refresh Data
          </button>
          <div style={{ fontSize: 11, color: 'var(--t2)', background: 'var(--bg1)', border: '1px solid var(--b0)', padding: '6px 12px', borderRadius: 8, fontFamily: 'JetBrains Mono,monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--pu)', boxShadow: '0 0 8px var(--pu)', animation: 'pulseBeacon 2s infinite' }}/>
            LIVE MANAGER MODE
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--bg1)', border: '1px solid var(--b0)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => {
          const isAct = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', transition: '.18s',
                background: isAct ? 'linear-gradient(135deg, var(--cy), #0284c7)' : 'transparent',
                color: isAct ? '#000' : 'var(--t2)',
                boxShadow: isAct ? '0 4px 15px rgba(0, 240, 255, 0.3)' : 'none'
              }}
            >
              <Ico n={t.icon} size={14} color={isAct ? '#000' : 'var(--t2)'}/>
              <span>{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 10,
                  background: isAct ? 'rgba(0,0,0,0.2)' : 'var(--amd)',
                  color: isAct ? '#000' : 'var(--am)'
                }}>
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ══════════════ OVERVIEW TAB ══════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Row */}
          <div className="grid5" style={{ marginBottom: 20 }}>
            {[
              { label: 'Total Catalog SKUs', val: totalProducts, sub: `${fNum(totalUnits)} inventory units`, color: 'var(--cy)', ic: 'box', icBg: 'var(--cyd)' },
              { label: 'Stock Shortages', val: outOfStock.length, sub: `${lowStock.length} below threshold`, color: 'var(--rd)', ic: 'xCircle', icBg: 'var(--rdd)' },
              { label: 'Pending Approvals', val: pendingRcpt.length + pendingDlv.length + pendingTrf.length, sub: 'requires review', color: 'var(--am)', ic: 'alert', icBg: 'var(--amd)' },
              { label: 'Completed Deliveries', val: doneDlv, sub: `${doneRcpt} receipts logged`, color: 'var(--gn)', ic: 'checkCircle', icBg: 'var(--gnd)' },
              { label: 'Active Facilities', val: warehouses.length, sub: 'synchronized hubs', color: 'var(--pu)', ic: 'warehouse', icBg: 'var(--pud)' },
            ].map((k, i) => (
              <div key={i} className={`kpi au d${i + 1}`}>
                <div className="ki" style={{ background: k.icBg }}><Ico n={k.ic} size={18} color={k.color}/></div>
                <div className="kv" style={{ color: k.color }}>{k.val}</div>
                <div className="kl">{k.label}</div>
                <div className="kt tm"><Ico n="trending" size={11} color="var(--t2)"/>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid2" style={{ marginBottom: 20 }}>
            {/* Operations Bar Chart */}
            <div className="card cp au d2" style={{ padding: '20px 22px' }}>
              <div className="fcb" style={{ marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)' }}>Weekly Transaction Velocity</div>
                  <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>Breakdown of daily operations by transaction type</div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {[['Receipts','#00f0ff'],['Deliveries','#10b981'],['Transfers','#a78bfa']].map(([l,c]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--t2)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c }}/>
                      {l}
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={opsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--b0)" vertical={false}/>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--t2)' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 11, fill: 'var(--t2)' }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CT/>}/>
                  <Bar dataKey="receipts" fill="#00f0ff" radius={[4, 4, 0, 0]} maxBarSize={14}/>
                  <Bar dataKey="deliveries" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={14}/>
                  <Bar dataKey="transfers" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={14}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stock by category pie */}
            <div className="card cp au d3" style={{ padding: '20px 22px' }}>
              <div className="fcb" style={{ marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)' }}>Inventory Distribution</div>
                  <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>{pieData.length} distinct product categories</div>
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--cy)', fontWeight: 700 }}>{fNum(totalUnits)} Units</span>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <ResponsiveContainer width="45%" height={170}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_CLR[i % PIE_CLR.length]} stroke="var(--bg1)" strokeWidth={2}/>)}
                    </Pie>
                    <Tooltip content={<CT/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {pieData.slice(0, 5).map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_CLR[i % PIE_CLR.length], flexShrink: 0 }}/>
                        <span style={{ fontSize: 11.5, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                      </div>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--t0)', fontWeight: 700 }}>{fNum(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pending Operations 3-Column Grid */}
          <div className="grid3" style={{ marginBottom: 20 }}>
            {[
              { title: 'Inbound Receipts', items: pendingRcpt, color: 'var(--cy)', bg: 'var(--cyd)', border: 'var(--cyb)', icon: 'inbox', keyField: 'supplier' },
              { title: 'Outbound Dispatches', items: pendingDlv, color: 'var(--gn)', bg: 'var(--gnd)', border: 'var(--gnb)', icon: 'send', keyField: 'customer' },
              { title: 'Warehouse Transfers', items: pendingTrf, color: 'var(--pu)', bg: 'var(--pud)', border: 'var(--pub)', icon: 'arrow', keyField: 'ref' },
            ].map(({ title, items, color, bg, border, icon, keyField }) => (
              <div key={title} className="card cp au d4" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: bg, display: 'grid', placeItems: 'center', border: `1px solid ${border}` }}>
                      <Ico n={icon} size={15} color={color}/>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--t0)', fontFamily: 'Syne,sans-serif' }}>{title}</span>
                  </div>
                  <span style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'Syne,sans-serif' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {items.slice(0, 4).map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg0)', borderRadius: 8, border: '1px solid var(--b0)' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t0)' }}>{item[keyField] || item.ref}</div>
                        <div className="mono" style={{ fontSize: 10, color: 'var(--t2)' }}>{item.ref} · {item.date}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, color, background: bg, padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase', border: `1px solid ${border}` }}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--t2)', textAlign: 'center', padding: '16px 0', border: '1px dashed var(--b0)', borderRadius: 8 }}>
                      All operations completed ✓
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══════════════ OPERATIONS TAB ══════════════ */}
      {activeTab === 'operations' && (
        <div className="grid2" style={{ marginBottom: 20 }}>
          {/* Recent movements */}
          <div className="card au" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="fcb" style={{ padding: '16px 20px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Ico n="activity" size={16} color="var(--cy)"/>
                <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)' }}>Recent Stock Movements</span>
              </div>
              <ExportCSV data={movements} filename="manager_movements.csv" title="Export CSV"/>
            </div>
            <div className="cgl" style={{ margin: '0 20px' }}/>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    {['Date','Type','Product','Qty','Ref'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 12).map((m) => {
                    const TYPE_COLOR = { receipt: 'var(--gn)', delivery: 'var(--rd)', transfer: 'var(--cy)', adjustment: 'var(--am)' }
                    const TYPE_SYM   = { receipt: '↑ Inbound', delivery: '↓ Dispatch', transfer: '⇄ Transfer', adjustment: '≠ Adj' }
                    return (
                      <tr key={m.id}>
                        <td className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>{m.date}</td>
                        <td>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: TYPE_COLOR[m.type] || 'var(--t2)', background: `${TYPE_COLOR[m.type]}18`, padding: '2px 7px', borderRadius: 6, border: `1px solid ${TYPE_COLOR[m.type]}30` }}>
                            {TYPE_SYM[m.type] || m.type}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--t0)', fontWeight: 600 }}>{prodName(s.products, m.productId)}</td>
                        <td className="mono" style={{ fontSize: 12, fontWeight: 800, color: m.qty > 0 ? 'var(--gn)' : m.qty < 0 ? 'var(--rd)' : 'var(--t0)' }}>
                          {m.qty > 0 ? `+${fNum(m.qty)}` : fNum(m.qty)}
                        </td>
                        <td className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>{m.ref || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {movements.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>No movements recorded yet</div>}
            </div>
          </div>

          {/* Operations completion rates */}
          <div className="card cp au d2" style={{ padding: '20px 22px' }}>
            <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)', marginBottom: 18 }}>Pipeline Completion Health</div>
            {[
              { label: 'Supplier Receipts', total: receipts.length, done: doneRcpt, color: 'var(--cy)' },
              { label: 'Customer Shipments', total: deliveries.length, done: doneDlv, color: 'var(--gn)' },
              { label: 'Warehouse Transfers', total: transfers.length, done: doneTrf, color: 'var(--pu)' },
              { label: 'Stock Reconciliations', total: adjustments.length, done: adjustments.length, color: 'var(--am)' },
            ].map(({ label, total, done, color }) => {
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              return (
                <div key={label} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--t0)', fontWeight: 600 }}>{label}</span>
                    <span className="mono" style={{ fontSize: 11, color, fontWeight: 700 }}>{done}/{total} completed ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg0)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--b0)' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: '1s ease', boxShadow: `0 0 8px ${color}` }}/>
                  </div>
                </div>
              )
            })}

            <div style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid var(--b0)' }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--t0)', marginBottom: 12, fontFamily: 'Syne,sans-serif' }}>High-Velocity Products</div>
              {topProducts.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--b0)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="mono" style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--cy)', width: 18 }}>#{i + 1}</span>
                    <span style={{ fontSize: 12, color: 'var(--t0)', fontWeight: 600 }}>{p.name}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--t1)' }}>{fNum(p.qty)} units</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STOCK INTEL TAB ══════════════ */}
      {activeTab === 'stock' && (
        <>
          {/* Warehouse stock levels */}
          <div className="card cp au" style={{ marginBottom: 20, padding: '20px 22px' }}>
            <div className="fcb" style={{ marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)' }}>Facility Capacity Utilization</div>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>Stock volume grouped per active warehouse</div>
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--cy)', fontWeight: 700 }}>{warehouses.length} Active Hubs</span>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={warehouseStock} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--b0)" horizontal={false}/>
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--t2)' }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11.5, fill: 'var(--t1)', fontWeight: 600 }} axisLine={false} tickLine={false} width={120}/>
                <Tooltip content={<CT/>}/>
                <Bar dataKey="stock" fill="#00f0ff" radius={[0, 4, 4, 0]} maxBarSize={18}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Products stock table */}
          <div className="card au" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="fcb" style={{ padding: '16px 20px 12px' }}>
              <div>
                <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)' }}>Product Inventory Telemetry</div>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>Live stock counts vs minimum reorder thresholds</div>
              </div>
              <ExportCSV data={products.map(p=>({ name:p.name, sku:p.sku, category:p.category, stock:totalStock(p), reorderLevel:p.reorderLevel, unit:p.unit }))} filename="product_intel.csv" title="Export Catalog"/>
            </div>
            <div className="cgl" style={{ margin: '0 20px' }}/>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    {['Product','SKU','Category','Total Stock','Reorder Level','Status'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const total = totalStock(p)
                    const status = stockStatus(p)
                    const STATUS_COLOR = { ok: 'var(--gn)', low: 'var(--am)', out: 'var(--rd)' }
                    const STATUS_BG    = { ok: 'var(--gnd)', low: 'var(--amd)', out: 'var(--rdd)' }
                    const STATUS_LBL   = { ok: 'In Stock', low: 'Low Stock', out: 'Out of Stock' }
                    return (
                      <tr key={p.id}>
                        <td style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{p.name}</td>
                        <td className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>{p.sku}</td>
                        <td style={{ fontSize: 12, color: 'var(--t1)' }}>{p.category}</td>
                        <td className="mono" style={{ fontSize: 13, fontWeight: 800, color: 'var(--t0)' }}>{fNum(total)} {p.unit}</td>
                        <td className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>{fNum(p.reorderLevel)} {p.unit}</td>
                        <td>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: STATUS_COLOR[status], background: STATUS_BG[status], padding: '3px 9px', borderRadius: 6, border: `1px solid ${STATUS_COLOR[status]}35` }}>
                            {STATUS_LBL[status]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══════════════ REPORTS TAB ══════════════ */}
      {activeTab === 'reports' && (
        <div className="grid2">
          {/* Operations Summary Report */}
          <div className="card cp au" style={{ padding: '20px 22px' }}>
            <div className="fcb" style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)' }}>Operations Audit Ledger</div>
              <ExportCSV data={movements} filename="audit_ledger.csv" title="Download Report"/>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Total Inbound Receipts', val: receipts.length, color: 'var(--cy)' },
                { label: 'Successfully Processed Receipts', val: doneRcpt, color: 'var(--gn)' },
                { label: 'Total Outbound Dispatches', val: deliveries.length, color: 'var(--am)' },
                { label: 'Successfully Dispatched Orders', val: doneDlv, color: 'var(--gn)' },
                { label: 'Internal Warehouse Transfers', val: transfers.length, color: 'var(--pu)' },
                { label: 'Completed Transfers', val: doneTrf, color: 'var(--gn)' },
                { label: 'Physical Count Adjustments', val: adjustments.length, color: 'var(--rd)' },
                { label: 'Total Audit Movements', val: movements.length, color: 'var(--cy)' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg0)', borderRadius: 8, border: '1px solid var(--b0)' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--t1)', fontWeight: 600 }}>{label}</span>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 800, color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory Health Report */}
          <div className="card cp au d2" style={{ padding: '20px 22px' }}>
            <div className="fcb" style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)' }}>Catalog Health & Velocity Report</div>
              <ExportCSV data={products} filename="catalog_health.csv" title="Download Report"/>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Total Catalog SKUs', val: products.length, color: 'var(--cy)' },
                { label: 'Total Warehouse Units', val: fNum(totalUnits), color: 'var(--gn)' },
                { label: 'Healthy In-Stock SKUs', val: products.filter(p => stockStatus(p) === 'ok').length, color: 'var(--gn)' },
                { label: 'Low Stock SKUs (Below Threshold)', val: lowStock.length, color: 'var(--am)' },
                { label: 'Critical Out of Stock SKUs', val: outOfStock.length, color: 'var(--rd)' },
                { label: 'Connected Facilities', val: warehouses.length, color: 'var(--pu)' },
                { label: 'Product Categories', val: Object.keys(byCat).length, color: 'var(--cy)' },
                { label: 'Avg Stock per SKU', val: products.length > 0 ? Math.round(totalUnits / products.length) : 0, color: 'var(--t0)' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg0)', borderRadius: 8, border: '1px solid var(--b0)' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--t1)', fontWeight: 600 }}>{label}</span>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 800, color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
