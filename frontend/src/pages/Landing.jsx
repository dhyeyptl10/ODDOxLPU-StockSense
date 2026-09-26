import React, { useState } from 'react'
import { Ico } from '../components/UI.jsx'

const ROLES = [
  {
    key: 'admin',
    label: 'Administrator',
    icon: 'shield',
    color: '#00f0ff',
    bg: 'rgba(0, 240, 255, 0.08)',
    border: 'rgba(0, 240, 255, 0.35)',
    glow: 'rgba(0, 240, 255, 0.25)',
    demo: 'admin@coreinventory.com',
    pass: 'admin123',
    badge: 'FULL ACCESS',
    desc: 'Complete system control including user management, warehouse configuration, audit ledgers, and all stock operations.',
    perms: ['User Management', 'All Stock Operations', 'System Configuration', 'Full Ledger Audit', 'Warehouse Control'],
  },
  {
    key: 'manager',
    label: 'Inventory Manager',
    icon: 'activity',
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.08)',
    border: 'rgba(167, 139, 250, 0.35)',
    glow: 'rgba(167, 139, 250, 0.22)',
    demo: 'manager@coreinventory.com',
    pass: 'manager123',
    badge: 'OPERATIONS & INTEL',
    desc: 'Oversee multi-warehouse stock levels, approve transfers, validate receipts & shipments, and analyze movement analytics.',
    perms: ['Validate Operations', 'Approve Transfers', 'Stock Intelligence', 'Warehouse Analysis', 'Movement Ledger'],
  },
  {
    key: 'staff',
    label: 'Warehouse Staff',
    icon: 'box',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.35)',
    glow: 'rgba(16, 185, 129, 0.20)',
    demo: 'staff@coreinventory.com',
    pass: 'staff123',
    badge: 'DAILY OPS',
    desc: 'Execute daily warehouse actions including receiving supplier shipments, picking delivery orders, and recording physical counts.',
    perms: ['Create Receipts', 'Create Deliveries', 'Stock Adjustments', 'Live SKU Lookup', 'Move History'],
  },
]

const FEATURES = [
  { icon: 'warehouse', title: 'Multi-Warehouse Network', desc: 'Sync and track stock across unlimited facilities in real-time with zero discrepancy.', color: 'var(--cy)' },
  { icon: 'activity',  title: 'Real-Time Analytics',     desc: 'Dynamic throughput charts, velocity analytics, and stock health meters.', color: 'var(--pu)' },
  { icon: 'shield',    title: 'Enterprise RBAC',         desc: 'Granular role-based access for Admins, Managers, and Warehouse Floor Staff.', color: 'var(--gn)' },
  { icon: 'send',      title: 'Double-Entry Ledger',      desc: 'Immutable audit trail for every incoming receipt, outgoing delivery, and transfer.', color: 'var(--am)' },
  { icon: 'refresh',   title: 'Instant Adjustments',     desc: 'Automated physical count reconciliation with delta tracking and audit reasons.', color: 'var(--rd)' },
  { icon: 'lock',      title: 'Secure JWT & OTP Reset',  desc: 'Secure authentication with email and verified WhatsApp OTP recovery.', color: 'var(--cy)' },
]

