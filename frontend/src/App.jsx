import React, { useState, useReducer, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar.jsx'
import { ToastBox, Ico, toast } from './components/UI.jsx'
import Auth from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ManagerDashboard from './pages/ManagerDashboard.jsx'
import StaffDashboard from './pages/StaffDashboard.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import Products from './pages/Products.jsx'
import { Receipts, Deliveries, Transfers } from './pages/Operations.jsx'
import { Adjustments, History, Warehouses, Profile } from './pages/Settings.jsx'
import { reducer, INIT, stockStatus, totalStock, fNum } from './store/index.js'
import { authAPI, getToken, setToken, clearToken, productsAPI, warehousesAPI, receiptsAPI, deliveriesAPI, transfersAPI, adjustmentsAPI, movementsAPI, dashboardAPI } from './api.js'

const mapProduct    = p => ({ ...p, id:p.id, name:p.name, sku:p.sku, category:p.category, unit:p.unit, reorderLevel:p.reorder_level||p.reorderLevel||0, stock:p.stock||{}, createdAt:p.created_at||p.createdAt })
const mapWarehouse  = w => ({ ...w, id:w.id, name:w.name, location:w.location, description:w.description })
const mapReceipt    = r => ({ ...r, id:r.id, ref:r.ref, supplier:r.supplier, warehouse:r.warehouse_id||r.warehouse, status:r.status, date:r.date, notes:r.notes, items:(r.items||[]).map(i=>({ ...i, productId:i.product_id||i.productId, qty:i.qty })) })
const mapDelivery   = d => ({ ...d, id:d.id, ref:d.ref, customer:d.customer, warehouse:d.warehouse_id||d.warehouse, status:d.status, date:d.date, notes:d.notes, items:(d.items||[]).map(i=>({ ...i, productId:i.product_id||i.productId, qty:i.qty })) })
const mapTransfer   = t => ({ ...t, id:t.id, ref:t.ref, from:t.from_warehouse||t.from, to:t.to_warehouse||t.to, status:t.status, date:t.date, notes:t.notes, items:(t.items||[]).map(i=>({ ...i, productId:i.product_id||i.productId, qty:i.qty })) })
const mapAdjustment = a => ({ ...a, id:a.id, ref:a.ref, productId:a.product_id||a.productId, warehouse:a.warehouse_id||a.warehouse, oldQty:a.old_qty??a.oldQty, newQty:a.new_qty??a.newQty, reason:a.reason, date:a.date, status:a.status })
const mapMovement   = m => ({ ...m, id:m.id, date:m.date, type:m.type, productId:m.product_id||m.productId, qty:m.qty, from:m.from_warehouse||m.from||'-', to:m.to_warehouse||m.to||'-', ref:m.ref })

// Role-based page access
const ROLE_PAGES = {
  admin:           ['dashboard','adminPanel','products','receipts','deliveries','transfers','adjustments','history','warehouses','profile'],
  manager:         ['dashboard','managerDash','products','receipts','deliveries','transfers','adjustments','history','warehouses','profile'],
  warehouse_staff: ['dashboard','staffDash','products','receipts','deliveries','transfers','adjustments','history','profile'],
}

const ROLE_DISPLAY = {
  admin:           { label:'Administrator', color:'var(--cy)',  bg:'var(--cyd)', border:'var(--cyb)', icon:'shield'   },
  manager:         { label:'Inventory Mgr', color:'var(--pu)',  bg:'var(--pud)', border:'var(--pub)', icon:'activity' },
  warehouse_staff: { label:'Warehouse Staff', color:'var(--gn)', bg:'var(--gnd)', border:'var(--gnb)', icon:'box'      },
}

export default function App() {
  const [user,      setUser]      = useState(null)
  const [theme,     setTheme]     = useState('dark')
  const [page,      setPage]      = useState('dashboard')
  const [col,       setCol]       = useState(false)
  const [mobOpen,   setMobOpen]   = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [searchOpen,setSearchOpen]= useState(false)
  const [searchQ,   setSearchQ]   = useState('')
  const [s, d] = useReducer(reducer, {products:[],warehouses:[],receipts:[],deliveries:[],transfers:[],adjustments:[],movements:[]})

  const loadAll = useCallback(async () => {
    try {
      const [prods, whs, rcpts, dlvs, trfs, adjs, movs, dash] = await Promise.all([
        productsAPI.list(), warehousesAPI.list(), receiptsAPI.list(),
        deliveriesAPI.list(), transfersAPI.list(), adjustmentsAPI.list(),
        movementsAPI.all(), dashboardAPI.get(),
      ])
      d({ type:'HYDRATE', payload: {
        dashboard: dash.data,
        products:    (prods.data||[]).map(mapProduct),
        warehouses:  (whs.data||[]).map(mapWarehouse),
        receipts:    (rcpts.data||[]).map(mapReceipt),
        deliveries:  (dlvs.data||[]).map(mapDelivery),
        transfers:   (trfs.data||[]).map(mapTransfer),
        adjustments: (adjs.data||[]).map(mapAdjustment),
        movements:   (movs.data||[]).map(mapMovement),
      }})
    } catch(err) {
      if (err.status === 401) { clearToken(); setUser(null); return }
      toast(`Unable to refresh inventory: ${err.message}`, 'e')
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken()
      if (!token) { setLoading(false); return }
      try {
        const { user:u } = await authAPI.me()
        const userObj = { id:u.id, name:u.name, email:u.email, role:u.role, av:u.avatar, loginId:u.loginId, phone:u.phone }
        setUser(userObj)
        setPage('dashboard')
        await loadAll()
      } catch { clearToken() } finally { setLoading(false) }
    }
    checkAuth()
  }, [loadAll])

  // Global keyboard shortcut: Ctrl+K or Cmd+K for command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen])

  const logout = () => {
    clearToken()
    setUser(null)
    setPage('dashboard')
    d({ type:'HYDRATE', payload:{products:[],warehouses:[],receipts:[],deliveries:[],transfers:[],adjustments:[],movements:[]} })
    toast('Logged out successfully')
  }

  const refresh = useCallback(() => loadAll(), [loadAll])
  useEffect(() => { if (!user) return; const timer = setInterval(loadAll, 30000); return () => clearInterval(timer) }, [user, loadAll])

  const PAGES = (role) => {
    const isAdmin   = role === 'admin'
    const isManager = role === 'manager'
    return {
      dashboard:   isAdmin   ? <Dashboard        s={s} refresh={refresh} /> :
                   isManager ? <ManagerDashboard s={s} refresh={refresh} /> :
                               <StaffDashboard    s={s} refresh={refresh} setPage={setPage} />,
      adminPanel:  isAdmin   ? <AdminPanel currentUserId={user?.id} /> : null,
      managerDash: isManager ? <ManagerDashboard s={s} refresh={refresh} /> : null,
      staffDash:   <StaffDashboard s={s} refresh={refresh} setPage={setPage} />,
      products:    <Products setPage={setPage} s={s} d={d} refresh={refresh} />,
      receipts:    <Receipts user={user} s={s} d={d} refresh={refresh} />,
      deliveries:  <Deliveries user={user} s={s} d={d} refresh={refresh} />,
      transfers:   <Transfers user={user} s={s} d={d} refresh={refresh} />,
      adjustments: <Adjustments s={s} d={d} refresh={refresh} />,
      history:     <History     s={s} refresh={refresh} />,
      warehouses:  <Warehouses   s={s} d={d} refresh={refresh} />,
      profile:     <Profile     user={user} setUser={setUser} />,
    }
  }

  const outOfStock = s.products.filter(p => stockStatus(p) === 'out').length
  const lowStock   = s.products.filter(p => stockStatus(p) === 'low').length

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:'var(--bg0)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{
          width: 54, height: 54,
          background: 'linear-gradient(135deg, var(--cy), #0284c7, var(--pu))',
          borderRadius: 16, display: 'grid', placeItems: 'center', margin: '0 auto 18px',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)', animation: 'glow 2.5s infinite alternate'
        }}>
          <Ico n="archive" size={26} color="white" stroke={2.2}/>
        </div>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--t0)', letterSpacing: '.04em' }}>
          Core<span style={{ color: 'var(--cy)' }}>Inventory</span>
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--t2)', letterSpacing: '.12em', marginTop: 6 }}>
          INITIALIZING STOCK ENGINE...
        </div>
      </div>
    </div>
  )

  if (!user) return (
    <div className={theme==='light'?'lm':''} style={{ minHeight:'100vh' }}>
      <ToastBox/>
      <Auth onLogin={async (u, token) => {
        if(token) setToken(token)
        setUser(u)
        toast('Welcome back, ' + u.name + '! Loading operations...')
        await loadAll()
      }}/>
    </div>
  )

  const pages = PAGES(user.role)
  const currentPage = pages[page] || pages['dashboard']
  const roleConfig = ROLE_DISPLAY[user.role] || ROLE_DISPLAY.warehouse_staff

  // Search results for Command Palette
  const filteredProds = searchQ ? s.products.filter(p => (p.name+p.sku+p.category).toLowerCase().includes(searchQ.toLowerCase())) : []
  const filteredNav = searchQ ? [
    { label: 'Dashboard', page: 'dashboard', icon: 'dashboard' },
    { label: 'Products & Stock', page: 'products', icon: 'box' },
    { label: 'Receipts (Incoming)', page: 'receipts', icon: 'inbox' },
    { label: 'Deliveries (Outgoing)', page: 'deliveries', icon: 'send' },
    { label: 'Transfers', page: 'transfers', icon: 'arrow' },
    { label: 'Stock Adjustments', page: 'adjustments', icon: 'refresh' },
    { label: 'Move History & Audit', page: 'history', icon: 'list' },
    { label: 'Warehouses', page: 'warehouses', icon: 'warehouse' },
    { label: 'Admin Panel', page: 'adminPanel', icon: 'shield' },
  ].filter(n => n.label.toLowerCase().includes(searchQ.toLowerCase())) : []

  return (
    <div className={theme==='light'?'lm':''}>
      <ToastBox/>

      {/* ── Global Command Palette / Search Modal ── */}
      {searchOpen && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', backdropFilter:'blur(8px)', zIndex:999, display:'grid', placeItems:'center', padding:16 }}
          onClick={e => { if (e.target===e.currentTarget) setSearchOpen(false) }}
        >
          <div className="card scale-in" style={{ width:'100%', maxWidth:540, padding:0, overflow:'hidden', boxShadow:'0 25px 60px rgba(0,0,0,.6)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 18px', borderBottom:'1px solid var(--b0)' }}>
              <Ico n="search" size={17} color="var(--cy)"/>
              <input
                autoFocus
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search products, SKUs, pages, or operations... (Esc to close)"
                style={{ background:'transparent', border:'none', outline:'none', color:'var(--t0)', fontSize:14, width:'100%', fontFamily:'inherit' }}
              />
              <span className="mono" style={{ fontSize:10, color:'var(--t2)', background:'var(--bg0)', padding:'3px 7px', borderRadius:5, border:'1px solid var(--b0)' }}>
                ESC
              </span>
            </div>

            <div style={{ maxHeight:320, overflowY:'auto', padding:'8px 0' }}>
              {searchQ ? (
                <>
                  {filteredNav.length > 0 && (
                    <div style={{ padding:'6px 16px 2px', fontSize:10, fontWeight:800, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.06em' }}>Pages</div>
                  )}
                  {filteredNav.map(n => (
                    <div
                      key={n.page}
                      onClick={() => { setPage(n.page); setSearchOpen(false); setSearchQ('') }}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 18px', cursor:'pointer', transition:'.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--cyd)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Ico n={n.icon} size={15} color="var(--cy)"/>
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--t0)' }}>{n.label}</span>
                    </div>
                  ))}

                  {filteredProds.length > 0 && (
                    <div style={{ padding:'10px 16px 2px', fontSize:10, fontWeight:800, color:'var(--t2)', textTransform:'uppercase', letterSpacing:'.06em' }}>Products & SKUs</div>
                  )}
                  {filteredProds.map(p => (
                    <div
                      key={p.id}
                      onClick={() => { setPage('products'); setSearchOpen(false); setSearchQ('') }}
                      style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 18px', cursor:'pointer', transition:'.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--cyd)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <Ico n="box" size={14} color="var(--t2)"/>
                        <div>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--t0)' }}>{p.name}</div>
                          <div className="mono" style={{ fontSize:11, color:'var(--t2)' }}>{p.sku} · {p.category}</div>
                        </div>
                      </div>
                      <span className="mono" style={{ fontSize:12, fontWeight:700, color:'var(--t0)' }}>{fNum(totalStock(p))} {p.unit}</span>
                    </div>
                  ))}

                  {filteredNav.length===0 && filteredProds.length===0 && (
                    <div style={{ padding:28, textAlign:'center', color:'var(--t2)', fontSize:12 }}>
                      No matching records found for "{searchQ}"
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding:'14px 18px' }}>
                  <div style={{ fontSize:11, color:'var(--t2)', marginBottom:8, fontWeight:700 }}>QUICK NAVIGATION</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6 }}>
                    {[
                      ['Dashboard', 'dashboard', 'dashboard'],
                      ['Products & Stock', 'products', 'box'],
                      ['Incoming Receipts', 'receipts', 'inbox'],
                      ['Outgoing Deliveries', 'deliveries', 'send'],
                      ['Internal Transfers', 'transfers', 'arrow'],
                      ['Stock Adjustments', 'adjustments', 'refresh'],
                    ].map(([l, pg, ic]) => (
                      <div
                        key={pg}
                        onClick={() => { setPage(pg); setSearchOpen(false) }}
                        style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:7, background:'var(--bg0)', border:'1px solid var(--b0)', cursor:'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cy)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--b0)'}
                      >
                        <Ico n={ic} size={13} color="var(--cy)"/>
                        <span style={{ fontSize:12, color:'var(--t1)', fontWeight:600 }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Main App Shell ── */}
      <div className="shell">
        {mobOpen && <button className="mobile-backdrop" aria-label="Close menu" onClick={()=>setMobOpen(false)}/>}
        <Sidebar
          page={page} setPage={setPage}
          theme={theme} setTheme={setTheme}
          user={user} onLogout={logout}
          col={col} setCol={setCol}
          mobOpen={mobOpen} setMobOpen={setMobOpen}
          userRole={user.role}
        />

        <div className={'content' + (col?' col':'')}>
          {/* ── Topbar ── */}
          <div className="glass-panel" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 22, padding: '10px 18px', borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,.15)'
          }}>
            {/* Left side: Mobile button, Breadcrumb */}
            <div className="fc g3">
              <button
                className="btn bs bnr mobile-menu"
                onClick={() => setMobOpen(!mobOpen)}
                title="Toggle menu"
              >
                <Ico n="menu" size={16}/>
              </button>

              <div className="fc g2">
                <div style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13,
                  color: 'var(--t0)', letterSpacing: '-0.01em'
                }}>
                  Core<span style={{ color: 'var(--cy)' }}>Inventory</span>
                </div>
                <span style={{ color: 'var(--b2)' }}>/</span>
                <span style={{ fontSize: 12.5, color: 'var(--t1)', fontWeight: 600, textTransform: 'capitalize' }}>
                  {page === 'adminPanel' ? 'Admin Panel' : page === 'managerDash' ? 'Command Center' : page}
                </span>
              </div>
            </div>

            {/* Right side: Search shortcut, Out of Stock, Role Pill, User Avatar */}
            <div className="fc g3">
              {/* Quick Search Button */}
              <button
                className="btn bs bsm"
                onClick={() => setSearchOpen(true)}
                style={{ padding: '6px 12px', background: 'var(--bg0)', borderRadius: 8 }}
                title="Search anything (Ctrl+K)"
              >
                <Ico n="search" size={13} color="var(--t2)"/>
                <span style={{ color: 'var(--t2)', fontSize: 12 }}>Search...</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--t2)', background: 'var(--bg1)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--b0)' }}>
                  ⌘K
                </span>
              </button>

              {/* Out of Stock Alert Pill */}
              {outOfStock > 0 && (
                <div
                  className="fc g2"
                  onClick={() => setPage('products')}
                  style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--rd)',
                    background: 'var(--rdd)', padding: '5px 11px', borderRadius: 8,
                    border: '1px solid var(--rdb)', cursor: 'pointer',
                    boxShadow: '0 0 15px rgba(244,63,94,.2)'
                  }}
                  title="Click to view out of stock products"
                >
                  <Ico n="alert" size={13} color="var(--rd)"/>
                  <span>{outOfStock} out of stock</span>
                </div>
              )}

              {/* Role Pill */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 700, color: roleConfig.color,
                background: roleConfig.bg, padding: '4px 11px',
                borderRadius: 9, border: `1px solid ${roleConfig.border}`
              }}>
                <Ico n={roleConfig.icon} size={12} color={roleConfig.color}/>
                {roleConfig.label}
              </div>

              {/* User Profile Badge */}
              <div
                className="fc g2"
                onClick={() => setPage('profile')}
                style={{ cursor: 'pointer', padding: '3px 6px', borderRadius: 8, transition: '.15s' }}
                title="View Profile"
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${roleConfig.color}, #0284c7)`,
                  display: 'grid', placeItems: 'center', fontWeight: 800,
                  fontSize: 11, color: '#000', flexShrink: 0,
                  boxShadow: `0 0 10px ${roleConfig.bg}`
                }}>
                  {user.av || 'U'}
                </div>
                <span style={{ color: 'var(--t0)', fontWeight: 600, fontSize: 13 }}>
                  {user.name}
                </span>
              </div>
            </div>
          </div>

          {/* Current Active Page with smooth entrance animation */}
          <div key={page} className="au">
            {currentPage}
          </div>
        </div>
      </div>
    </div>
  )
}