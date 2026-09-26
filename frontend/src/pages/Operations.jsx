import { OperationTools } from '../components/OperationTools.jsx'
import React, { useState } from 'react'
import { Ico, Bdg, Modal, toast, ItemEditor, ExportCSV, FilterPills } from '../components/UI.jsx'
import { SUPPLIERS, CUSTOMERS, toDay, fNum, fDate, prodName, whName } from '../store/index.js'
import { receiptsAPI, deliveriesAPI, transfersAPI } from '../api.js'

// ── Shared list wrapper ───────────────────────────────────────────────────────
function OpsTable({ icon, items, renderRow, tHead, exportName, exportData, onAdd, addTitle }) {
  const [q, setQ] = useState('')
  const [sf, setSf] = useState('all')
  const [view, setView] = useState('list')

  const filtered = items.filter(x => {
    const matchQ = !q || (x.ref+' '+(x.supplier||x.customer||'')+' '+(x.notes||'')).toLowerCase().includes(q.toLowerCase())
    const matchS = sf === 'all' || x.status === sf
    return matchQ && matchS
  })

  const countDraft = items.filter(i => i.status==='draft').length
  const countWait  = items.filter(i => i.status==='waiting').length
  const countReady = items.filter(i => i.status==='ready').length
  const countDone  = items.filter(i => i.status==='done').length

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginBottom: 16, flexWrap: 'wrap', background: 'var(--bg1)',
        padding: '12px 16px', borderRadius: 12, border: '1px solid var(--b0)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="sr" style={{ width: 240 }}>
            <Ico n="search" size={14} color="var(--t2)"/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search ref, party, notes..."/>
          </div>
          <button className="btn bs bsm" onClick={()=>setView(v=>v==='list'?'kanban':'list')}>{view==='list'?'Kanban View':'List View'}</button>
          {exportData && (
            <ExportCSV data={exportData} filename={`${exportName}.csv`} title="Export CSV"/>
          )}
        </div>

        <FilterPills
          active={sf}
          onChange={setSf}
          options={[
            { id: 'all',     label: 'All', count: items.length },
            { id: 'draft',   label: 'Draft', count: countDraft },
            { id: 'waiting', label: 'Waiting', count: countWait },
            { id: 'ready',   label: 'Ready', count: countReady },
            { id: 'done',    label: 'Done', count: countDone, icon: 'checkCircle' },
            { id: 'canceled', label:'Canceled', count:items.filter(i=>i.status==='canceled').length },
          ]}
        />
      </div>

      {view==='kanban' && <div style={{display:'flex',gap:12,overflowX:'auto',marginBottom:16}}>{['draft','waiting','ready','done','canceled'].map(status=><div key={status} className="card cp" style={{minWidth:220,flex:1}}><Bdg s={status}/>{filtered.filter(r=>r.status===status).map(r=><div key={r.id} style={{marginTop:12,padding:12,background:'var(--bg0)',borderRadius:8}}><b className="mono">{r.ref}</b><p>{r.supplier||r.customer||'Internal transfer'}</p><p>{fDate(r.date)}{r.late?' · Late':''}</p><button className="btn bs bsm" onClick={()=>{setQ(r.ref);setSf('all');setView('list')}}>View Operation</button></div>)}</div>)}</div>}
      <div className="card au d1" style={{ padding: 0, overflow: 'auto', display:view==='list'?'block':'none' }}>
        <table className="tbl">
          <thead>
            <tr>
              {tHead.map(h => <th key={h}>{h}</th>)}
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => renderRow(item))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={tHead.length + 1}>
                  <div className="empty" style={{ padding: 48 }}>
                    <Ico n={icon} size={36} color="var(--b1)"/>
                    <span style={{ color: 'var(--t0)', fontWeight: 700, marginTop: 8 }}>No operations found</span>
                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>No transaction matches the current filters</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Receipts ──────────────────────────────────────────────────────────────────
