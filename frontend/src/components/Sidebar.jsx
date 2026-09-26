import React, { useState } from 'react'
import { Ico } from './UI.jsx'

const ROLE_NAV = {
  admin: {
    top: [
      { id:'dashboard',  icon:'dashboard',  label:'Dashboard' },
      { id:'adminPanel', icon:'shield',     label:'Admin Panel', badge:'ADMIN' },
    ],
    ops: [
      ['products',    'box',       'Products & Stock'],
      ['receipts',    'inbox',     'Receipts (In)'],
      ['deliveries',  'send',      'Deliveries (Out)'],
      ['transfers',   'arrow',     'Transfers (Internal)'],
      ['adjustments', 'refresh',   'Stock Adjustments'],
      ['history',     'list',      'Move History & Audit'],
    ],
    settings: [
      ['warehouses', 'warehouse', 'Warehouses'],
      ['profile',    'user',      'Account & Settings'],
    ],
  },
  manager: {
    top: [
      { id:'dashboard',   icon:'dashboard', label:'Command Center' },
    ],
    ops: [
      ['products',    'box',       'Products & Stock'],
      ['receipts',    'inbox',     'Receipts (In)'],
      ['deliveries',  'send',      'Deliveries (Out)'],
      ['transfers',   'arrow',     'Transfers (Internal)'],
      ['adjustments', 'refresh',   'Stock Adjustments'],
      ['history',     'list',      'Move History & Audit'],
    ],
    settings: [
      ['warehouses', 'warehouse', 'Warehouses'],
      ['profile',    'user',      'Account & Settings'],
    ],
  },
  warehouse_staff: {
    top: [
      { id:'dashboard', icon:'dashboard', label:'Daily Operations' },
    ],
    ops: [
      ['products',    'box',       'Products & Stock'],
      ['receipts',    'inbox',     'Receipts (In)'],
      ['deliveries',  'send',      'Deliveries (Out)'],
      ['transfers',   'arrow',     'Transfers (Internal)'],
      ['adjustments', 'refresh',   'Stock Adjustments'],
      ['history',     'list',      'Move History'],
    ],
    settings: [
      ['profile', 'user', 'My Profile'],
    ],
  },
}

const ROLE_CONFIG = {
  admin:           { label: 'Administrator',   color: 'var(--cy)', bg: 'var(--cyd)', border: 'var(--cyb)', icon: 'shield'   },
  manager:         { label: 'Inventory Mgr',   color: 'var(--pu)', bg: 'var(--pud)', border: 'var(--pub)', icon: 'activity' },
  warehouse_staff: { label: 'Warehouse Staff', color: 'var(--gn)', bg: 'var(--gnd)', border: 'var(--gnb)', icon: 'box'      },
}

