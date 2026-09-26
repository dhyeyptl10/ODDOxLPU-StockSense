import React, { useState } from 'react'
import { Ico, Modal, toast, ExportCSV, FilterPills } from '../components/UI.jsx'
import { fNum, fDate, prodName, whName } from '../store/index.js'
import { adjustmentsAPI, warehousesAPI, authAPI, setToken } from '../api.js'

// ── Adjustments ───────────────────────────────────────────────────────────────
export function Adjustments({ s, refresh }) {
  const { adjustments, products, warehouses } = s
  const [modal, setModal] = useState(false)
  const [busy,  setBusy]  = useState(false)
  const [q,     setQ]     = useState('')
  const [f, setF] = useState({ productId:products[0]?.id||'', warehouse:warehouses[0]?.id||'wh1', newQty:0, reason:'' })
  const fh = e => setF(x => ({ ...x, [e.target.name]: e.target.value }))

  const selP   = products.find(p => p.id===f.productId)
  const oldQty = (selP?.stock||{})[f.warehouse] || 0

  const filtered = adjustments.filter(a =>
    !q || (a.ref + ' ' + prodName(products, a.productId) + ' ' + (a.reason||'')).toLowerCase().includes(q.toLowerCase())
  )

  const openAdd = () => { setF({ productId:products[0]?.id||'', warehouse:warehouses[0]?.id||'wh1', newQty:0, reason:'' }); setModal(true) }

  const save = async () => {
    if (!f.reason) return toast('Audit reason is required for adjustments','e')
    setBusy(true)
    try {
      await adjustmentsAPI.create({ productId:f.productId, warehouseId:f.warehouse, newQty:Number(f.newQty), reason:f.reason })
      toast('Stock adjustment executed & physical count updated! ✅')
      setModal(false); await refresh()
    } catch(err) { toast(err.message,'e') } finally { setBusy(false) }
  }

  return (
    <div className="au">
      <div className="phd">
        <div>
          <div className="pt">Physical Count & Stock Adjustments</div>
          <div className="ps">{adjustments.length} audit reconciliations recorded</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ExportCSV
            data={adjustments.map(a => ({
              Ref: a.ref, Product: prodName(products, a.productId),
              Warehouse: whName(warehouses, a.warehouse), OldQty: a.oldQty,
              NewQty: a.newQty, Diff: Number(a.newQty) - Number(a.oldQty),
              Reason: a.reason, Date: a.date
            }))}
            filename="stock_adjustments.csv"
            title="Export Adjustments"
          />
          <button className="btn bp" onClick={openAdd}><Ico n="plus" size={14}/>New Adjustment</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="sr" style={{ width: 260 }}>
          <Ico n="search" size={14} color="var(--t2)"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search adjustments by SKU, reason..."/>
        </div>
        <span className="mono" style={{ fontSize: 11.5, color: 'var(--t2)' }}>{filtered.length} entries</span>
      </div>

      <div className="card au d1" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Ref</th>
              <th>Product SKU</th>
              <th>Warehouse Hub</th>
              <th style={{ textAlign: 'right' }}>Before Qty</th>
              <th style={{ textAlign: 'right' }}>Physical Count</th>
              <th style={{ textAlign: 'right' }}>Variance</th>
              <th>Reconciliation Reason</th>
              <th>Audit Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const diff = Number(a.newQty) - Number(a.oldQty)
              return (
                <tr key={a.id}>
                  <td className="mono" style={{ fontWeight: 800, color: 'var(--am)' }}>{a.ref}</td>
                  <td style={{ color: 'var(--t0)', fontWeight: 700 }}>{prodName(products, a.productId)}</td>
                  <td style={{ color: 'var(--t1)' }}>{whName(warehouses, a.warehouse)}</td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--t2)' }}>{fNum(a.oldQty)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--t0)' }}>{fNum(a.newQty)}</td>
                  <td className="mono" style={{ textAlign: 'right', color: diff > 0 ? 'var(--gn)' : diff < 0 ? 'var(--rd)' : 'var(--t2)', fontWeight: 800 }}>
                    {diff > 0 ? `+${fNum(diff)}` : fNum(diff)}
                  </td>
                  <td style={{ color: 'var(--t2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason}</td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>{fDate(a.date)}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty" style={{ padding: 48 }}>
                    <Ico n="refresh" size={36} color="var(--b1)"/>
                    <span style={{ color: 'var(--t0)', fontWeight: 700, marginTop: 8 }}>No adjustments recorded</span>
                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>Inventory counts match theoretical balances</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title="Physical Stock Count Adjustment"
          onClose={()=>setModal(false)}
          footer={
            <>
              <button className="btn bs" onClick={()=>setModal(false)}>Cancel</button>
              <button className="btn bp" onClick={save} disabled={busy}>
                <Ico n="check" size={14}/>
                {busy ? 'Applying...' : 'Apply Physical Adjustment'}
              </button>
            </>
          }
        >
          <div className="fg">
            <label className="lbl">Target Product SKU</label>
            <select className="inp" name="productId" value={f.productId} onChange={fh}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>
          <div className="fg">
            <label className="lbl">Warehouse Facility</label>
            <select className="inp" name="warehouse" value={f.warehouse} onChange={fh}>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          {selP && (
            <div className="card cp" style={{ marginBottom: 16, background: 'var(--bg0)', padding: '12px 16px' }}>
              <div className="fcb">
                <span style={{ fontSize: 12, color: 'var(--t2)' }}>System recorded quantity at {whName(warehouses, f.warehouse)}:</span>
                <span className="mono" style={{ fontSize: 18, fontWeight: 800, color: 'var(--cy)' }}>
                  {fNum(oldQty)} <span style={{ fontSize: 11, color: 'var(--t2)' }}>{selP.unit}</span>
                </span>
              </div>
            </div>
          )}
          <div className="fg">
            <label className="lbl">Actual Counted Physical Quantity *</label>
            <input className="inp" type="number" name="newQty" value={f.newQty} onChange={fh} min={0} placeholder="Enter actual count"/>
            {f.newQty !== '' && (
              <div style={{ fontSize: 12, marginTop: 6, fontWeight: 700, color: Number(f.newQty) > oldQty ? 'var(--gn)' : Number(f.newQty) < oldQty ? 'var(--rd)' : 'var(--t2)' }}>
                Adjustment Delta: {Number(f.newQty) > oldQty ? `+${Number(f.newQty)-oldQty}` : Number(f.newQty)-oldQty} units
              </div>
            )}
          </div>
          <div className="fg">
            <label className="lbl">Mandatory Audit Reason *</label>
            <input className="inp" name="reason" value={f.reason} onChange={fh} placeholder="e.g. End of Month Physical Cycle Count, Breakage, Misplacement"/>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Move History ──────────────────────────────────────────────────────────────
export function History({ s }) {
  const { movements, products, warehouses } = s
  const [type, setType] = useState('all')
  const [q,    setQ]    = useState('')

  const filtered = movements.filter(m => {
    const matchType = type === 'all' || m.type === type
    const matchQ    = !q || prodName(products, m.productId).toLowerCase().includes(q.toLowerCase()) || m.ref?.toLowerCase().includes(q.toLowerCase()) || m.contact?.toLowerCase().includes(q.toLowerCase())
    return matchType && matchQ
  })

  const TYPE_CLR = { receipt: 'var(--gn)', delivery: 'var(--rd)', transfer: 'var(--cy)', adjustment: 'var(--am)' }
  const TYPE_SYM = { receipt: '↑ Inbound', delivery: '↓ Dispatch', transfer: '⇄ Transfer', adjustment: '≠ Adj' }

  return (
    <div className="au">
      <div className="phd">
        <div>
          <div className="pt">Immutable Audit Ledger & Movement Stream</div>
          <div className="ps">{movements.length} total transactional events permanently logged</div>
        </div>
        <ExportCSV
          data={movements.map(m => ({
            Date: m.date, Type: m.type, Product: prodName(products, m.productId),
            Qty: m.qty, From: m.from, To: m.to, Ref: m.ref
          }))}
          filename="full_movement_ledger.csv"
          title="Export Ledger"
        />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginBottom: 16, flexWrap: 'wrap', background: 'var(--bg1)',
        padding: '12px 16px', borderRadius: 12, border: '1px solid var(--b0)'
      }}>
        <div className="sr" style={{ width: 240 }}>
          <Ico n="search" size={14} color="var(--t2)"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Filter by product, ref..."/>
        </div>

        <FilterPills
          active={type}
          onChange={setType}
          options={[
            { id: 'all',        label: 'All Movements' },
            { id: 'receipt',    label: 'Receipts (In)',    icon: 'inbox' },
            { id: 'delivery',   label: 'Deliveries (Out)', icon: 'send' },
            { id: 'transfer',   label: 'Transfers',        icon: 'arrow' },
            { id: 'adjustment', label: 'Adjustments',      icon: 'refresh' },
          ]}
        />
      </div>

      <div className="card au d1" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action Type</th>
              <th>Product SKU</th>
              <th style={{ textAlign: 'right' }}>Quantity</th>
              <th>Origin Hub</th>
              <th>Destination Hub</th>
              <th>Contact</th><th>Reference / Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id}>
                <td className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>{fDate(m.date)}</td>
                <td>
                  <span style={{
                    color: TYPE_CLR[m.type] || 'var(--t1)', fontWeight: 700, fontSize: 11,
                    background: `${TYPE_CLR[m.type]}18`, padding: '2px 7px', borderRadius: 6,
                    border: `1px solid ${TYPE_CLR[m.type]}30`
                  }}>
                    {TYPE_SYM[m.type] || m.type}
                  </span>
                </td>
                <td style={{ color: 'var(--t0)', fontWeight: 700 }}>{prodName(products, m.productId)}</td>
                <td className="mono" style={{ textAlign: 'right', color: m.qty > 0 ? 'var(--gn)' : m.qty < 0 ? 'var(--rd)' : 'var(--t1)', fontWeight: 800 }}>
                  {m.qty > 0 ? `+${fNum(m.qty)}` : fNum(m.qty)}
                </td>
                <td style={{ color: 'var(--t2)' }}>{m.from === '-' ? (m.type==='receipt'?m.contact:'—') : whName(warehouses, m.from)}</td>
                <td style={{ color: 'var(--t2)' }}>{m.to === '-' ? (m.type==='delivery'?m.contact:'—') : whName(warehouses, m.to)}</td>
                <td>{m.contact || 'Internal'}</td><td className="mono" style={{ color: 'var(--cy)', fontWeight: 700 }}>{m.ref || '—'}<div style={{fontSize:10,color:'var(--t2)'}}>Done</div></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty" style={{ padding: 48 }}>
                    <Ico n="list" size={36} color="var(--b1)"/>
                    <span style={{ color: 'var(--t0)', fontWeight: 700, marginTop: 8 }}>No movement records found</span>
                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>Execute receipts or deliveries to generate transactions</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Warehouses ────────────────────────────────────────────────────────────────
export function Warehouses({ s, refresh }) {
  const { warehouses, products } = s
  const [modal, setModal] = useState(null)
  const [busy,  setBusy]  = useState(false)
  const [f, setF] = useState({ name:'', location:'', shortCode:'', parentId:'' })
  const fh = e => setF(x => ({ ...x, [e.target.name]: e.target.value }))

  const save = async () => {
    if (!f.name) return toast('Facility name is required','e')
    setBusy(true)
    try {
      if (modal==='add') { await warehousesAPI.create({ name:f.name, location:f.location, shortCode:f.shortCode, parentId:f.parentId }); toast('Warehouse facility registered!') }
      else               { await warehousesAPI.update(modal.edit.id, { name:f.name, location:f.location, shortCode:f.shortCode, parentId:f.parentId }); toast('Warehouse updated!') }
      setModal(null); await refresh()
    } catch(err) { toast(err.message,'e') } finally { setBusy(false) }
  }

  const del = async id => {
    if (!confirm('Are you sure you want to decommission this warehouse?')) return
    try { await warehousesAPI.delete(id); toast('Warehouse removed'); await refresh() }
    catch(err) { toast(err.message,'e') }
  }

  const whStock = wid => products.reduce((a,p) => a+(p.stock[wid]||0), 0)

  return (
    <div className="au">
      <div className="phd">
        <div>
          <div className="pt">Warehouse Network & Facilities</div>
          <div className="ps">{warehouses.length} active logistical hubs configured</div>
        </div>
        <button className="btn bp" onClick={()=>{setF({name:'',location:'',shortCode:'',parentId:''});setModal('add')}}><Ico n="plus" size={14}/>Add Facility</button>
      </div>

      <div className="grid3 au d1">
        {warehouses.map(w => {
          const tot   = whStock(w.id)
          const prods = products.filter(p => (p.stock[w.id]||0)>0).length
          return (
            <div key={w.id} className="card cp cglow" style={{ padding: 22, position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                background: 'linear-gradient(90deg, var(--cy), var(--pu))'
              }}/>
              <div className="fcb" style={{ marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--cyd)', display: 'grid', placeItems: 'center', border: '1px solid var(--cyb)', boxShadow: '0 0 15px var(--cyd)' }}>
                  <Ico n="warehouse" size={20} color="var(--cy)"/>
                </div>
                <div className="fc g2">
                  <button className="btn bs bnr bsm" onClick={()=>{setF({name:w.name,location:w.location,shortCode:w.short_code||'',parentId:w.parent_id||''});setModal({edit:w})}} title="Edit warehouse"><Ico n="edit" size={13}/></button>
                  {warehouses.length > 1 && <button className="btn br bnr bsm" onClick={()=>del(w.id)} title="Delete warehouse"><Ico n="trash" size={13}/></button>}
                </div>
              </div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 17, color: 'var(--t0)', marginBottom: 4 }}>
                {w.name}
              </div>
              <div className="fc g2" style={{ marginBottom: 16 }}>
                <Ico n="tag" size={12} color="var(--t2)"/>
                <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 600 }}>{w.short_code} · {w.location || 'Central Location'}{w.parent_id ? ` · ${whName(warehouses,w.parent_id)}` : ''}</span>
              </div>
              <div className="cgl" style={{ marginBottom: 14 }}/>
              <div className="fcb">
                <div>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 800, color: 'var(--t0)' }}>{fNum(tot)}</div>
                  <div style={{ fontSize: 11, color: 'var(--t2)' }}>Total Stored Units</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 18, fontWeight: 800, color: 'var(--cy)' }}>{prods}</div>
                  <div style={{ fontSize: 11, color: 'var(--t2)' }}>Active SKUs</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <Modal
          title={modal==='add' ? 'Register New Warehouse' : `Edit Warehouse: ${modal.edit.name}`}
          onClose={()=>setModal(null)}
          footer={
            <>
              <button className="btn bs" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn bp" onClick={save} disabled={busy}>
                <Ico n="check" size={14}/>
                {busy ? 'Saving...' : modal==='add' ? 'Create Warehouse' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="grid2"><div className="fg"><label className="lbl">Short Code</label><input className="inp" name="shortCode" value={f.shortCode||''} onChange={fh} disabled={modal!=='add'} placeholder="WH / RACKA"/></div><div className="fg"><label className="lbl">Parent Warehouse (for a location)</label><select className="inp" name="parentId" value={f.parentId||''} onChange={fh} disabled={modal!=='add'}><option value="">Standalone warehouse</option>{warehouses.filter(w=>!w.parent_id).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></div></div>
          <div className="fg">
            <label className="lbl">Warehouse / Facility Name *</label>
            <input className="inp" name="name" value={f.name} onChange={fh} placeholder="e.g. North Terminal Logistics Hub"/>
          </div>
          <div className="fg">
            <label className="lbl">Physical Location / City</label>
            <input className="inp" name="location" value={f.location} onChange={fh} placeholder="e.g. Delhi NCR / Zone 4"/>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Profile ───────────────────────────────────────────────────────────────────
export function Profile({ user, setUser }) {
  const [phone,setPhone]=useState(user?.phone||''), [phoneCode,setPhoneCode]=useState(''), [phonePassword,setPhonePassword]=useState(''), [phoneBusy,setPhoneBusy]=useState(false)
  const phoneAction=async(verify)=>{if(phoneBusy)return;setPhoneBusy(true);try{const res=verify?await authAPI.verifyPhoneOtp({phone,code:phoneCode}):await authAPI.sendPhoneOtp({phone,currentPassword:phonePassword});if(verify)setUser(u=>({...u,phone:res.user.phone}));toast(verify?'WhatsApp recovery number verified':res.message)}catch(e){toast(e.message,'e')}finally{setPhoneBusy(false)}}
  const [f, setF] = useState({ name:user?.name||'', email:user?.email||'', role:user?.role||'', current:'', newPass:'', confirmPass:'' })
  const fh = e => setF(x => ({ ...x, [e.target.name]: e.target.value }))

  const saveProfile = async () => {
    try {
      const res = await authAPI.updateProfile({ name:f.name })
      setUser(u => ({ ...u, name:res.user.name, av:res.user.avatar||res.user.name.slice(0,2).toUpperCase() }))
      toast('Profile information updated!')
    } catch(err) { toast(err.message,'e') }
  }

  const savePass = async () => {
    if (!f.current)                  return toast('Enter your current password','e')
    if (f.newPass !== f.confirmPass) return toast('New passwords do not match','e')
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s]).{9,}/.test(f.newPass)) return toast('Use 9+ characters with uppercase, lowercase and special character','e')
    try {
      const result = await authAPI.changePassword(f.current, f.newPass)
      setToken(result.token)
      toast('Security credentials updated successfully!')
      setF(x => ({ ...x, current:'', newPass:'', confirmPass:'' }))
    } catch(err) { toast(err.message,'e') }
  }

  return (
    <div className="au">
      <div className="phd">
        <div>
          <div className="pt">User Profile & Security Settings</div>
          <div className="ps">Manage your account credentials, security preferences, and system telemetry</div>
        </div>
      </div>

      <div className="grid2" style={{ alignItems: 'start' }}>
        <div>
          <div className="card cp au d1" style={{ marginBottom: 16, padding: 24 }}>
            <div className="fc g3" style={{ marginBottom: 20 }}>
              <div style={{
                width: 62, height: 62, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--cy), #0284c7)',
                display: 'grid', placeItems: 'center', fontFamily: 'Syne, sans-serif',
                fontWeight: 800, fontSize: 22, color: '#000', flexShrink: 0,
                boxShadow: '0 0 25px rgba(0, 240, 255, 0.4)'
              }}>
                {user?.av || 'U'}
              </div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--t0)' }}>{user?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--cy)', fontWeight: 700, textTransform: 'capitalize' }}>{user?.role}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>{user?.email}</div>
              </div>
            </div>
            <div className="cgl" style={{ marginBottom: 16 }}/>
            <div className="fg"><label className="lbl">Login ID</label><input className="inp" value={user?.loginId||''} readOnly/></div>
            <div className="fg">
              <label className="lbl">Full Display Name</label>
              <input className="inp" name="name" value={f.name} onChange={fh}/>
            </div>
            <div className="fg">
              <label className="lbl">Registered Email Address</label>
              <input className="inp" name="email" type="email" value={f.email} onChange={fh} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}/>
            </div>
            <div className="fg">
              <label className="lbl">Assigned Role</label>
              <input className="inp" value={user?.role} disabled style={{ opacity: 0.6, cursor: 'not-allowed', textTransform: 'capitalize' }}/>
            </div>
            <button className="btn bp" onClick={saveProfile} style={{ width: '100%', justifyContent: 'center', padding: 10 }}>
              <Ico n="check" size={14}/> Save Profile Details
            </button>
          </div>
        </div>

        <div>
          <div className="card cp" style={{padding:24,marginBottom:16}}><h3>WhatsApp password recovery</h3><p>{user?.phone?`Verified: ${user.phone}`:'Verify a number you own to enable WhatsApp recovery.'}</p><label className="lbl">Phone with country code</label><input className="inp" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+919876543210"/><label className="lbl">Current password</label><input className="inp" type="password" value={phonePassword} onChange={e=>setPhonePassword(e.target.value)}/><button className="btn bs" disabled={phoneBusy} onClick={()=>phoneAction(false)}>Send WhatsApp code</button><label className="lbl">Verification code</label><input className="inp" value={phoneCode} onChange={e=>setPhoneCode(e.target.value)} maxLength={6} inputMode="numeric"/><button className="btn bp" disabled={phoneBusy} onClick={()=>phoneAction(true)}>Verify & link number</button></div>
          <div className="card cp au d2" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--t0)', marginBottom: 16 }}>
              Update Password
            </div>
            <div className="fg">
              <label className="lbl">Current Password</label>
              <input className="inp" name="current" type="password" value={f.current} onChange={fh} placeholder="Enter your current password"/>
            </div>
            <div className="fg">
              <label className="lbl">New Password</label>
              <input className="inp" name="newPass" type="password" value={f.newPass} onChange={fh} placeholder="9+ chars, uppercase, lowercase, special character"/>
            </div>
            <div className="fg">
              <label className="lbl">Confirm New Password</label>
              <input className="inp" name="confirmPass" type="password" value={f.confirmPass} onChange={fh} placeholder="Re-type new password"/>
            </div>
            <button className="btn bp" onClick={savePass} style={{ width: '100%', justifyContent: 'center', padding: 10 }}>
              <Ico n="lock" size={14}/> Update Security Password
            </button>
          </div>

          <div className="card cp au d3" style={{ padding: 20 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--t0)', marginBottom: 14 }}>
              System Runtime Environment
            </div>
            {[
              ['Platform Edition', 'CoreInventory v2.5 Enterprise'],
              ['Backend Engine',   'Express.js + JWT + OTP Reset'],
              ['Database',         'Node.js Built-in SQLite (node:sqlite)'],
              ['Client Framework', 'React 18 + Vite + Recharts'],
              ['Status',           'Live & Synchronized'],
            ].map(([k, v]) => (
              <div key={k} className="fcb" style={{ marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: 'var(--t2)' }}>{k}</span>
                <span className="mono" style={{ color: 'var(--t0)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
