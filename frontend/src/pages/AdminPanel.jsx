import React, { useState, useEffect } from 'react'
import { Ico, Modal, toast, ExportCSV, FilterPills } from '../components/UI.jsx'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getToken = () => localStorage.getItem('ci_token')

const req = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

const ROLE_CONFIG = {
  admin:           { label:'Administrator', color:'#00f0ff', bg:'rgba(0, 240, 255, 0.12)', border:'rgba(0, 240, 255, 0.3)' },
  manager:         { label:'Inventory Manager', color:'#a78bfa', bg:'rgba(167, 139, 250, 0.12)', border:'rgba(167, 139, 250, 0.3)' },
  warehouse_staff: { label:'Warehouse Staff', color:'#10b981', bg:'rgba(16, 185, 129, 0.12)', border:'rgba(16, 185, 129, 0.3)' },
}

function RoleBadge({ role }) {
  const c = ROLE_CONFIG[role] || { label: role, color:'var(--t2)', bg:'var(--bg2)', border:'var(--b0)' }
  return (
    <span style={{ fontSize:10.5, fontWeight:800, color:c.color, background:c.bg, padding:'3px 9px', borderRadius:8, border:`1px solid ${c.border}`, textTransform:'uppercase', letterSpacing:'.04em' }}>
      {c.label}
    </span>
  )
}

