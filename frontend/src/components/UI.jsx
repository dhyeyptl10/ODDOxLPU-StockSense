import React, { useState, useEffect } from 'react'

// ── Rich SVG Icons ─────────────────────────────────────────────────────────────
const ICONS = {
  dashboard:   "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  box:         "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z",
  inbox:       "M22 12h-6l-2 3h-4l-2-3H2 M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z",
  send:        "M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7",
  arrow:       "M17 1l4 4-4 4 M3 11V9a4 4 0 014-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 01-4 4H3",
  list:        "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2 M9 12h6 M9 16h4",
  settings:    "M12 20a8 8 0 100-16 8 8 0 000 16z M12 14a2 2 0 100-4 2 2 0 000 4z",
  user:        "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
  bell:        "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
  search:      "M11 19a8 8 0 100-16 8 8 0 000 16z M21 21l-4.35-4.35",
  plus:        "M12 5v14 M5 12h14",
  minus:       "M5 12h14",
  sun:         "M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42 M12 17a5 5 0 100-10 5 5 0 000 10z",
  moon:        "M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z",
  logout:      "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
  alert:       "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
  check:       "M20 6L9 17l-5-5",
  checkCircle: "M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3",
  x:           "M18 6L6 18 M6 6l12 12",
  xCircle:     "M15 9l-6 6 M9 9l6 6 M12 22a10 10 0 100-20 10 10 0 000 20z",
  edit:        "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:       "M3 6h18 M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2",
  trending:    "M23 6l-9.5 9.5-5-5L1 18",
  warehouse:   "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  activity:    "M22 12h-4l-3 9L9 3l-3 9H2",
  archive:     "M21 8v13H3V8 M23 3H1v5h22V3z M10 12h4",
  eye:         "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
  tag:         "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01",
  menu:        "M3 12h18 M3 6h18 M3 18h18",
  chevron:     "M9 18l6-6-6-6",
  chevD:       "M6 9l6 6 6-6",
  refresh:     "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15",
  shield:      "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  crown:       "M2 20h20 M4 20l2-10 6 5 6-5 2 10",
  users:       "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  lock:        "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4",
  mail:        "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  key:         "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  barChart:    "M18 20V10 M12 20V4 M6 20v-6",
  pieChart:    "M21.21 15.89A10 10 0 118 2.83 M22 12A10 10 0 0012 2v10z",
  download:    "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  filter:      "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  sparkles:    "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
}

export const Ico = ({ n, size=15, color='currentColor', stroke=1.9, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...p}>
    {(ICONS[n]||ICONS.box).split(' M').map((d,i) =>
      <path key={i} d={i===0 ? d : 'M'+d} />
    )}
  </svg>
)

// ── Badge ─────────────────────────────────────────────────────────────────────
const STATUS_MAP = { draft:'bd', waiting:'bw', ready:'brd', done:'bdn', canceled:'bc', low:'blow', out:'bout', ok:'bok' }
const STATUS_LBL = { draft:'Draft', waiting:'Waiting', ready:'Ready', done:'Done', canceled:'Canceled', low:'Low Stock', out:'Out of Stock', ok:'In Stock' }
const STATUS_IC  = { draft:'edit', waiting:'refresh', ready:'sparkles', done:'check', canceled:'x', low:'alert', out:'xCircle', ok:'checkCircle' }

export const Bdg = ({ s }) => (
  <span className={`bdg ${STATUS_MAP[s]||'bd'}`}>
    <Ico n={STATUS_IC[s]||'box'} size={11}/>
    {STATUS_LBL[s]||s}
  </span>
)

// ── Toast System ──────────────────────────────────────────────────────────────
let _toastFn = null
export const toast = (msg, t='s') => _toastFn && _toastFn(msg, t)

