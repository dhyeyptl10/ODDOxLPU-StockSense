// Additive, repeatable migration. Never clears inventory or rewrites historical dates.
module.exports = function migrate(db) {
  const add = (table, name, definition) => {
    if (!db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
  }
  db.transaction(() => {
    add('users', 'login_id', 'TEXT')
    add('users', 'phone', 'TEXT')
    add('users', 'token_version', 'INTEGER NOT NULL DEFAULT 0')
    add('otp_codes', 'attempts', 'INTEGER NOT NULL DEFAULT 0')
    add('otp_codes', 'verified', 'INTEGER NOT NULL DEFAULT 0')
    add('otp_codes', 'channel', "TEXT NOT NULL DEFAULT 'email'")
    add('otp_codes', 'destination', 'TEXT')
    add('products', 'unit_cost', 'REAL NOT NULL DEFAULT 0')
    add('warehouses', 'short_code', 'TEXT')
    add('warehouses', 'parent_id', 'TEXT REFERENCES warehouses(id)')
    add('deliveries', 'delivery_address', 'TEXT')
    add('deliveries', 'fulfillment_stage', "TEXT NOT NULL DEFAULT 'pending'")
    db.exec('CREATE TABLE IF NOT EXISTS reference_sequences (prefix TEXT PRIMARY KEY, value INTEGER NOT NULL)')
    let index = 1
    for (const u of db.prepare('SELECT id, email FROM users WHERE login_id IS NULL').all()) {
      const preferred = ({'admin@coreinventory.com':'admin01','manager@coreinventory.com':'manager01','staff@coreinventory.com':'staff01'})[u.email]
      let login = preferred || `user${String(index++).padStart(6, '0')}`
      while (db.prepare('SELECT id FROM users WHERE login_id = ? COLLATE NOCASE').get(login)) login = `user${String(index++).padStart(6, '0')}`
      db.prepare('UPDATE users SET login_id = ? WHERE id = ?').run(login, u.id)
    }
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_login_unique ON users(login_id COLLATE NOCASE)')
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users(phone) WHERE phone IS NOT NULL')
    index = 1
    for (const w of db.prepare('SELECT id FROM warehouses WHERE short_code IS NULL ORDER BY created_at, id').all()) {
      let code = index === 1 ? 'WH' : `WH${index}`
      while (db.prepare('SELECT id FROM warehouses WHERE short_code = ?').get(code)) code = `WH${++index}`
      db.prepare('UPDATE warehouses SET short_code = ? WHERE id = ?').run(code, w.id)
      index++
    }
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS warehouse_code_unique ON warehouses(short_code COLLATE NOCASE)')
    for (const [table, op] of [['receipts','IN'], ['deliveries','OUT'], ['transfers','INT'], ['adjustments','ADJ']]) {
      for (const row of db.prepare(`SELECT * FROM ${table} ORDER BY created_at, id`).all()) {
        if (row.ref.includes('/')) continue
        const wh = db.prepare('SELECT short_code FROM warehouses WHERE id = ?').get(row.warehouse_id || row.from_warehouse)
        const prefix = `${wh?.short_code || 'WH'}/${op}`
        let n = Number(row.ref.match(/(\d+)$/)?.[1] || 1)
        let ref = `${prefix}/${String(n).padStart(4, '0')}`
        while (db.prepare(`SELECT id FROM ${table} WHERE ref = ?`).get(ref)) ref = `${prefix}/${String(++n).padStart(4, '0')}`
        db.prepare(`UPDATE ${table} SET ref = ? WHERE id = ?`).run(ref, row.id)
        db.prepare('UPDATE stock_movements SET ref = ? WHERE ref = ?').run(ref, row.ref)
      }
    }
    db.prepare("UPDATE receipts SET status = 'ready' WHERE status = 'waiting'").run()
  })()
}