export function Receipts({ s, refresh, user }) {
  const { receipts, products, warehouses } = s
  const [modal, setModal] = useState(null)
  const [busy,  setBusy]  = useState(false)
  const blank = () => ({ supplier:SUPPLIERS[0], date:toDay(), notes:'', warehouse:warehouses[0]?.id||'wh1', items:[{productId:products[0]?.id||'',qty:1}] })
  const [f, setF] = useState(blank)
  const fh = e => setF(x => ({ ...x, [e.target.name]: e.target.value }))

  const openAdd  = () => { setF(blank()); setModal('add') }
  const openEdit = r  => { setF({ ...r, items: r.items.map(i=>({...i})) }); setModal({ edit:r }) }

  const save = async () => {
    if (!f.items.length) return toast('Add at least one item line','e')
    setBusy(true)
    try {
      const payload = { supplier:f.supplier, warehouseId:f.warehouse, date:f.date, notes:f.notes, status:'draft',
        items: f.items.map(i => ({ productId:i.productId, qty:Number(i.qty) })) }
      if (modal==='add') {
        await receiptsAPI.create(payload)
        toast('Inbound receipt record created!')
      } else {
        await receiptsAPI.update(modal.edit.id, payload)
        toast('Receipt order updated!')
      }
      setModal(null)
      await refresh()
    } catch(err) { toast(err.message,'e') } finally { setBusy(false) }
  }

  const validate = async id => {
    setBusy(true)
    try {
      await receiptsAPI.validate(id)
      toast('Receipt successfully received & stock updated! ✅')
      await refresh()
    } catch(err) { toast(err.message,'e') } finally { setBusy(false) }
  }

  const del = async id => {
    if (!confirm('Are you sure you want to delete this receipt?')) return
    try { await receiptsAPI.delete(id); toast('Receipt deleted'); await refresh() }
    catch(err) { toast(err.message,'e') }
  }

  return (
    <div className="au">
      <div className="phd">
        <div>
          <div className="pt">Inbound Supplier Receipts</div>
          <div className="ps">{receipts.length} incoming shipments tracked across facilities</div>
        </div>
        <button className="btn bp" onClick={openAdd}><Ico n="plus" size={14}/>New Inbound Receipt</button>
      </div>

      <OpsTable
        icon="inbox"
        items={receipts}
        exportName="inbound_receipts"
        exportData={receipts.map(r=>({ Ref:r.ref, Supplier:r.supplier, Warehouse:whName(warehouses,r.warehouse), Status:r.status, Date:r.date, ItemsCount:r.items?.length||0 }))}
        tHead={['Reference','Supplier & Warehouse','Received Items','Status','Date']}
        renderRow={r => (
          <tr key={r.id}>
            <td>
              <div className="mono" style={{ fontWeight: 800, color: 'var(--cy)' }}>{r.ref}</div>
              <div style={{ fontSize: 10.5, color: 'var(--t2)' }}>{whName(warehouses, r.warehouse)}</div>
            </td>
            <td>
              <div style={{ color: 'var(--t0)', fontWeight: 700, fontSize: 13 }}>{r.supplier}</div>
              {r.notes && <div style={{ fontSize: 11, color: 'var(--t2)' }}>{r.notes}</div>}
            </td>
            <td>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {r.items.map(i => (
                  <div key={i.productId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span className="mono" style={{ color: 'var(--gn)', fontWeight: 800 }}>+{fNum(i.qty)}</span>
                    <span style={{ color: 'var(--t1)' }}>{prodName(products, i.productId)}</span>
                  </div>
                ))}
              </div>
            </td>
            <td><Bdg s={r.status}/></td>
            <td className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>{fDate(r.date)}{r.late&&<div style={{color:'var(--rd)',fontSize:10}}>Late</div>}{r.waiting&&r.status!=='waiting'&&<div style={{color:'var(--am)',fontSize:10}}>Scheduled</div>}</td>
            <td style={{ textAlign: 'right' }}>
              <div className="fc g2" style={{ justifyContent: 'flex-end', flexWrap:'wrap' }}>
                <OperationTools row={r} api={receiptsAPI} type="receipt" s={s} user={user} refresh={refresh} busy={busy}/>
                {r.status==='ready' && ['admin','manager'].includes(user?.role) && (
                  <button className="btn bg2 bsm" onClick={()=>validate(r.id)} disabled={busy} title="Validate and add stock">
                    <Ico n="check" size={12}/> Receive
                  </button>
                )}
                {!['done','canceled'].includes(r.status) && <button className="btn bs bnr bsm" onClick={()=>openEdit(r)} title="Edit receipt"><Ico n="edit" size={13}/></button>}
                {['draft','canceled'].includes(r.status) && ['admin','manager'].includes(user?.role) && <button className="btn br bnr bsm" onClick={()=>del(r.id)} title="Delete receipt"><Ico n="trash" size={13}/></button>}
              </div>
            </td>
          </tr>
        )}
      />

      {modal && (
        <Modal
          title={modal==='add' ? 'New Inbound Receipt' : `Edit Receipt: ${modal.edit.ref}`}
          onClose={()=>setModal(null)}
          wide
          footer={
            <>
              <button className="btn bs" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn bp" onClick={save} disabled={busy}>
                <Ico n="check" size={14}/>
                {busy ? 'Saving...' : modal==='add' ? 'Create Receipt' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="fg"><label className="lbl">Responsible</label><input className="inp" readOnly value={modal?.edit?.responsible_name||user?.name||''}/></div>
          <div className="grid2">
            <div className="fg">
              <label className="lbl">Supplier Partner</label>
              <input className="inp" name="supplier" list="supplier-options" value={f.supplier} onChange={fh}/><datalist id="supplier-options">{SUPPLIERS.map(s=><option key={s} value={s}/>)}</datalist>
            </div>
            <div className="fg">
              <label className="lbl">Receiving Warehouse Hub</label>
              <select className="inp" name="warehouse" value={f.warehouse} onChange={fh}>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid2">
            <div className="fg">
              <label className="lbl">Scheduled Arrival Date</label>
              <input className="inp" type="date" name="date" value={f.date} onChange={fh}/>
            </div>
            <div className="fg">
              <label className="lbl">Shipment Notes / PO Reference</label>
              <input className="inp" name="notes" value={f.notes} onChange={fh} placeholder="Optional purchase order details"/>
            </div>
          </div>
          <div className="cgl" style={{ margin: '6px 0 16px' }}/>
          <ItemEditor items={f.items} setItems={update=>setF(x=>({...x,items:typeof update==='function'?update(x.items):update}))} products={products} warehouseId={f.warehouse} type="receipt"/>
        </Modal>
      )}
    </div>
  )
}

// ── Deliveries ────────────────────────────────────────────────────────────────
export function Deliveries({ s, refresh, user }) {
  const { deliveries, products, warehouses } = s
  const [modal, setModal] = useState(null)
  const [busy,  setBusy]  = useState(false)
  const blank = () => ({ customer:CUSTOMERS[0], date:toDay(), notes:'', warehouse:warehouses[0]?.id||'wh1', items:[{productId:products[0]?.id||'',qty:1}] })
  const [f, setF] = useState(blank)
  const fh = e => setF(x => ({ ...x, [e.target.name]: e.target.value }))

  const openAdd  = () => { setF(blank()); setModal('add') }
  const openEdit = r  => { setF({ ...r, items: r.items.map(i=>({...i})) }); setModal({ edit:r }) }

  const save = async () => {
    if (!f.items.length) return toast('Add at least one item line','e')
    setBusy(true)
    try {
      const payload = { customer:f.customer, warehouseId:f.warehouse, date:f.date, notes:f.notes, deliveryAddress:f.delivery_address||f.notes, status:'draft',
        items: f.items.map(i => ({ productId:i.productId, qty:Number(i.qty) })) }
      if (modal==='add') { await deliveriesAPI.create(payload); toast('Outbound delivery order created!') }
      else               { await deliveriesAPI.update(modal.edit.id, payload); toast('Delivery updated!') }
      setModal(null); await refresh()
    } catch(err) { toast(err.message,'e') } finally { setBusy(false) }
  }

  const validate = async id => {
    setBusy(true)
    try {
      await deliveriesAPI.validate(id)
      toast('Delivery dispatched & stock deducted! 🚀')
      await refresh()
    } catch(err) { toast(err.message,'e') } finally { setBusy(false) }
  }

  const del = async id => {
    if (!confirm('Are you sure you want to delete this delivery order?')) return
    try { await deliveriesAPI.delete(id); toast('Delivery order deleted'); await refresh() }
    catch(err) { toast(err.message,'e') }
  }

  return (
    <div className="au">
      <div className="phd">
        <div>
          <div className="pt">Outbound Customer Deliveries</div>
          <div className="ps">{deliveries.length} customer shipments and outgoing orders</div>
        </div>
        <button className="btn bp" onClick={openAdd}><Ico n="plus" size={14}/>New Outbound Delivery</button>
      </div>

      <OpsTable
        icon="send"
        items={deliveries}
        exportName="outbound_deliveries"
        exportData={deliveries.map(d=>({ Ref:d.ref, Customer:d.customer, Warehouse:whName(warehouses,d.warehouse), Status:d.status, Date:d.date, ItemsCount:d.items?.length||0 }))}
        tHead={['Reference','Customer & Source','Dispatched Items','Status','Date']}
        renderRow={r => (
          <tr key={r.id}>
            <td>
              <div className="mono" style={{ fontWeight: 800, color: 'var(--gn)' }}>{r.ref}</div>
              <div style={{ fontSize: 10.5, color: 'var(--t2)' }}>{whName(warehouses, r.warehouse)}</div>
            </td>
            <td>
              <div style={{ color: 'var(--t0)', fontWeight: 700, fontSize: 13 }}>{r.customer}</div>
              {r.notes && <div style={{ fontSize: 11, color: 'var(--t2)' }}>{r.notes}</div>}
            </td>
            <td>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {r.items.map(i => (
                  <div key={i.productId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span className="mono" style={{ color: 'var(--rd)', fontWeight: 800 }}>−{fNum(i.qty)}</span>
                    <span style={{ color: i.available<i.qty&&r.status!=='done'?'var(--rd)':'var(--t1)' }}>{prodName(products, i.productId)}{i.available<i.qty&&r.status!=='done'?` (available ${i.available})`:''}</span>
                  </div>
                ))}
              </div>
            </td>
            <td><Bdg s={r.status}/>{r.status==='ready'&&<div style={{fontSize:10,color:'var(--t2)'}}>{r.fulfillment_stage}</div>}{r.status==='waiting'&&<div style={{fontSize:10,color:'var(--rd)'}}>Insufficient stock</div>}</td>
            <td className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>{fDate(r.date)}{r.late&&<div style={{color:'var(--rd)',fontSize:10}}>Late</div>}{r.waiting&&r.status!=='waiting'&&<div style={{color:'var(--am)',fontSize:10}}>Scheduled</div>}</td>
            <td style={{ textAlign: 'right' }}>
              <div className="fc g2" style={{ justifyContent: 'flex-end', flexWrap:'wrap' }}>
                <OperationTools row={r} api={deliveriesAPI} type="delivery" s={s} user={user} refresh={refresh} busy={busy}/>
                {r.status==='ready' && ['admin','manager'].includes(user?.role) && r.fulfillment_stage==='packed' && (
                  <button className="btn bg2 bsm" onClick={()=>validate(r.id)} disabled={busy} title="Pick and dispatch shipment">
                    <Ico n="send" size={12}/> Dispatch
                  </button>
                )}
                {!['done','canceled'].includes(r.status) && <button className="btn bs bnr bsm" onClick={()=>openEdit(r)} title="Edit delivery"><Ico n="edit" size={13}/></button>}
                {['draft','canceled'].includes(r.status) && ['admin','manager'].includes(user?.role) && <button className="btn br bnr bsm" onClick={()=>del(r.id)} title="Delete delivery"><Ico n="trash" size={13}/></button>}
              </div>
            </td>
          </tr>
        )}
      />

      {modal && (
        <Modal
          title={modal==='add' ? 'New Outbound Delivery Order' : `Edit Delivery: ${modal.edit.ref}`}
          onClose={()=>setModal(null)}
          wide
          footer={
            <>
              <button className="btn bs" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn bp" onClick={save} disabled={busy}>
                <Ico n="check" size={14}/>
                {busy ? 'Saving...' : modal==='add' ? 'Create Delivery' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="fg"><label className="lbl">Responsible</label><input className="inp" readOnly value={modal?.edit?.responsible_name||user?.name||''}/></div>
          <div className="grid2">
            <div className="fg">
              <label className="lbl">Customer Recipient</label>
              <input className="inp" name="customer" list="customer-options" value={f.customer} onChange={fh}/><datalist id="customer-options">{CUSTOMERS.map(c=><option key={c} value={c}/>)}</datalist>
            </div>
            <div className="fg">
              <label className="lbl">Source Warehouse</label>
              <select className="inp" name="warehouse" value={f.warehouse} onChange={fh}>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid2">
            <div className="fg">
              <label className="lbl">Fulfillment Date</label>
              <input className="inp" type="date" name="date" value={f.date} onChange={fh}/>
            </div>
            <div className="fg">
              <label className="lbl">Delivery Instructions / Address</label>
              <input className="inp" name="notes" value={f.notes} onChange={fh} placeholder="Optional customer notes"/>
            </div>
          </div>
          <div className="cgl" style={{ margin: '6px 0 16px' }}/>
          <ItemEditor items={f.items} setItems={update=>setF(x=>({...x,items:typeof update==='function'?update(x.items):update}))} products={products} warehouseId={f.warehouse} type="delivery"/>
        </Modal>
      )}
    </div>
  )
}

// ── Transfers ─────────────────────────────────────────────────────────────────
export function Transfers({ s, refresh, user }) {
  const { transfers, products, warehouses } = s
  const [modal, setModal] = useState(null)
  const [busy,  setBusy]  = useState(false)
  const blank = () => ({ from:warehouses[0]?.id||'wh1', to:warehouses[1]?.id||'wh2', date:toDay(), notes:'', items:[{productId:products[0]?.id||'',qty:1}] })
  const [f, setF] = useState(blank)
  const fh = e => setF(x => ({ ...x, [e.target.name]: e.target.value }))

  const openAdd  = () => { setF(blank()); setModal('add') }
  const openEdit = r  => { setF({ ...r, items: r.items.map(i=>({...i})) }); setModal({ edit:r }) }

  const save = async () => {
    if (f.from === f.to) return toast('Source and destination warehouses must be different', 'e')
    if (!f.items.length) return toast('Add at least one item line', 'e')
    setBusy(true)
    try {
      const payload = { fromWarehouse:f.from, toWarehouse:f.to, date:f.date, notes:f.notes, status:'draft',
        items: f.items.map(i => ({ productId:i.productId, qty:Number(i.qty) })) }
      if (modal==='add') { await transfersAPI.create(payload); toast('Transfer order initiated!') }
      else               { await transfersAPI.update(modal.edit.id, payload); toast('Transfer updated!') }
      setModal(null); await refresh()
    } catch(err) { toast(err.message,'e') } finally { setBusy(false) }
  }

  const validate = async id => {
    setBusy(true)
    try {
      await transfersAPI.validate(id)
      toast('Transfer executed & stock relocated across warehouses! ⇄')
      await refresh()
    } catch(err) { toast(err.message,'e') } finally { setBusy(false) }
  }

  const del = async id => {
    if (!confirm('Are you sure you want to delete this transfer?')) return
    try { await transfersAPI.delete(id); toast('Transfer deleted'); await refresh() }
    catch(err) { toast(err.message,'e') }
  }

  return (
    <div className="au">
      <div className="phd">
        <div>
          <div className="pt">Internal Warehouse Transfers</div>
          <div className="ps">{transfers.length} inter-facility inventory movements</div>
        </div>
        <button className="btn bp" onClick={openAdd}><Ico n="plus" size={14}/>New Internal Transfer</button>
      </div>

      <OpsTable
        icon="arrow"
        items={transfers}
        exportName="warehouse_transfers"
        exportData={transfers.map(t=>({ Ref:t.ref, From:whName(warehouses,t.from), To:whName(warehouses,t.to), Status:t.status, Date:t.date, ItemsCount:t.items?.length||0 }))}
        tHead={['Reference','Origin & Destination Route','Transfer Items','Status','Date']}
        renderRow={r => (
          <tr key={r.id}>
            <td className="mono" style={{ fontWeight: 800, color: 'var(--pu)' }}>{r.ref}</td>
            <td>
              <div className="fc g2">
                <span style={{ fontSize: 12, color: 'var(--t0)', fontWeight: 600 }}>{whName(warehouses, r.from)}</span>
                <Ico n="chevron" size={12} color="var(--cy)"/>
                <span style={{ fontSize: 12, color: 'var(--cy)', fontWeight: 600 }}>{whName(warehouses, r.to)}</span>
              </div>
              {r.notes && <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>{r.notes}</div>}
            </td>
            <td>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {r.items.map(i => (
                  <div key={i.productId} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span className="mono" style={{ color: 'var(--pu)', fontWeight: 800 }}>⇄ {fNum(i.qty)}</span>
                    <span style={{ color: 'var(--t1)' }}>{prodName(products, i.productId)}</span>
                  </div>
                ))}
              </div>
            </td>
            <td><Bdg s={r.status}/></td>
            <td className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>{fDate(r.date)}{r.late&&<div style={{color:'var(--rd)',fontSize:10}}>Late</div>}{r.waiting&&r.status!=='waiting'&&<div style={{color:'var(--am)',fontSize:10}}>Scheduled</div>}</td>
            <td style={{ textAlign: 'right' }}>
              <div className="fc g2" style={{ justifyContent: 'flex-end', flexWrap:'wrap' }}>
                <OperationTools row={r} api={transfersAPI} type="transfer" s={s} user={user} refresh={refresh} busy={busy}/>
                {r.status==='ready' && ['admin','manager'].includes(user?.role) && (
                  <button className="btn bg2 bsm" onClick={()=>validate(r.id)} disabled={busy} title="Execute stock transfer">
                    <Ico n="check" size={12}/> Transfer
                  </button>
                )}
                {!['done','canceled'].includes(r.status) && <button className="btn bs bnr bsm" onClick={()=>openEdit(r)} title="Edit transfer"><Ico n="edit" size={13}/></button>}
                {['draft','canceled'].includes(r.status) && ['admin','manager'].includes(user?.role) && <button className="btn br bnr bsm" onClick={()=>del(r.id)} title="Delete transfer"><Ico n="trash" size={13}/></button>}
              </div>
            </td>
          </tr>
        )}
      />

      {modal && (
        <Modal
          title={modal==='add' ? 'New Inter-Facility Transfer' : `Edit Transfer: ${modal.edit.ref}`}
          onClose={()=>setModal(null)}
          wide
          footer={
            <>
              <button className="btn bs" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn bp" onClick={save} disabled={busy}>
                <Ico n="check" size={14}/>
                {busy ? 'Saving...' : modal==='add' ? 'Initiate Transfer' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="fg"><label className="lbl">Responsible</label><input className="inp" readOnly value={modal?.edit?.responsible_name||user?.name||''}/></div>
          <div className="grid2">
            <div className="fg">
              <label className="lbl">Source Warehouse (From)</label>
              <select className="inp" name="from" value={f.from} onChange={fh}>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Destination Warehouse (To)</label>
              <select className="inp" name="to" value={f.to} onChange={fh}>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid2">
            <div className="fg">
              <label className="lbl">Transfer Date</label>
              <input className="inp" type="date" name="date" value={f.date} onChange={fh}/>
            </div>
            <div className="fg">
              <label className="lbl">Transfer Reason / Work Order</label>
              <input className="inp" name="notes" value={f.notes} onChange={fh} placeholder="e.g. Replenishing Central Hub"/>
            </div>
          </div>
          <div className="cgl" style={{ margin: '6px 0 16px' }}/>
          <ItemEditor items={f.items} setItems={update=>setF(x=>({...x,items:typeof update==='function'?update(x.items):update}))} products={products} warehouseId={f.from} type="transfer"/>
        </Modal>
      )}
    </div>
  )
}
