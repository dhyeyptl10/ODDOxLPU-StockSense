// db/database.js — SQLite using Node.js built-in node:sqlite (v22+)
// No external native dependencies required!
const { DatabaseSync } = require('node:sqlite')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

// DB defaults to backend/db/coreinventory.db regardless of where node is invoked
const dbFile = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, 'coreinventory.db')

const db = new DatabaseSync(dbFile)

// WAL mode + foreign keys
// WAL mode removed for node:sqlite compat — using default DELETE mode
db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL")

// ── transaction() shim matching better-sqlite3 API ───────────────────────────
db.transaction = (fn) => (...args) => {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn(...args)
    db.exec('COMMIT')
    return result
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

// ─── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'warehouse_staff',
    avatar      TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS otp_codes (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL,
    code        TEXT NOT NULL,
    purpose     TEXT NOT NULL DEFAULT 'reset',
    expires_at  TEXT NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS warehouses (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    location    TEXT,
    description TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    sku           TEXT NOT NULL UNIQUE,
    category      TEXT NOT NULL,
    unit          TEXT NOT NULL,
    reorder_level INTEGER NOT NULL DEFAULT 0,
    description   TEXT,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS product_stock (
    product_id    TEXT NOT NULL,
    warehouse_id  TEXT NOT NULL,
    quantity      INTEGER NOT NULL DEFAULT 0,
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY   (product_id, warehouse_id),
    FOREIGN KEY   (product_id)   REFERENCES products(id)   ON DELETE CASCADE,
    FOREIGN KEY   (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS receipts (
    id           TEXT PRIMARY KEY,
    ref          TEXT NOT NULL UNIQUE,
    supplier     TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'draft',
    date         TEXT NOT NULL,
    notes        TEXT,
    created_by   TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY  (warehouse_id) REFERENCES warehouses(id)
  );

  CREATE TABLE IF NOT EXISTS receipt_items (
    id          TEXT PRIMARY KEY,
    receipt_id  TEXT NOT NULL,
    product_id  TEXT NOT NULL,
    qty         INTEGER NOT NULL,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS deliveries (
    id           TEXT PRIMARY KEY,
    ref          TEXT NOT NULL UNIQUE,
    customer     TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'draft',
    date         TEXT NOT NULL,
    notes        TEXT,
    created_by   TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY  (warehouse_id) REFERENCES warehouses(id)
  );

  CREATE TABLE IF NOT EXISTS delivery_items (
    id           TEXT PRIMARY KEY,
    delivery_id  TEXT NOT NULL,
    product_id   TEXT NOT NULL,
    qty          INTEGER NOT NULL,
    FOREIGN KEY  (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    FOREIGN KEY  (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS transfers (
    id               TEXT PRIMARY KEY,
    ref              TEXT NOT NULL UNIQUE,
    from_warehouse   TEXT NOT NULL,
    to_warehouse     TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'draft',
    date             TEXT NOT NULL,
    notes            TEXT,
    created_by       TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY      (from_warehouse) REFERENCES warehouses(id),
    FOREIGN KEY      (to_warehouse)   REFERENCES warehouses(id)
  );

  CREATE TABLE IF NOT EXISTS transfer_items (
    id           TEXT PRIMARY KEY,
    transfer_id  TEXT NOT NULL,
    product_id   TEXT NOT NULL,
    qty          INTEGER NOT NULL,
    FOREIGN KEY  (transfer_id) REFERENCES transfers(id) ON DELETE CASCADE,
    FOREIGN KEY  (product_id)  REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS adjustments (
    id           TEXT PRIMARY KEY,
    ref          TEXT NOT NULL UNIQUE,
    product_id   TEXT NOT NULL,
    warehouse_id TEXT NOT NULL,
    old_qty      INTEGER NOT NULL,
    new_qty      INTEGER NOT NULL,
    reason       TEXT,
    status       TEXT NOT NULL DEFAULT 'done',
    date         TEXT NOT NULL,
    created_by   TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY  (product_id)   REFERENCES products(id),
    FOREIGN KEY  (warehouse_id) REFERENCES warehouses(id)
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id             TEXT PRIMARY KEY,
    date           TEXT NOT NULL,
    type           TEXT NOT NULL,
    product_id     TEXT NOT NULL,
    qty            INTEGER NOT NULL,
    from_warehouse TEXT,
    to_warehouse   TEXT,
    ref            TEXT,
    created_by     TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_product_stock_product ON product_stock(product_id);
  CREATE INDEX IF NOT EXISTS idx_product_stock_wh      ON product_stock(warehouse_id);
  CREATE INDEX IF NOT EXISTS idx_movements_product     ON stock_movements(product_id);
  CREATE INDEX IF NOT EXISTS idx_movements_date        ON stock_movements(date);
  CREATE INDEX IF NOT EXISTS idx_movements_type        ON stock_movements(type);
  CREATE INDEX IF NOT EXISTS idx_otp_email             ON otp_codes(email);
`)

// Preserve an on-disk snapshot before the first migration of an existing database.
if (!db.prepare('PRAGMA table_info(users)').all().some(c => c.name === 'login_id') && db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) {
  const fs = require('fs')
  const backupDir = path.join(path.dirname(dbFile), 'backups')
  fs.mkdirSync(backupDir, { recursive:true })
  const backupFile = path.join(backupDir, `before-workflow-${Date.now()}.db`)
  db.prepare('VACUUM INTO ?').run(backupFile)
  console.log('Pre-migration database backup saved:', backupFile)
}
require('./migrate')(db)
module.exports = db