export const ToastBox = () => {
  const [items, setItems] = useState([])
  _toastFn = (msg, t) => {
    const id = Date.now() + Math.random()
    setItems(x => [...x, { id, msg, t }])
    setTimeout(() => setItems(x => x.filter(i => i.id!==id)), 3500)
  }
  if (!items.length) return null
  return (
    <div className="tw">
      {items.map(i => (
        <div key={i.id} className="tst">
          <div style={{
            width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
            background: i.t==='s' ? 'var(--gnd)' : i.t==='e' ? 'var(--rdd)' : 'var(--amd)'
          }}>
            {i.t==='s' ? <Ico n="checkCircle" size={14} color="var(--gn)"/> :
             i.t==='e' ? <Ico n="xCircle" size={14} color="var(--rd)"/> :
                         <Ico n="alert" size={14} color="var(--am)"/>}
          </div>
          <span style={{ color: 'var(--t0)' }}>{i.msg}</span>
        </div>
      ))}
    </div>
  )
}

// ── Modal with Backdrop & ESC listener ─────────────────────────────────────────
export const Modal = ({ title, onClose, children, footer, wide }) => {
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="overlay" onClick={e => { if (e.target===e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={wide ? {maxWidth:680} : {}}>
        <div className="mhd">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cy)', boxShadow: '0 0 10px var(--cy)' }}/>
            <span style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:16,color:'var(--t0)'}}>{title}</span>
          </div>
          <button className="btn bs bnr" onClick={onClose} title="Close (Esc)"><Ico n="x" size={14}/></button>
        </div>
        <div className="cgl" style={{ margin: '14px 24px 0' }}/>
        <div className="mbd">{children}</div>
        {footer && (
          <>
            <div className="cgl" style={{ margin: '0 24px 14px' }}/>
            <div className="mft">{footer}</div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Custom Tooltip for Recharts ───────────────────────────────────────────────
export const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{background:'var(--bg1)',border:'1px solid var(--b1)',borderRadius:10,padding:'10px 14px',fontSize:12,boxShadow:'0 10px 25px rgba(0,0,0,.5)',backdropFilter:'blur(10px)'}}>
      {label && <div style={{color:'var(--t0)',fontWeight:800,marginBottom:6,fontFamily:'Syne,sans-serif'}}>{label}</div>}
      {payload.map((p,i) => (
        <div key={i} style={{color:p.color||'var(--cy)',display:'flex',justifyContent:'space-between',gap:12,padding:'2px 0'}}>
          <span style={{color:'var(--t2)'}}>{p.name}:</span>
          <b style={{color:p.color||'var(--t0)',fontFamily:'JetBrains Mono,monospace'}}>{Number(p.value).toLocaleString('en-IN')}</b>
        </div>
      ))}
    </div>
  )
}

