import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal, toast } from './UI.jsx'
import { prodName, whName, fDate } from '../store/index.js'

// Optional workflow actions use the existing row and modal styling.
export function OperationTools({ row, api, type, s, user, refresh, busy }) {
  const [pending, setPending] = useState(false)
  const [printing, setPrinting] = useState(false)
  const canValidate = ['admin', 'manager'].includes(user?.role)
  const act = async fn => {
    if (pending || busy) return
    setPending(true)
    try { await fn(); await refresh() }
    catch (error) { toast(error.message, 'e'); await refresh() }
    finally { setPending(false) }
  }
  const document = <div className="operation-document">
    <h1>CoreInventory</h1><h2>{type.toUpperCase()} · {row.ref}</h2>
    <p>Status: Done · Scheduled: {fDate(row.date)}</p>
    <p>From: {row.supplier || whName(s.warehouses, row.from || row.warehouse)}</p>
    <p>To: {row.customer || whName(s.warehouses, row.to || row.warehouse)}</p>
    <p>Responsible: {row.responsible_name}</p><p>{row.delivery_address}</p>
    <table className="tbl"><thead><tr><th>Product</th><th>Quantity</th></tr></thead>
      <tbody>{row.items.map((item, index) => <tr key={index}><td>{prodName(s.products, item.productId)}</td><td>{item.qty}</td></tr>)}</tbody>
    </table><p>{row.notes}</p>
  </div>
  return <>
    {row.status === 'draft' && <button className="btn bs bsm" disabled={pending || busy} onClick={() => act(() => api.ready(row.id))}>To Do → Ready</button>}
    {row.status === 'waiting' && <button className="btn bs bsm" disabled={pending || busy} onClick={() => act(() => api.ready(row.id))}>Check Stock</button>}
    {type === 'delivery' && row.status === 'ready' && row.fulfillment_stage !== 'packed' && <button className="btn bs bsm" disabled={pending || busy} onClick={() => act(() => api.fulfillment(row.id, row.fulfillment_stage === 'picked' ? 'packed' : 'picked'))}>{row.fulfillment_stage === 'picked' ? 'Pack' : 'Pick'}</button>}
    {canValidate && !['done', 'canceled'].includes(row.status) && <button className="btn bs bsm" disabled={pending || busy} onClick={() => act(() => api.cancel(row.id))}>Cancel</button>}
    {row.status === 'done' && <button className="btn bs bsm" onClick={() => setPrinting(true)}>Print</button>}
    {printing && <>
      <Modal title={`Print ${row.ref}`} onClose={() => setPrinting(false)} wide footer={<button className="btn bp" onClick={() => window.print()}>Print / Save PDF</button>}>{document}</Modal>
      {createPortal(<div className="operation-print-root">{document}</div>, documentBody())}
    </>}
  </>
}
function documentBody() { return window.document.body }
