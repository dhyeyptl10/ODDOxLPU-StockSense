import React, { useState } from 'react'
import { Ico, Bdg, Modal, toast, ExportCSV, FilterPills } from '../components/UI.jsx'
import { CATS, UNITS, totalStock, stockStatus, fNum, fDate } from '../store/index.js'
import { productsAPI } from '../api.js'

export default function Products({ s, refresh, setPage }) {
  const { products, warehouses } = s
  const [q,        setQ]        = useState('')
  const [cat,      setCat]      = useState('')
  const [statusF,  setStatusF]  = useState('all')
  const [modal,    setModal]    = useState(null)
  const [busy,     setBusy]     = useState(false)
  const [f, setF] = useState({ name:'', sku:'', category:'Raw Materials', unit:'pieces', reorderLevel:10, description:'', unitCost:0 })
  const fh = e => setF(x => ({ ...x, [e.target.name]: e.target.value }))

  const filtered = products.filter(p => {
    const st = stockStatus(p)
    const matchQ = !q || (p.name+p.sku+p.category).toLowerCase().includes(q.toLowerCase())
    const matchCat = !cat || p.category === cat
    const matchStatus = statusF === 'all' || st === statusF
    return matchQ && matchCat && matchStatus
  })

  const countOk  = products.filter(p => stockStatus(p)==='ok').length
  const countLow = products.filter(p => stockStatus(p)==='low').length
  const countOut = products.filter(p => stockStatus(p)==='out').length

  const openAdd  = () => { setF({ name:'', sku:'', category:'Raw Materials', unit:'pieces', reorderLevel:10, description:'', unitCost:0 }); setModal('add') }
  const openEdit = p  => { setF({ name:p.name, sku:p.sku, category:p.category, unit:p.unit, reorderLevel:p.reorderLevel, description:p.description||'', unitCost:p.unit_cost||0 }); setModal({ edit:p }) }

  const save = async () => {
    if (!f.name || !f.sku) return toast('Name and SKU required','e')
    setBusy(true)
    try {
      const payload = { name:f.name, sku:f.sku, category:f.category, unit:f.unit, reorderLevel:Number(f.reorderLevel), description:f.description, unitCost:Number(f.unitCost) }
      if (modal==='add') { await productsAPI.create(payload); toast('Product catalog item created!') }
      else               { await productsAPI.update(modal.edit.id, payload); toast('Product updated successfully!') }
      setModal(null); await refresh()
    } catch(err) { toast(err.message,'e') } finally { setBusy(false) }
  }

  const del = async id => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try { await productsAPI.delete(id); toast('Product removed from catalog'); await refresh() }
    catch(err) { toast(err.message,'e') }
  }

  return (
    <div className="au">
      {/* ── Page Header ── */}
      <div className="phd">
        <div>
          <div className="pt">Product Catalog & Master Inventory</div>
          <div className="ps">{products.length} registered SKUs across {warehouses.length} active warehouse facilities</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <ExportCSV
            data={products.map(p => ({
              Name: p.name, SKU: p.sku, Category: p.category, Unit: p.unit,
              TotalStock: totalStock(p), Status: stockStatus(p), ReorderLevel: p.reorderLevel
            }))}
            filename="products_catalog.csv"
            title="Export Products"
          />
          <button className="btn bs" onClick={()=>setPage('adjustments')}>Update stock / Adjustment</button><button className="btn bp" onClick={openAdd}><Ico n="plus" size={14}/>New Product</button>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginBottom: 16, flexWrap: 'wrap', background: 'var(--bg1)',
        padding: '12px 16px', borderRadius: 12, border: '1px solid var(--b0)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="sr" style={{ width: 240 }}>
            <Ico n="search" size={14} color="var(--t2)"/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, SKU..."/>
          </div>

          <select className="inp" value={cat} onChange={e=>setCat(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
            <option value="">All Categories</option>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Filter Pills */}
        <FilterPills
          active={statusF}
          onChange={setStatusF}
          options={[
            { id: 'all', label: 'All SKUs', count: products.length },
            { id: 'ok',  label: 'In Stock', count: countOk, icon: 'checkCircle' },
            { id: 'low', label: 'Low Stock', count: countLow, icon: 'alert' },
            { id: 'out', label: 'Out of Stock', count: countOut, icon: 'xCircle' },
          ]}
        />
      </div>

      {/* ── Products Table ── */}
      <div className="card au d1" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Product SKU</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Unit Cost (INR)</th><th>Free To Use</th><th style={{ textAlign: 'right' }}>On Hand</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Reorder Level</th>
              <th>Registered</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const tot = totalStock(p)
              const st  = stockStatus(p)
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--t0)', fontSize: 13 }}>{p.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--cy)' }}>{p.sku}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: 11, background: 'var(--bg0)', padding: '3px 8px', borderRadius: 6, color: 'var(--t1)', border: '1px solid var(--b0)', fontWeight: 600 }}>
                      {p.category}
                    </span>
                  </td>
                  <td style={{ color: 'var(--t2)', fontSize: 12 }}>{p.unit}</td>
                  <td className="mono">{fNum(p.unit_cost)}</td><td className="mono">{fNum(p.freeToUse ?? tot)}</td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 800, fontSize: 13.5, color: 'var(--t0)' }}>
                    {fNum(tot)} <span style={{ fontSize: 10.5, color: 'var(--t2)', fontWeight: 400 }}>{p.unit}</span>
                  </td>
                  <td><Bdg s={st}/></td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--t2)', fontSize: 12 }}>
                    {fNum(p.reorderLevel)}
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: 'var(--t2)' }}>
                    {fDate(p.createdAt)}
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div className="fc g2" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn bs bnr bsm" onClick={()=>openEdit(p)} title="Edit product"><Ico n="edit" size={13}/></button>
                      <button className="btn br bnr bsm" onClick={()=>del(p.id)} title="Delete product"><Ico n="trash" size={13}/></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10}>
                  <div className="empty" style={{ padding: 48 }}>
                    <Ico n="box" size={36} color="var(--b1)"/>
                    <span style={{ color: 'var(--t0)', fontWeight: 700, marginTop: 8 }}>No products found</span>
                    <span style={{ fontSize: 12, color: 'var(--t2)' }}>Try changing your filters or add a new product item</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Product Create / Edit Modal ── */}
      {modal && (
        <Modal
          title={modal==='add' ? 'Create Master Product SKU' : `Edit Product: ${modal.edit.name}`}
          onClose={()=>setModal(null)}
          wide
          footer={
            <>
              <button className="btn bs" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn bp" onClick={save} disabled={busy}>
                <Ico n="check" size={14}/>
                {busy ? 'Saving...' : modal==='add' ? 'Create Product' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="grid2">
            <div className="fg">
              <label className="lbl">Product Name *</label>
              <input className="inp" name="name" value={f.name} onChange={fh} placeholder="e.g. Precision Industrial Bearing"/>
            </div>
            <div className="fg">
              <label className="lbl">SKU / Catalog Code *</label>
              <input className="inp" name="sku" value={f.sku} onChange={fh} placeholder="e.g. BRG-9901"/>
            </div>
          </div>
          <div className="grid2">
            <div className="fg">
              <label className="lbl">Product Category</label>
              <select className="inp" name="category" value={f.category} onChange={fh}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Unit of Measure</label>
              <select className="inp" name="unit" value={f.unit} onChange={fh}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="fg"><label className="lbl">Per Unit Cost (INR)</label><input className="inp" name="unitCost" type="number" min="0" step="0.01" value={f.unitCost} onChange={fh}/></div>
          <div className="grid2">
            <div className="fg">
              <label className="lbl">Reorder Safety Level</label>
              <input className="inp" type="number" name="reorderLevel" value={f.reorderLevel} onChange={fh} min={0} placeholder="Minimum threshold"/>
            </div>
            <div className="fg">
              <label className="lbl">Description / Notes</label>
              <input className="inp" name="description" value={f.description} onChange={fh} placeholder="Optional details or manufacturer specs"/>
            </div>
          </div>

          {modal!=='add' && modal.edit && (
            <div className="card cp" style={{ marginTop: 12, background: 'var(--bg0)', padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t2)', marginBottom: 10, letterSpacing: '.07em', textTransform: 'uppercase' }}>
                Stock Breakdown Per Facility
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                {warehouses.map(w => (
                  <div key={w.id} style={{ padding: '8px 12px', background: 'var(--bg1)', borderRadius: 8, border: '1px solid var(--b0)' }}>
                    <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 2 }}>{w.name}</div>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 800, color: 'var(--t0)' }}>
                      {fNum(modal.edit.stock[w.id]||0)} <span style={{ fontSize: 10, color: 'var(--t2)' }}>{modal.edit.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