export default function AdminPanel({ currentUserId }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState(null)
  const [addMode, setAddMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'warehouse_staff' })
  const h = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const load = async () => {
    setLoading(true)
    try {
      const d = await req('GET', '/users')
      setUsers(d.data || [])
    } catch(err) { toast(err.message, 'e') }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!editUser) return
    setBusy(true)
    try {
      await req('PUT', `/users/${editUser.id}`, { name: form.name, role: form.role })
      toast('User access & role updated successfully!')
      setEditUser(null)
      load()
    } catch(err) { toast(err.message, 'e') }
    setBusy(false)
  }

  const createUser = async () => {
    if (!form.name || !form.email || !form.password) { toast('All fields are required', 'e'); return }
    setBusy(true)
    try {
      await req('POST', '/users', { name: form.name, email: form.email, password: form.password, role: form.role })
      toast(`User account "${form.name}" generated!`)
      setAddMode(false)
      setForm({ name:'', email:'', password:'', role:'warehouse_staff' })
      load()
    } catch(err) { toast(err.message, 'e') }
    setBusy(false)
  }

  const toggleActive = async (u) => {
    if (u.id === currentUserId) { toast("Cannot deactivate your own active session", 'e'); return }
    setBusy(true)
    try {
      await req('PUT', `/users/${u.id}`, { is_active: u.is_active ? 0 : 1 })
      toast(u.is_active ? 'User account suspended' : 'User account reactivated')
      load()
    } catch(err) { toast(err.message, 'e') }
    setBusy(false)
  }

  const filtered = users.filter(u => {
    const matchQ = u.name.toLowerCase().includes(search.toLowerCase()) ||
                   u.email.toLowerCase().includes(search.toLowerCase()) ||
                   u.role.toLowerCase().includes(search.toLowerCase())
    const matchR = roleFilter === 'all' || u.role === roleFilter
    return matchQ && matchR
  })

  const stats = {
    total:    users.length,
    active:   users.filter(u => u.is_active).length,
    admins:   users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    staff:    users.filter(u => u.role === 'warehouse_staff').length,
  }

  return (
    <div className="au">
      {/* ── Header ── */}
      <div className="phd" style={{ marginBottom: 20 }}>
        <div>
          <div className="pt">User Management & Security Administration</div>
          <div className="ps">Manage organizational access, roles, and security authentication policies</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ExportCSV
            data={users.map(u => ({
              Name: u.name, Email: u.email, Role: u.role,
              Active: u.is_active ? 'Yes' : 'No', CreatedAt: u.created_at
            }))}
            filename="system_users.csv"
            title="Export Users"
          />
          <button className="btn bp" onClick={() => { setAddMode(true); setForm({ name:'', email:'', password:'', role:'warehouse_staff' }) }}>
            <Ico n="plus" size={14}/> Add New User
          </button>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid4" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Accounts', val: stats.total, sub: `${stats.active} active now`, color: 'var(--cy)', ic: 'user', icBg: 'var(--cyd)' },
          { label: 'System Admins',  val: stats.admins, sub: 'full permissions', color: '#00f0ff', ic: 'shield', icBg: 'rgba(0,240,255,0.1)' },
          { label: 'Operations Managers', val: stats.managers, sub: 'reports & approvals', color: '#a78bfa', ic: 'activity', icBg: 'rgba(167,139,250,0.1)' },
          { label: 'Warehouse Staff', val: stats.staff, sub: 'floor execution', color: '#10b981', ic: 'box', icBg: 'rgba(16,185,129,0.1)' },
        ].map((s, i) => (
          <div key={i} className={`kpi au d${i + 1}`}>
            <div className="ki" style={{ background: s.icBg }}><Ico n={s.ic} size={18} color={s.color}/></div>
            <div className="kv" style={{ color: s.color }}>{s.val}</div>
            <div className="kl">{s.label}</div>
            <div className="kt tm">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Filters & Controls ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginBottom: 16, flexWrap: 'wrap', background: 'var(--bg1)',
        padding: '12px 16px', borderRadius: 12, border: '1px solid var(--b0)'
      }}>
        <div className="sr" style={{ width: 240 }}>
          <Ico n="search" size={14} color="var(--t2)"/>
          <input
            placeholder="Search name, email, role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <FilterPills
          active={roleFilter}
          onChange={setRoleFilter}
          options={[
            { id: 'all',             label: 'All Users', count: users.length },
            { id: 'admin',           label: 'Admins', count: stats.admins, icon: 'shield' },
            { id: 'manager',         label: 'Managers', count: stats.managers, icon: 'activity' },
            { id: 'warehouse_staff', label: 'Staff', count: stats.staff, icon: 'box' },
          ]}
        />
      </div>

      {/* ── Users Table ── */}
      <div className="card au d1" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--t2)', fontSize: 13 }}>Loading users directory...</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>User Identity</th>
                <th>Email Address</th>
                <th>Security Role</th>
                <th>Account Status</th>
                <th>Registration Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--cy), #0284c7)',
                        display: 'grid', placeItems: 'center', fontSize: 12,
                        fontWeight: 800, color: '#000', flexShrink: 0,
                        boxShadow: '0 0 10px rgba(0,240,255,0.3)'
                      }}>
                        {u.avatar || u.name.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t0)' }}>{u.name}</div>
                        {u.id === currentUserId && (
                          <span style={{ fontSize: 10, color: 'var(--cy)', fontWeight: 700 }}>● Active Session</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--t1)' }}>{u.email}</td>
                  <td><RoleBadge role={u.role}/></td>
                  <td>
                    <span style={{
                      fontSize: 10.5, fontWeight: 800,
                      color: u.is_active ? 'var(--gn)' : 'var(--rd)',
                      background: u.is_active ? 'var(--gnd)' : 'var(--rdd)',
                      padding: '3px 8px', borderRadius: 6,
                      border: `1px solid ${u.is_active ? 'var(--gnb)' : 'var(--rdb)'}`
                    }}>
                      {u.is_active ? 'ACTIVE' : 'SUSPENDED'}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="fc g2" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn bs bnr bsm"
                        onClick={() => { setEditUser(u); setForm({ name:u.name, email:u.email, role:u.role, password:'' }) }}
                        title="Edit User Role"
                      >
                        <Ico n="edit" size={13}/>
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          className={`btn bnr bsm ${u.is_active ? 'br' : 'bg2'}`}
                          onClick={() => toggleActive(u)}
                          title={u.is_active ? 'Suspend Account' : 'Reactivate Account'}
                          disabled={busy}
                        >
                          <Ico n={u.is_active ? 'xCircle' : 'checkCircle'} size={13}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty" style={{ padding: 48 }}>
                      <Ico n="user" size={36} color="var(--b1)"/>
                      <span style={{ color: 'var(--t0)', fontWeight: 700, marginTop: 8 }}>No users matched</span>
                      <span style={{ fontSize: 12, color: 'var(--t2)' }}>Try adjusting your search query or role filter</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Edit User Modal ── */}
      {editUser && (
        <Modal
          title={`Edit User Access: ${editUser.name}`}
          onClose={() => setEditUser(null)}
          footer={
            <>
              <button className="btn bs" onClick={() => setEditUser(null)}>Cancel</button>
              <button className="btn bp" onClick={save} disabled={busy}>
                <Ico n="check" size={14}/>
                {busy ? 'Saving...' : 'Save User Access'}
              </button>
            </>
          }
        >
          <div className="fg">
            <label className="lbl">Full Name</label>
            <input className="inp" name="name" value={form.name} onChange={h} placeholder="User name"/>
          </div>
          <div className="fg">
            <label className="lbl">Email (Read-only)</label>
            <input className="inp" value={editUser.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}/>
          </div>
          <div className="fg">
            <label className="lbl">Security Role & Permission Tier</label>
            <select className="inp" name="role" value={form.role} onChange={h}>
              <option value="warehouse_staff">Warehouse Staff (Floor Operations)</option>
              <option value="manager">Inventory Manager (Analytics & Oversight)</option>
              <option value="admin">System Administrator (Full Control)</option>
            </select>
          </div>
        </Modal>
      )}

      {/* ── Add User Modal ── */}
      {addMode && (
        <Modal
          title="Create New System User Account"
          onClose={() => setAddMode(false)}
          footer={
            <>
              <button className="btn bs" onClick={() => setAddMode(false)}>Cancel</button>
              <button className="btn bp" onClick={createUser} disabled={busy}>
                <Ico n="check" size={14}/>
                {busy ? 'Creating...' : 'Create Account'}
              </button>
            </>
          }
        >
          <div className="fg">
            <label className="lbl">Full Name *</label>
            <input className="inp" name="name" value={form.name} onChange={h} placeholder="e.g. Alex Mercer"/>
          </div>
          <div className="fg">
            <label className="lbl">Email Address *</label>
            <input className="inp" name="email" type="email" value={form.email} onChange={h} placeholder="e.g. alex@coreinventory.io"/>
          </div>
          <div className="fg">
            <label className="lbl">Initial Password *</label>
            <input className="inp" name="password" type="password" value={form.password} onChange={h} placeholder="Minimum 6 characters"/>
          </div>
          <div className="fg">
            <label className="lbl">Role & Permissions *</label>
            <select className="inp" name="role" value={form.role} onChange={h}>
              <option value="warehouse_staff">Warehouse Staff</option>
              <option value="manager">Inventory Manager</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  )
}
