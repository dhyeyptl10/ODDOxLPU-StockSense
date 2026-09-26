import React from 'react'
import { Ico, ExportCSV } from '../components/UI.jsx'
import { totalStock, stockStatus, prodName, whName, fNum, fDate, toDay } from '../store/index.js'

export default function StaffDashboard({ s, refresh, setPage }) {
  const { products, receipts, deliveries, movements } = s

  const outOfStock  = products.filter(p => stockStatus(p) === 'out')
  const lowStock    = products.filter(p => stockStatus(p) === 'low')
  const pendingRcpt = receipts.filter(r => ['waiting', 'draft', 'ready'].includes(r.status))
  const pendingDlv  = deliveries.filter(d => ['waiting', 'draft', 'ready'].includes(d.status))
  const totalUnits  = products.reduce((a, p) => a + totalStock(p), 0)

  const quickActions = [
    { label: 'Receive Inbound Stock', icon: 'inbox',   page: 'receipts',    color: '#00f0ff', bg: 'rgba(0, 240, 255, 0.1)', border: 'rgba(0, 240, 255, 0.3)', desc: 'Process supplier incoming shipments' },
    { label: 'Dispatch Outbound Order', icon: 'send',  page: 'deliveries',  color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', desc: 'Pick & ship orders to customers' },
    { label: 'Internal Transfer',     icon: 'arrow',   page: 'transfers',   color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)', border: 'rgba(167, 139, 250, 0.3)', desc: 'Relocate stock between warehouses' },
    { label: 'Stock Reconciliation',  icon: 'refresh', page: 'adjustments', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', desc: 'Record physical inventory counts' },
  ]

  return (
    <div className="au">
      {/* ── Alerts ── */}
      {outOfStock.length > 0 && (
        <div className="as asr au" style={{ borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ico n="xCircle" size={16} color="var(--rd)"/>
            <span><b>ATTENTION: {outOfStock.length} items out of stock</b> — {outOfStock.map(p => p.name).slice(0,3).join(', ')}</span>
          </div>
          <button className="btn bs bsm" onClick={() => setPage('receipts')} style={{ fontSize: 11 }}>
            Create Inbound Receipt
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="phd" style={{ marginBottom: 20 }}>
        <div>
          <div className="pt">Warehouse Floor Dispatch & Operations</div>
          <div className="ps">Daily execution queue & live stock tracking · {fDate(toDay())}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn bs bsm" onClick={refresh}>
            <Ico n="refresh" size={13}/> Refresh Queue
          </button>
          <div style={{ fontSize: 11, color: 'var(--t2)', background: 'var(--bg1)', border: '1px solid var(--b0)', padding: '6px 12px', borderRadius: 8, fontFamily: 'JetBrains Mono,monospace', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gn)', boxShadow: '0 0 8px var(--gn)', animation: 'pulseBeacon 2s infinite' }}/>
            FLOOR READY
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Tracked SKUs', val: products.length, sub: `${fNum(totalUnits)} warehouse units`, color: 'var(--cy)', ic: 'box', icBg: 'var(--cyd)' },
          { label: 'Shortage Alerts', val: lowStock.length + outOfStock.length, sub: `${outOfStock.length} out of stock`, color: 'var(--rd)', ic: 'alert', icBg: 'var(--rdd)' },
          { label: 'Pending Receipts', val: pendingRcpt.length, sub: 'ready for receiving', color: 'var(--am)', ic: 'inbox', icBg: 'var(--amd)' },
          { label: 'Pending Dispatches', val: pendingDlv.length, sub: 'ready for packing', color: 'var(--gn)', ic: 'send', icBg: 'var(--gnd)' },
        ].map((k, i) => (
          <div key={i} className={`kpi au d${i + 1}`}>
            <div className="ki" style={{ background: k.icBg }}><Ico n={k.ic} size={18} color={k.color}/></div>
            <div className="kv" style={{ color: k.color }}>{k.val}</div>
            <div className="kl">{k.label}</div>
            <div className="kt tm"><Ico n="trending" size={11} color="var(--t2)"/>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Quick Action Cards ── */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11, color: 'var(--t2)', letterSpacing: '.1em', fontWeight: 800, marginBottom: 12, textTransform: 'uppercase' }}>
          EXECUTE DAILY ACTION
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {quickActions.map((a, i) => (
            <div
              key={a.page}
              onClick={() => setPage(a.page)}
              style={{
                background: 'var(--bg1)', border: `1px solid var(--b0)`, borderRadius: 14, padding: '20px 18px',
                cursor: 'pointer', textAlign: 'left', transition: 'all .22s cubic-bezier(0.16, 1, 0.3, 1)', fontFamily: 'inherit',
                animation: `up .4s ease ${i * 0.06}s both`, position: 'relative', overflow: 'hidden'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = a.border
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = `0 12px 25px ${a.bg}`
                e.currentTarget.style.background = a.bg
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--b0)'
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.background = 'var(--bg1)'
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: a.bg,
                display: 'grid', placeItems: 'center', marginBottom: 14, border: `1px solid ${a.border}`,
                boxShadow: `0 0 15px ${a.bg}`
              }}>
                <Ico n={a.icon} size={20} color={a.color}/>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t0)', marginBottom: 4, fontFamily: 'Syne,sans-serif' }}>
                {a.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>
                {a.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Floor Stock Alerts & Audit Grid ── */}
      <div className="grid2">
        {/* Stock Alerts */}
        <div className="card au" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="fcb" style={{ padding: '16px 20px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ico n="alert" size={16} color="var(--am)"/>
              <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)' }}>Critical Stock Watchlist</span>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--am)', fontWeight: 700 }}>{outOfStock.length + lowStock.length} Flagged</span>
          </div>
          <div className="cgl" style={{ margin: '0 20px' }}/>
          <div style={{ padding: '8px 0' }}>
            {[...outOfStock, ...lowStock].slice(0, 8).map((p) => {
              const s = stockStatus(p)
              const color = s === 'out' ? 'var(--rd)' : 'var(--am)'
              const bg    = s === 'out' ? 'var(--rdd)' : 'var(--amd)'
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--b0)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{p.name}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--t2)' }}>{p.sku} · Reorder threshold: {fNum(p.reorderLevel)} {p.unit}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 800, color }}>{fNum(totalStock(p))} {p.unit}</div>
                    <span style={{ fontSize: 10, fontWeight: 800, color, background: bg, padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
                      {s === 'out' ? 'OUT OF STOCK' : 'LOW STOCK'}
                    </span>
                  </div>
                </div>
              )
            })}
            {outOfStock.length === 0 && lowStock.length === 0 && (
              <div style={{ padding: 36, textAlign: 'center', color: 'var(--gn)', fontSize: 12 }}>
                <Ico n="checkCircle" size={28} color="var(--gn)"/>
                <div style={{ marginTop: 8, fontWeight: 700, fontSize: 13, color: 'var(--t0)' }}>Warehouse Stock Balanced</div>
                <div style={{ fontSize: 11.5, color: 'var(--t2)' }}>All items have adequate safety stock</div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Movements */}
        <div className="card au d2" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="fcb" style={{ padding: '16px 20px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Ico n="activity" size={16} color="var(--cy)"/>
              <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)' }}>Live Floor Activity Stream</span>
            </div>
            <ExportCSV data={movements} filename="floor_movements.csv" title="Export CSV"/>
          </div>
          <div className="cgl" style={{ margin: '0 20px' }}/>
          <div>
            {movements.slice(0, 8).map((m) => {
              const TYPE_COLOR = { receipt: 'var(--gn)', delivery: 'var(--rd)', transfer: 'var(--cy)', adjustment: 'var(--am)' }
              const TYPE_SYM   = { receipt: '↑ Inbound', delivery: '↓ Dispatch', transfer: '⇄ Transfer', adjustment: '≠ Count Adj' }
              const color = TYPE_COLOR[m.type] || 'var(--t2)'
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--b0)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      padding: '4px 8px', borderRadius: 6, background: `${color}18`,
                      fontSize: 10.5, color, fontWeight: 800, flexShrink: 0, border: `1px solid ${color}30`
                    }}>
                      {TYPE_SYM[m.type] || m.type}
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t0)' }}>{prodName(s.products, m.productId)}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--t2)' }}>{m.ref || m.type} · {m.date}</div>
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 800, color }}>
                    {m.qty > 0 ? `+${fNum(m.qty)}` : fNum(m.qty)}
                  </span>
                </div>
              )
            })}
            {movements.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--t2)', fontSize: 12 }}>No floor movements recorded</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
