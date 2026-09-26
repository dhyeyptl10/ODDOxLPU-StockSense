// ── Constants ────────────────────────────────────────────────────────────────
export const CATS   = ['Raw Materials','Furniture','Electronics','Spare Parts','Packaging','Chemicals','Textiles']
export const UNITS  = ['kg','pieces','liters','meters','boxes','sets','tons']
export const SUPPLIERS = ['SteelCo Ltd','FurniWorld','TechParts Inc','ChemBase Corp','TextileMart','MetalWorks Co']
export const CUSTOMERS = ['Acme Corp','BuildRight Ltd','TechSolutions','HomeMakers Co','GreenBuild','CityFurniture']
export const STATUSES  = ['draft','waiting','ready','done','canceled']

// ── Helpers ──────────────────────────────────────────────────────────────────
export const makeId  = (p='') => p + Date.now().toString(36) + Math.random().toString(36).slice(2,5)
export const toDay   = ()     => new Intl.DateTimeFormat('en-CA', {timeZone:import.meta.env.VITE_INVENTORY_TIMEZONE || 'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
export const fDate   = (d)    => { try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) } catch(e) { return d } }
export const fNum    = (n)    => Number(n||0).toLocaleString('en-IN')

export const totalStock  = p  => Object.values(p.stock||{}).reduce((a,b) => a+b, 0)
export const stockStatus = p  => { const t=totalStock(p); if(t===0) return 'out'; if(t<=p.reorderLevel) return 'low'; return 'ok' }
export const whName  = (whs,id) => whs.find(w => w.id===id)?.name || id
export const prodName= (ps, id) => ps.find(p  => p.id===id)?.name || id
export const nextRef = (list, prefix) => {
  const nums = list.map(x => { const m=x.ref?.match(/(\d+)$/); return m ? parseInt(m[1]) : 0 })
  return `${prefix}-${String(Math.max(0,...nums)+1).padStart(3,'0')}`
}

// Application state always comes from the backend. Demo records live only in the explicit seed.
export const INIT = {warehouses:[],products:[],receipts:[],deliveries:[],transfers:[],adjustments:[],movements:[]}
export function reducer(state, action) {
  return action.type === 'HYDRATE' ? action.payload : state
}