export default function Landing({ onSelectRole }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)', overflowX: 'hidden', position: 'relative' }}>
      {/* ── Ambient Glowing Background Orbs ── */}
      <div style={{
        position: 'fixed', top: '-15%', left: '-10%', width: 600, height: 600,
        background: 'radial-gradient(circle, rgba(0, 240, 255, 0.08), transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }}/>
      <div style={{
        position: 'fixed', bottom: '-15%', right: '-10%', width: 700, height: 700,
        background: 'radial-gradient(circle, rgba(167, 139, 250, 0.08), transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }}/>
      <div style={{
        position: 'fixed', top: '35%', right: '15%', width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05), transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }}/>

      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>

        {/* ── NAVBAR ── */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42,
              background: 'linear-gradient(135deg, var(--cy), #0284c7, var(--pu))',
              borderRadius: 12, display: 'grid', placeItems: 'center',
              boxShadow: '0 0 25px rgba(0, 240, 255, 0.35)', animation: 'glow 3s infinite alternate'
            }}>
              <Ico n="archive" size={20} color="white" stroke={2.2}/>
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--t0)', lineHeight: 1.1 }}>
                Core<span style={{ color: 'var(--cy)' }}>Inventory</span>
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--t2)', letterSpacing: '.14em', fontWeight: 700 }}>
                ENTERPRISE STOCK INTELLIGENCE
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              fontSize: 11, color: 'var(--t2)', background: 'var(--bg1)',
              border: '1px solid var(--b0)', padding: '6px 14px', borderRadius: 8,
              fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: 7
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gn)', boxShadow: '0 0 8px var(--gn)', animation: 'pulseBeacon 2s infinite' }}/>
              v2.5 LIVE ENGINE
            </div>
            <button className="btn bp" onClick={() => onSelectRole('login')}>
              <Ico n="user" size={14}/>
              <span>Sign In</span>
            </button>
          </div>
        </nav>

        {/* ── HERO SECTION ── */}
        <div style={{ textAlign: 'center', padding: '50px 0 40px', animation: 'up .5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0, 240, 255, 0.06)', border: '1px solid rgba(0, 240, 255, 0.25)',
            borderRadius: 30, padding: '6px 16px', marginBottom: 24, fontSize: 12, color: 'var(--cy)',
            boxShadow: '0 0 20px rgba(0, 240, 255, 0.1)'
          }}>
            <Ico n="sparkles" size={13} color="var(--cy)"/>
            <span>Next-Gen Real-Time Warehouse Management</span>
          </div>

          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: 'clamp(36px, 5.5vw, 62px)', color: 'var(--t0)',
            lineHeight: 1.1, marginBottom: 20, letterSpacing: '-0.02em'
          }}>
            Precision Inventory Control<br/>
            <span style={{
              background: 'linear-gradient(135deg, #00f0ff 10%, #38bdf8 50%, #a78bfa 90%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              Built For Scale & Speed
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(14px, 2vw, 16.5px)', color: 'var(--t1)',
            maxWidth: 620, margin: '0 auto 36px', lineHeight: 1.7
          }}>
            Experience flawless stock operations with automated receipts, delivery tracking, multi-warehouse transfers, real-time analytics, and role-based access control.
          </p>

          {/* Key Metrics Row */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 'clamp(16px, 4vw, 40px)',
            marginBottom: 44, flexWrap: 'wrap'
          }}>
            {[
              ['3', 'RBAC Roles', 'var(--cy)'],
              ['100%', 'Real-Time Sync', 'var(--gn)'],
              ['0 Discrepancy', 'Atomic Ledger', 'var(--pu)'],
              ['∞', 'Warehouses', 'var(--am)'],
            ].map(([val, lbl, clr]) => (
              <div key={lbl} style={{
                background: 'var(--bg1)', border: '1px solid var(--b0)',
                padding: '12px 22px', borderRadius: 12, textAlign: 'center', minWidth: 120
              }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: clr }}>{val}</div>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2, fontWeight: 600 }}>{lbl}</div>
              </div>
            ))}
          </div>

          {/* ── INTERACTIVE ROLE SELECTION CARDS ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11.5, color: 'var(--t2)', letterSpacing: '.12em',
              marginBottom: 20, fontWeight: 800, textTransform: 'uppercase'
            }}>
              SELECT A DEMO ROLE TO ENTER THE SYSTEM
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
              gap: 20, maxWidth: 1040, margin: '0 auto'
            }}>
              {ROLES.map((role, i) => {
                const isHov = hovered === role.key
                return (
                  <div
                    key={role.key}
                    onClick={() => onSelectRole(role.key)}
                    onMouseEnter={() => setHovered(role.key)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      background: isHov ? role.bg : 'var(--bg1)',
                      border: `1px solid ${isHov ? role.border : 'var(--b0)'}`,
                      borderRadius: 16,
                      padding: '26px 24px 22px',
                      cursor: 'pointer',
                      transition: 'all .25s cubic-bezier(0.16, 1, 0.3, 1)',
                      textAlign: 'left',
                      transform: isHov ? 'translateY(-6px)' : 'none',
                      boxShadow: isHov ? `0 16px 36px ${role.glow}` : '0 4px 15px rgba(0,0,0,.2)',
                      animation: `up .45s ease ${i * 0.08}s both`,
                      position: 'relative',
                      overflow: 'hidden',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    {/* Top indicator glow bar */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: `linear-gradient(90deg, ${role.color}, transparent)`,
                      opacity: isHov ? 1 : 0.4
                    }}/>

                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div style={{
                        width: 48, height: 48, background: role.bg, borderRadius: 13,
                        display: 'grid', placeItems: 'center', border: `1px solid ${role.border}`,
                        boxShadow: `0 0 15px ${role.bg}`
                      }}>
                        <Ico n={role.icon} size={22} color={role.color}/>
                      </div>

                      <div style={{
                        fontSize: 9.5, fontWeight: 800, letterSpacing: '.1em',
                        color: role.color, background: role.bg,
                        padding: '4px 10px', borderRadius: 20, border: `1px solid ${role.border}`
                      }}>
                        {role.badge}
                      </div>
                    </div>

                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--t0)', marginBottom: 8 }}>
                      {role.label}
                    </div>

                    <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 18 }}>
                      {role.desc}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                      {role.perms.map(p => (
                        <span key={p} style={{
                          fontSize: 10.5, color: role.color, background: role.bg,
                          padding: '3px 9px', borderRadius: 6, fontWeight: 700,
                          border: `1px solid ${role.border}`
                        }}>
                          {p}
                        </span>
                      ))}
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      paddingTop: 14, borderTop: '1px solid var(--b0)'
                    }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--t1)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{role.demo}</div>
                        <div style={{ fontSize: 10, color: 'var(--t2)' }}>Pass: {role.pass}</div>
                      </div>

                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12.5, fontWeight: 800, color: role.color,
                        background: role.bg, padding: '6px 12px', borderRadius: 8,
                        border: `1px solid ${role.border}`
                      }}>
                        <span>Launch</span>
                        <Ico n="chevron" size={13} color={role.color}/>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── FEATURES GRID ── */}
        <div style={{ padding: '30px 0 60px' }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{ fontSize: 11, color: 'var(--cy)', letterSpacing: '.12em', marginBottom: 8, fontWeight: 800, textTransform: 'uppercase' }}>
              POWERFUL ARCHITECTURE
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--t0)' }}>
              Engineered for Enterprise Warehouse Operations
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="card cp" style={{
                display: 'flex', gap: 16, alignItems: 'flex-start',
                animation: `up .4s ease ${i * 0.05}s both`
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 11, background: `${f.color}18`,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                  border: `1px solid ${f.color}28`
                }}>
                  <Ico n={f.icon} size={19} color={f.color}/>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--t0)', marginBottom: 5 }}>
                    {f.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6 }}>
                    {f.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          borderTop: '1px solid var(--b0)', padding: '24px 0 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, color: 'var(--t2)', flexWrap: 'wrap', gap: 12
        }}>
          <div>CoreInventory v2.5 · Enterprise Stock Management System</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <span>React + Vite + Express + SQLite</span>
            <span style={{ color: 'var(--cy)', fontWeight: 600 }}>Production Ready</span>
          </div>
        </div>

      </div>
    </div>
  )
}
