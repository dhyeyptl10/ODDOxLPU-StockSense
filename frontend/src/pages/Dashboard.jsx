import React from 'react'
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Ico, Bdg, CT, ExportCSV } from '../components/UI.jsx'
import { totalStock, stockStatus, prodName, whName, fNum, fDate, toDay } from '../store/index.js'

const PIE_CLR = ['#00f0ff', '#10b981', '#a78bfa', '#f59e0b', '#f43f5e', '#38bdf8', '#818cf8']

export default function Dashboard({ s }) {
  const TREND = (s.dashboard?.movementTrend||[]).map(r=>({...r,name:fDate(r.date)}))
  const { products, receipts, deliveries, transfers, movements } = s

  const totalUnits = products.reduce((a,p) => a + totalStock(p), 0)
  const low        = products.filter(p => stockStatus(p)==='low')
  const out        = products.filter(p => stockStatus(p)==='out')
  const pRcpt      = receipts.filter(r  => ['waiting','ready','draft'].includes(r.status)).length
  const pDlv       = deliveries.filter(d => ['waiting','ready','draft'].includes(d.status)).length
  const pTrf       = transfers.filter(t  => ['waiting','ready','draft'].includes(t.status)).length

  const byCat = {}
  products.forEach(p => { byCat[p.category] = (byCat[p.category]||0) + totalStock(p) })
  const pieD = Object.entries(byCat).filter(([,v]) => v>0).map(([name,value]) => ({name,value}))

  const alerts = [...out, ...low].slice(0, 6)
  const recentM = movements.slice(0, 8)

  const KPIS = [
    { label:'Total SKU Products', val:products.length, sub:`${fNum(totalUnits)} inventory units`, cls:'kc', ic:'box',     icColor:'var(--cy)', icBg:'var(--cyd)' },
    { label:'Critical Stock Alerts', val:out.length+low.length, sub:`${out.length} out · ${low.length} low`, cls:'kr', ic:'alert', icColor:'var(--rd)', icBg:'var(--rdd)', valColor:'var(--rd)' },
    { label:'Pending Receipts', val:pRcpt, sub:`${receipts.filter(r=>r.status==='done').length} received · ${s.dashboard?.operationCounts?.receipts?.late||0} late · ${s.dashboard?.operationCounts?.receipts?.waiting||0} waiting`, cls:'ka', ic:'inbox', icColor:'var(--am)', icBg:'var(--amd)', valColor:'var(--am)' },
    { label:'Pending Shipments', val:pDlv, sub:`${deliveries.filter(d=>d.status==='done').length} dispatched · ${s.dashboard?.operationCounts?.deliveries?.late||0} late · ${s.dashboard?.operationCounts?.deliveries?.waiting||0} waiting`, cls:'kg', ic:'send', icColor:'var(--gn)', icBg:'var(--gnd)', valColor:'var(--gn)' },
    { label:'Internal Transfers', val:pTrf, sub:`${transfers.filter(t=>t.status==='done').length} completed`, cls:'kp', ic:'arrow', icColor:'var(--pu)', icBg:'var(--pud)', valColor:'var(--pu)' },
  ]

  const TYPE_CLR = { receipt:'var(--gn)', delivery:'var(--rd)', transfer:'var(--cy)', adjustment:'var(--am)' }
  const TYPE_SYM = { receipt:'↑ Inbound', delivery:'↓ Dispatch', transfer:'⇄ Transfer', adjustment:'≠ Count Adj' }

  return (
    <div className="au">
      {/* ── Banner Alerts ── */}
      {out.length > 0 && (
        <div className="as asr au" style={{ borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ico n="xCircle" size={16} color="var(--rd)"/>
            <span><b>CRITICAL: {out.length} products are out of stock</b> — {out.map(p=>p.name).slice(0,3).join(', ')}{out.length>3?` +${out.length-3} more`:''}</span>
          </div>
          <span className="mono" style={{ fontSize: 11, background: 'var(--rdd)', padding: '2px 8px', borderRadius: 5, border: '1px solid var(--rdb)' }}>IMMEDIATE REORDER</span>
        </div>
      )}

      {low.length > 0 && out.length === 0 && (
        <div className="as asw au d1" style={{ borderRadius: 10 }}>
          <Ico n="alert" size={16} color="var(--am)"/>
          <span><b>{low.length} products below safety reorder threshold</b> — replenish stock to avoid shortages</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="phd">
        <div>
          <div className="pt">Executive Inventory Command Center</div>
          <div className="ps">Enterprise real-time warehouse telemetry & stock intelligence · {fDate(toDay())}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExportCSV
            data={recentM.map(m => ({ date: m.date, type: m.type, product: prodName(products, m.productId), qty: m.qty, from: m.from, to: m.to, ref: m.ref }))}
            filename="inventory_movements.csv"
            title="Export Activity"
          />
          <div style={{
            fontSize: 11, color: 'var(--t2)', fontFamily: 'JetBrains Mono, monospace',
            background: 'var(--bg1)', border: '1px solid var(--b0)', padding: '6px 12px',
            borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gn)', boxShadow: '0 0 8px var(--gn)', animation: 'pulseBeacon 2s infinite' }}/>
            LIVE SYNC
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid5" style={{ marginBottom: 20 }}>
        {KPIS.map((k, i) => (
          <div key={i} className={`kpi ${k.cls} au d${i+1}`}>
            <div className="ki" style={{ background: k.icBg }}>
              <Ico n={k.ic} size={18} color={k.icColor}/>
            </div>
            <div className="kv" style={k.valColor ? { color: k.valColor } : {}}>{k.val}</div>
            <div className="kl">{k.label}</div>
            <div className="kt tm">
              <Ico n="trending" size={11} color="var(--t2)"/>
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ── Visual Analytics Section ── */}
      <div className="grid2" style={{ marginBottom: 20 }}>
        {/* Movement Area Chart */}
        <div className="card cp au d2" style={{ padding: '20px 22px' }}>
          <div className="fcb" style={{ marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)' }}>Inbound vs Outbound Velocity</div>
              <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>{s.dashboard?.trendRange ? `Movement quantities · ${s.dashboard.trendRange.from} to ${s.dashboard.trendRange.to}` : 'Movement quantities from the stock ledger'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--cy)' }}/>
                <span style={{ color: 'var(--t1)' }}>Receipts</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--gn)' }}/>
                <span style={{ color: 'var(--t1)' }}>Deliveries</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={TREND} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--b0)" vertical={false}/>
              <XAxis dataKey="name" tick={{ fill: 'var(--t2)', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: 'var(--t2)', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CT/>}/>
              <Area type="monotone" dataKey="receipts" name="Inbound Receipts" stroke="#00f0ff" fill="url(#gc)" strokeWidth={2.5} dot={{ r: 3, fill: '#00f0ff' }} activeDot={{ r: 6 }}/>
              <Area type="monotone" dataKey="deliveries" name="Outbound Deliveries" stroke="#10b981" fill="url(#gg)" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 6 }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie Chart */}
        <div className="card cp au d3" style={{ padding: '20px 22px' }}>
          <div className="fcb" style={{ marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)' }}>Category Allocation</div>
              <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>Stock distribution across all warehouse locations</div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--cy)', fontWeight: 700 }}>{pieD.length} Categories</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieD} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" paddingAngle={4}>
                {pieD.map((_, i) => <Cell key={i} fill={PIE_CLR[i % PIE_CLR.length]} stroke="var(--bg1)" strokeWidth={2}/>)}
              </Pie>
              <Tooltip content={<CT/>}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 12px', marginTop: 10 }}>
            {pieD.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--t2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_CLR[i % PIE_CLR.length], flexShrink: 0 }}/>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                </div>
                <b className="mono" style={{ color: 'var(--t0)' }}>{fNum(d.value)}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Activity Table & Stock Health Grid ── */}
      <div className="grid2 au d4">
        {/* Recent Movements */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="fcb" style={{ padding: '16px 20px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ico n="activity" size={16} color="var(--cy)"/>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)' }}>Audit Movement Stream</span>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>Recent {recentM.length} records</span>
          </div>
          <div className="cgl" style={{ margin: '0 20px' }}/>
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Product SKU</th>
                <th style={{ textAlign: 'right' }}>Qty Shift</th>
              </tr>
            </thead>
            <tbody>
              {recentM.map(m => (
                <tr key={m.id}>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>{fDate(m.date)}</td>
                  <td>
                    <span style={{
                      color: TYPE_CLR[m.type], fontWeight: 700, fontSize: 11,
                      background: `${TYPE_CLR[m.type]}15`, padding: '2px 7px', borderRadius: 5,
                      border: `1px solid ${TYPE_CLR[m.type]}30`
                    }}>
                      {TYPE_SYM[m.type] || m.type}
                    </span>
                  </td>
                  <td style={{ color: 'var(--t0)', fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {prodName(products, m.productId)}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', color: m.qty > 0 ? 'var(--gn)' : m.qty < 0 ? 'var(--rd)' : 'var(--t1)', fontWeight: 800 }}>
                    {m.qty > 0 ? `+${fNum(m.qty)}` : fNum(m.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stock Alerts & Progress Meters */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="fcb" style={{ padding: '16px 20px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ico n="bell" size={16} color="var(--am)"/>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)' }}>Stock Health & Reorder Meters</span>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--am)', fontWeight: 700 }}>{alerts.length} Flagged</span>
          </div>
          <div className="cgl" style={{ margin: '0 20px' }}/>
          <div style={{ padding: '14px 20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {alerts.map(p => {
              const tot = totalStock(p)
              const maxL = Math.max(p.reorderLevel * 3, 10)
              const pct = Math.min(100, (tot / maxL) * 100)
              const st  = stockStatus(p)

              return (
                <div key={p.id}>
                  <div className="fcb" style={{ marginBottom: 5 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{p.name}</span>
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--t2)', marginLeft: 8 }}>{p.sku}</span>
                    </div>
                    <Bdg s={st}/>
                  </div>
                  <div className="fc g2">
                    <div className="pw" style={{ flex: 1, height: 6 }}>
                      <div className="pb" style={{
                        width: `${pct}%`,
                        background: st === 'out' ? 'var(--rd)' : st === 'low' ? 'var(--am)' : 'var(--gn)',
                        boxShadow: `0 0 8px ${st === 'out' ? 'var(--rd)' : st === 'low' ? 'var(--am)' : 'var(--gn)'}`
                      }}/>
                    </div>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--t1)', minWidth: 80, textAlign: 'right', fontWeight: 700 }}>
                      {fNum(tot)} / {fNum(maxL)} {p.unit}
                    </span>
                  </div>
                </div>
              )
            })}

            {alerts.length === 0 && (
              <div className="empty" style={{ padding: '36px 20px' }}>
                <Ico n="checkCircle" size={28} color="var(--gn)"/>
                <span style={{ color: 'var(--t0)', fontWeight: 700, marginTop: 8 }}>All stock levels healthy</span>
                <span style={{ fontSize: 11.5, color: 'var(--t2)' }}>No products are currently below their reorder threshold</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