// ── Export CSV Utility Button ─────────────────────────────────────────────────
export const ExportCSV = ({ data, filename = 'export.csv', title = 'Export CSV' }) => {
  const exportFile = () => {
    if (!data || !data.length) {
      toast('No data to export', 'w')
      return
    }
    const headers = Object.keys(data[0])
    const rows = data.map(obj => headers.map(h => {
      const val = obj[h] ?? ''
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(','))

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast(`Exported ${data.length} records to ${filename}`)
  }

  return (
    <button className="btn bs bsm" onClick={exportFile} title="Export to CSV">
      <Ico n="download" size={13}/>
      <span>{title}</span>
    </button>
  )
}

// ── Quick Filter Pill Bar ─────────────────────────────────────────────────────
export const FilterPills = ({ options, active, onChange }) => (
  <div style={{ display: 'inline-flex', gap: 4, background: 'var(--bg0)', padding: 3, borderRadius: 8, border: '1px solid var(--b0)' }}>
    {options.map(opt => {
      const isAct = active === opt.id
      return (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          style={{
            background: isAct ? 'var(--bg1)' : 'transparent',
            color: isAct ? 'var(--cy)' : 'var(--t2)',
            border: isAct ? '1px solid var(--b0)' : '1px solid transparent',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
            transition: '.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: 'inherit'
          }}
        >
          {opt.icon && <Ico n={opt.icon} size={11} color={isAct ? 'var(--cy)' : 'var(--t2)'}/>}
          {opt.label}
          {opt.count !== undefined && (
            <span style={{
              fontSize: 10,
              background: isAct ? 'var(--cyd)' : 'rgba(255,255,255,0.06)',
              color: isAct ? 'var(--cy)' : 'var(--t2)',
              padding: '1px 5px',
              borderRadius: 10,
              fontWeight: 800
            }}>
              {opt.count}
            </span>
          )}
        </button>
      )
    })}
  </div>
)

// ── Item Editor Component ─────────────────────────────────────────────────────
export const ItemEditor = ({ items, setItems, products, warehouseId, type }) => {
  const add = () => setItems(x => [...x, { productId: products[0]?.id||'', qty:1 }])
  const rm  = i => setItems(x => x.filter((_,j) => j!==i))
  const up  = (i,k,v) => setItems(x => x.map((it,j) => j===i ? {...it,[k]:v} : it))

  return (
    <div>
      <div className="fcb" style={{marginBottom:10}}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ico n="box" size={14} color="var(--cy)"/>
          <span className="lbl" style={{marginBottom:0}}>Operation Line Items</span>
        </div>
        <button className="btn bs bsm" onClick={add}><Ico n="plus" size={12}/>Add Item</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => {
          const p = products.find(x => x.id===it.productId)
          const avail = (type==='delivery' || type==='transfer') ? ((p?.freeStock||p?.stock||{})[warehouseId]||0) : null
          const isShort = avail !== null && avail < items.filter(row=>row.productId===it.productId).reduce((sum,row)=>sum+Number(row.qty),0)

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              background: 'var(--bg0)', border: `1px solid ${isShort ? 'var(--rdb)' : 'var(--b0)'}`,
              borderRadius: 8, transition: '.2s'
            }}>
              <select className="inp" style={{flex:3, background: 'var(--bg1)'}} value={it.productId} onChange={e=>up(i,'productId',e.target.value)}>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  className="btn bs bnr bsm"
                  onClick={() => up(i, 'qty', Math.max(1, Number(it.qty) - 1))}
                  style={{ width: 28, height: 28, padding: 0, justifyContent: 'center' }}
                >
                  <Ico n="minus" size={11}/>
                </button>
                <input
                  className="inp"
                  style={{width:65, textAlign:'center', fontFamily:'JetBrains Mono,monospace', fontWeight:700}}
                  type="number"
                  min={1}
                  value={it.qty}
                  onChange={e=>up(i,'qty',e.target.value)}
                  placeholder="Qty"
                />
                <button
                  className="btn bs bnr bsm"
                  onClick={() => up(i, 'qty', Number(it.qty) + 1)}
                  style={{ width: 28, height: 28, padding: 0, justifyContent: 'center' }}
                >
                  <Ico n="plus" size={11}/>
                </button>
              </div>

              {avail !== null && (
                <div style={{
                  fontSize:11,
                  color: isShort ? 'var(--rd)' : 'var(--t2)',
                  whiteSpace:'nowrap',
                  minWidth:75,
                  textAlign: 'right',
                  fontFamily: 'JetBrains Mono,monospace'
                }}>
                  {isShort && <Ico n="alert" size={11} color="var(--rd)" style={{ display: 'inline', marginRight: 3 }}/>}
                  avail: {Number(avail).toLocaleString('en-IN')}
                </div>
              )}

              <button className="btn br bnr bsm" onClick={()=>rm(i)} title="Remove Item"><Ico n="trash" size={12}/></button>
            </div>
          )
        })}
      </div>

      {items.length===0 && (
        <div style={{fontSize:12.5,color:'var(--t2)',textAlign:'center',padding:'18px 10px',border:'1px dashed var(--b0)',borderRadius:9,background:'rgba(255,255,255,0.01)'}}>
          <Ico n="inbox" size={20} color="var(--t3)" style={{ margin: '0 auto 6px', display: 'block' }}/>
          No items added yet — click <b>+ Add Item</b> above
        </div>
      )}
    </div>
  )
}