export default function Sidebar({ page, setPage, theme, setTheme, user, onLogout, col, setCol, mobOpen, setMobOpen, userRole }) {
  const [opsOpen,  setOpsOpen]  = useState(true)
  const [settOpen, setSettOpen] = useState(true)

  const go   = id => { setPage(id); setMobOpen(false) }
  const cls  = 'sidebar' + (col?' col':'') + (mobOpen?' mob-open':'')
  const nav  = ROLE_NAV[userRole] || ROLE_NAV.warehouse_staff
  const rcfg = ROLE_CONFIG[userRole] || ROLE_CONFIG.warehouse_staff

  return (
    <div className={cls}>
      {/* ── Brand Logo Header ── */}
      <div className="sidebar-brand" onClick={() => setCol(!col)} title={col ? "Expand sidebar" : "Collapse sidebar"}>
        <div className="brand-icon-box">
          <Ico n="archive" size={19} color="white" stroke={2.2}/>
        </div>
        {!col && (
          <div style={{ minWidth: 0 }}>
            <div className="brand-title">Core<span style={{ color: 'var(--cy)' }}>Inventory</span></div>
            <div className="brand-subtitle">ENTERPRISE OPS</div>
          </div>
        )}
      </div>

      {/* ── Role Badge ── */}
      {!col && userRole && (
        <div style={{
          margin: '0 12px 10px', padding: '7px 12px',
          background: rcfg.bg, border: `1px solid ${rcfg.border}`,
          borderRadius: 9, display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: `0 2px 10px ${rcfg.bg}`
        }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: rcfg.color, boxShadow: `0 0 8px ${rcfg.color}`,
            animation: 'pulseBeacon 2s infinite'
          }}/>
          <span style={{ fontSize: 11, fontWeight: 700, color: rcfg.color, letterSpacing: '.03em', whiteSpace: 'nowrap' }}>
            {rcfg.label}
          </span>
        </div>
      )}

      <div className="cgl" style={{ margin: '0 12px 6px' }}/>

      {/* ── Navigation Links ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {/* Top Nav Items */}
        {nav.top.map(item => (
          <NavItem key={item.id} id={item.id} icon={item.icon} label={item.label} active={page===item.id}
            col={col} onClick={() => go(item.id)} badge={item.badge} badgeColor={rcfg.color}/>
        ))}

        {/* Operations Section */}
        {nav.ops.length > 0 && (
          <>
            {!col ? (
              <div
                className="nav-section-label"
                onClick={() => setOpsOpen(!opsOpen)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              >
                <span>Operations</span>
                <span style={{ transition: '.2s', transform: opsOpen ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>
                  <Ico n="chevron" size={10} color="var(--t3)"/>
                </span>
              </div>
            ) : (
              <div className="cgl" style={{ margin: '8px 12px' }}/>
            )}

            {(opsOpen || col) && nav.ops.map(([id, ic, lbl]) => (
              <NavItem key={id} id={id} icon={ic} label={lbl} active={page===id} col={col}
                onClick={() => go(id)}/>
            ))}
          </>
        )}

        {/* Settings Section */}
        {nav.settings.length > 0 && (
          <>
            {!col ? (
              <div
                className="nav-section-label"
                onClick={() => setSettOpen(!settOpen)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginTop: 6 }}
              >
                <span>Configuration</span>
                <span style={{ transition: '.2s', transform: settOpen ? 'rotate(90deg)' : 'none', display: 'inline-block' }}>
                  <Ico n="chevron" size={10} color="var(--t3)"/>
                </span>
              </div>
            ) : (
              <div className="cgl" style={{ margin: '8px 12px' }}/>
            )}

            {(settOpen || col) && nav.settings.map(([id, ic, lbl]) => (
              <NavItem key={id} id={id} icon={ic} label={lbl} active={page===id} col={col}
                onClick={() => go(id)}/>
            ))}
          </>
        )}
      </div>

      {/* ── User Footer & Quick Controls ── */}
      <div className="sidebar-footer">
        {!col && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
            padding: '8px 10px', background: 'var(--bg0)', borderRadius: 10,
            border: '1px solid var(--b0)'
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: `linear-gradient(135deg, ${rcfg.color}, #0284c7)`,
              display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12,
              color: '#000', flexShrink: 0, boxShadow: `0 0 12px ${rcfg.bg}`
            }}>
              {user?.av || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ fontSize: 10.5, color: rcfg.color, fontWeight: 600 }}>
                {rcfg.label}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: col ? 'center' : 'space-between', gap: 6 }}>
          <button
            className="btn bs bsm"
            onClick={() => setTheme(t => t==='dark'?'light':'dark')}
            title={`Switch to ${theme==='dark'?'light':'dark'} mode`}
            style={{ flex: col ? 'none' : 1, justifyContent: 'center' }}
          >
            <Ico n={theme==='dark'?'sun':'moon'} size={13} color="var(--am)"/>
            {!col && <span>{theme==='dark'?'Light':'Dark'}</span>}
          </button>

          <button
            className="btn br bsm"
            onClick={onLogout}
            title="Sign out of account"
            style={{ flex: col ? 'none' : 1, justifyContent: 'center' }}
          >
            <Ico n="logout" size={13}/>
            {!col && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active, col, onClick, badge, badgeColor }) {
  return (
    <div
      className={'ni' + (active?' act':'')}
      onClick={onClick}
      title={col ? label : undefined}
    >
      <Ico n={icon} size={16}/>
      {!col && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
      {!col && badge && (
        <span style={{
          marginLeft: 'auto', fontSize: 9, fontWeight: 800,
          letterSpacing: '.06em', color: badgeColor,
          background: `${badgeColor}18`, padding: '2px 6px',
          borderRadius: 6, border: `1px solid ${badgeColor}30`
        }}>
          {badge}
        </span>
      )}
    </div>
  )
}
