import React from 'react'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Ico, Bdg, CT, ExportCSV } from '../components/UI.jsx'
import { totalStock, stockStatus, prodName, whName, fNum, fDate, toDay } from '../store/index.js'

const PIE_CLR = ['#00dcff', '#00e5a0', '#b48aff', '#ffb340', '#ff4d6d', '#6c8bff', '#ff7a45']

// Custom Bar Tooltip
function BarTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--b1)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
      <div style={{ color: 'var(--t2)', marginBottom: 4, fontWeight: 700 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 700 }}>{p.name}: <span style={{ color: 'var(--t0)' }}>{fNum(p.value)}</span></div>
      ))}
    </div>
  )
}

export default function Dashboard({ s }) {
  const TREND = (s.dashboard?.movementTrend || []).map(r => ({ ...r, name: fDate(r.date) }))
  const { products, receipts, deliveries, transfers, movements, warehouses } = s

  const totalUnits  = products.reduce((a, p) => a + totalStock(p), 0)
  const low         = products.filter(p => stockStatus(p) === 'low')
  const out         = products.filter(p => stockStatus(p) === 'out')
  const healthy     = products.filter(p => stockStatus(p) === 'ok')
  const pRcpt       = receipts.filter(r => ['waiting', 'ready', 'draft'].includes(r.status)).length
  const pDlv        = deliveries.filter(d => ['waiting', 'ready', 'draft'].includes(d.status)).length
  const pTrf        = transfers.filter(t => ['waiting', 'ready', 'draft'].includes(t.status)).length
  const totalOps    = receipts.length + deliveries.length + transfers.length

  const byCat = {}
  products.forEach(p => { byCat[p.category] = (byCat[p.category] || 0) + totalStock(p) })
  const pieD = Object.entries(byCat).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))

  // Warehouse stock summary
  const whStockData = (warehouses || []).map(wh => {
    const qty = products.reduce((sum, p) => {
      const st = (p.stock || []).find(s => s.warehouseId === wh.id)
      return sum + (st ? st.qty : 0)
    }, 0)
    return { name: wh.name.replace(' Warehouse', '').replace(' Store', '').replace(' Floor', ''), units: qty }
  })

  const alerts  = [...out, ...low].slice(0, 7)
  const recentM = movements.slice(0, 10)

  const KPIS = [
    {
      label: 'Total Products', val: products.length,
      sub: `${fNum(totalUnits)} total units`, cls: 'kc',
      icColor: 'var(--cy)', icBg: 'var(--cyd)', ic: 'box',
      trend: `${healthy.length} healthy`, trendColor: 'var(--gn)'
    },
    {
      label: 'Stock Alerts', val: out.length + low.length,
      sub: `${out.length} out · ${low.length} low`, cls: 'kr',
      icColor: 'var(--rd)', icBg: 'var(--rdd)', ic: 'alert',
      valColor: out.length > 0 ? 'var(--rd)' : low.length > 0 ? 'var(--am)' : 'var(--gn)',
      trend: out.length > 0 ? 'Action required' : 'Monitor closely', trendColor: 'var(--am)'
    },
    {
      label: 'Pending Receipts', val: pRcpt,
      sub: `${receipts.filter(r => r.status === 'done').length} completed`, cls: 'ka',
      icColor: 'var(--am)', icBg: 'var(--amd)', ic: 'inbox',
      trend: `${s.dashboard?.operationCounts?.receipts?.late || 0} overdue`, trendColor: 'var(--rd)'
    },
    {
      label: 'Pending Deliveries', val: pDlv,
      sub: `${deliveries.filter(d => d.status === 'done').length} dispatched`, cls: 'kg',
      icColor: 'var(--gn)', icBg: 'var(--gnd)', ic: 'send',
      trend: `${s.dashboard?.operationCounts?.deliveries?.late || 0} overdue`, trendColor: 'var(--rd)'
    },
    {
      label: 'Active Transfers', val: pTrf,
      sub: `${transfers.filter(t => t.status === 'done').length} completed`, cls: 'kp',
      icColor: 'var(--pu)', icBg: 'var(--pud)', ic: 'arrow',
      trend: `${totalOps} total ops`, trendColor: 'var(--pu)'
    },
  ]

  const TYPE_CLR = { receipt: 'var(--gn)', delivery: 'var(--rd)', transfer: 'var(--cy)', adjustment: 'var(--am)' }
  const TYPE_ICON = { receipt: '↑', delivery: '↓', transfer: '⇄', adjustment: '≠' }
  const TYPE_LABEL = { receipt: 'Inbound', delivery: 'Dispatch', transfer: 'Transfer', adjustment: 'Adj.' }

  return (
    <div className="au">
      {/* ── Stock Alerts Banner ── */}
      {out.length > 0 && (
        <div className="as asr au" style={{ justifyContent: 'space-between', borderRadius: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--rd)', animation: 'pulseRed 2s infinite' }}/>
            <span><b>{out.length} products out of stock</b> — {out.map(p => p.name).slice(0, 3).join(', ')}{out.length > 3 ? ` +${out.length - 3} more` : ''}</span>
          </div>
          <span style={{ fontSize: 11, background: 'var(--rdd)', padding: '3px 9px', borderRadius: 6, border: '1px solid var(--rdb)', fontWeight: 700, letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
            REORDER NOW
          </span>
        </div>
      )}
      {low.length > 0 && out.length === 0 && (
        <div className="as asw au d1" style={{ borderRadius: 11 }}>
          <Ico n="alert" size={15} color="var(--am)" />
          <span><b>{low.length} products below reorder threshold</b> — consider restocking soon</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="phd">
        <div>
          <div className="pt" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gn)', boxShadow: '0 0 10px var(--gn)', animation: 'pulseBeacon 2s infinite', flexShrink: 0 }} />
            Inventory Command Center
          </div>
          <div className="ps">Real-time warehouse telemetry &amp; stock intelligence · {fDate(toDay())}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ExportCSV
            data={recentM.map(m => ({ date: m.date, type: m.type, product: prodName(products, m.productId), qty: m.qty, ref: m.ref }))}
            filename="inventory_movements.csv"
            title="Export"
          />
          <div style={{ fontSize: 11, color: 'var(--gn)', fontFamily: 'JetBrains Mono, monospace', background: 'var(--gnl)', border: '1px solid var(--gnb)', padding: '6px 13px', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gn)', boxShadow: '0 0 8px var(--gn)', animation: 'pulseBeacon 2s infinite' }} />
            LIVE
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid5" style={{ marginBottom: 22 }}>
        {KPIS.map((k, i) => (
          <div key={i} className={`kpi ${k.cls} au d${i + 1}`}>
            <div className="ki" style={{ background: k.icBg }}>
              <Ico n={k.ic} size={19} color={k.icColor} />
            </div>
            <div className="kv" style={k.valColor ? { color: k.valColor } : {}}>{k.val}</div>
            <div className="kl" style={{ marginBottom: 3 }}>{k.label}</div>
            <div className="kt" style={{ color: 'var(--t2)' }}>
              <Ico n="trending" size={11} color="var(--t3)" />
              <span>{k.sub}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 10.5, fontWeight: 700, color: k.trendColor || 'var(--t3)' }}>
              {k.trend}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Charts Row ── */}
      <div className="grid2" style={{ marginBottom: 22 }}>

        {/* Area Chart */}
        <div className="card au d2" style={{ padding: '20px 20px 14px' }}>
          <div className="fcb" style={{ marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14.5, color: 'var(--t0)', letterSpacing: '-0.02em' }}>
                Inbound vs Outbound Trend
              </div>
              <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 3 }}>
                {s.dashboard?.trendRange ? `${s.dashboard.trendRange.from} → ${s.dashboard.trendRange.to}` : 'Stock movement velocity'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11 }}>
              {[['var(--cy)', 'Receipts'], ['var(--gn)', 'Deliveries']].map(([clr, lbl]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 10, height: 3, borderRadius: 3, background: clr, display: 'block' }} />
                  <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{lbl}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={TREND} margin={{ top: 5, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00dcff" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#00dcff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00e5a0" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="#00e5a0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--b0)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'var(--t3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--t3)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CT />} />
              <Area type="monotone" dataKey="receipts" name="Receipts" stroke="#00dcff" fill="url(#gc)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#00dcff', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="deliveries" name="Deliveries" stroke="#00e5a0" fill="url(#gg)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#00e5a0', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie + Warehouse Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Category Donut */}
          <div className="card au d3" style={{ padding: '18px 20px', flex: 1 }}>
            <div className="fcb" style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14.5, color: 'var(--t0)', letterSpacing: '-0.02em' }}>Category Allocation</div>
              <span style={{ fontSize: 11, color: 'var(--cy)', fontWeight: 700 }}>{pieD.length} categories</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={pieD} cx="50%" cy="50%" innerRadius={36} outerRadius={56} dataKey="value" paddingAngle={4} startAngle={90} endAngle={-270}>
                    {pieD.map((_, i) => <Cell key={i} fill={PIE_CLR[i % PIE_CLR.length]} stroke="var(--bg1)" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip content={<CT />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 0 }}>
                {pieD.slice(0, 5).map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_CLR[i % PIE_CLR.length], flexShrink: 0 }} />
                      <span style={{ color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                    </div>
                    <b style={{ color: 'var(--t0)', fontFamily: 'JetBrains Mono', fontSize: 11 }}>{fNum(d.value)}</b>
                  </div>
                ))}
                {pieD.length > 5 && <div style={{ fontSize: 10.5, color: 'var(--t3)' }}>+{pieD.length - 5} more</div>}
              </div>
            </div>
          </div>

          {/* Warehouse Stock Bar */}
          {whStockData.length > 0 && (
            <div className="card au d4" style={{ padding: '16px 20px 12px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13.5, color: 'var(--t0)', marginBottom: 12, letterSpacing: '-0.02em' }}>
                Warehouse Load
              </div>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={whStockData} margin={{ top: 0, right: 4, left: -32, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--b0)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--t3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--t3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="units" name="Units" radius={[4, 4, 0, 0]}>
                    {whStockData.map((_, i) => <Cell key={i} fill={PIE_CLR[i % PIE_CLR.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: Audit Table + Stock Health ── */}
      <div className="grid2 au d5">
        {/* Recent Movements */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="fcb" style={{ padding: '16px 20px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--cyd)', display: 'grid', placeItems: 'center', border: '1px solid var(--cyb)' }}>
                <Ico n="activity" size={14} color="var(--cy)" />
              </div>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)', letterSpacing: '-0.02em' }}>
                Movement Stream
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'JetBrains Mono, monospace' }}>{recentM.length} records</span>
          </div>
          <div className="cgl" style={{ margin: '0 20px' }} />
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {recentM.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--t3)' }}>{fDate(m.date)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: TYPE_CLR[m.type], fontWeight: 700, fontSize: 11, background: `${TYPE_CLR[m.type]}12`, padding: '2px 8px', borderRadius: 6, border: `1px solid ${TYPE_CLR[m.type]}28` }}>
                        {TYPE_ICON[m.type]} {TYPE_LABEL[m.type] || m.type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--t0)', fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prodName(products, m.productId)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: m.qty > 0 ? 'var(--gn)' : m.qty < 0 ? 'var(--rd)' : 'var(--t1)', fontWeight: 800 }}>
                      {m.qty > 0 ? `+${fNum(m.qty)}` : fNum(m.qty)}
                    </td>
                  </tr>
                ))}
                {recentM.length === 0 && (
                  <tr><td colSpan={4}><div className="empty" style={{ padding: 32 }}>No movements recorded</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Health Meters */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="fcb" style={{ padding: '16px 20px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--amd)', display: 'grid', placeItems: 'center', border: '1px solid var(--amb)' }}>
                <Ico n="bell" size={14} color="var(--am)" />
              </div>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)', letterSpacing: '-0.02em' }}>
                Stock Health
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: alerts.length > 0 ? 'var(--rd)' : 'var(--gn)', fontFamily: 'JetBrains Mono, monospace' }}>
              {alerts.length > 0 ? `${alerts.length} flagged` : 'All healthy ✓'}
            </span>
          </div>
          <div className="cgl" style={{ margin: '0 20px' }} />

          {/* Quick summary row */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--b0)' }}>
            {[
              { label: 'Healthy', val: healthy.length, color: 'var(--gn)', bg: 'var(--gnl)' },
              { label: 'Low Stock', val: low.length, color: 'var(--am)', bg: 'var(--aml)' },
              { label: 'Out of Stock', val: out.length, color: 'var(--rd)', bg: 'var(--rdl)' },
            ].map(({ label, val, color, bg }) => (
              <div key={label} style={{ flex: 1, padding: '10px 14px', background: bg, textAlign: 'center', borderRight: '1px solid var(--b0)' }}>
                <div style={{ fontSize: 18, fontFamily: 'Syne', fontWeight: 900, color, letterSpacing: '-0.03em' }}>{val}</div>
                <div style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: '0.03em' }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 320, overflowY: 'auto' }}>
            {alerts.map(p => {
              const tot  = totalStock(p)
              const maxL = Math.max(p.reorderLevel * 3, 10)
              const pct  = Math.min(100, (tot / maxL) * 100)
              const st   = stockStatus(p)
              const barColor = st === 'out' ? 'var(--rd)' : st === 'low' ? 'var(--am)' : 'var(--gn)'

              return (
                <div key={p.id}>
                  <div className="fcb" style={{ marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{p.name}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--t3)', marginLeft: 8 }}>{p.sku}</span>
                    </div>
                    <Bdg s={st} />
                  </div>
                  <div className="fc g2">
                    <div className="pw" style={{ flex: 1, height: 5 }}>
                      <div className="pb" style={{ width: `${pct}%`, background: barColor, boxShadow: `0 0 8px ${barColor}` }} />
                    </div>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--t1)', minWidth: 72, textAlign: 'right', fontWeight: 700 }}>
                      {fNum(tot)}/{fNum(maxL)}
                    </span>
                  </div>
                </div>
              )
            })}
            {alerts.length === 0 && (
              <div className="empty" style={{ padding: '32px 20px' }}>
                <Ico n="checkCircle" size={32} color="var(--gn)" />
                <span style={{ color: 'var(--t0)', fontWeight: 700, marginTop: 8, fontSize: 14 }}>All stock levels healthy</span>
                <span style={{ fontSize: 11.5, color: 'var(--t2)' }}>No products below reorder threshold</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
