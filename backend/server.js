// server.js — CoreInventory Express Backend
// Run: npm install && npm run seed && npm run dev
require('./config')

const express     = require('express')
const cors        = require('cors')
const morgan      = require('morgan')
const rateLimit   = require('express-rate-limit')
const path        = require('path')

// ─── Import DB (initialises schema on first run) ──────────────────────────────
const db = require('./db/database')

// ─── Import Routes ────────────────────────────────────────────────────────────
const authRoutes        = require('./routes/auth')
const productRoutes     = require('./routes/products')
const warehouseRoutes   = require('./routes/warehouses')
const receiptRoutes     = require('./routes/receipts')
const deliveryRoutes    = require('./routes/deliveries')
const transferRoutes    = require('./routes/transfers')
const adjustmentRoutes  = require('./routes/adjustments')
const movementRoutes    = require('./routes/movements')
const dashboardRoutes   = require('./routes/dashboard')
const userRoutes        = require('./routes/users')

const app  = express()
const PORT = process.env.PORT || 5000

// ─── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, postman, health checks)
    if (!origin) return callback(null, true)
    
    // Allowed exact origins
    const allowed = [
      process.env.FRONTEND_URL,
      ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173','http://localhost:3000','http://localhost:4173']),
    ].filter(Boolean)

    if (allowed.includes(origin)) {
      return callback(null, true)
    }
    return callback(Object.assign(new Error('Origin not allowed'), {status:403}))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '256kb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Logging ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
}

// ─── Global Rate Limiting ─────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max:      2000,
  message:  { success: false, message: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
})
app.use('/api/', globalLimiter)

// Stricter limiter for auth endpoints
const authLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Too many auth attempts, please try again later.' },
})
app.use('/api/auth/login',      authLimiter())
app.use('/api/auth/signup',     authLimiter())
app.use('/api/auth/otp', authLimiter())
app.use('/api/auth/phone', authLimiter())

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const dbOk = db.prepare('SELECT 1').get()
  res.json({
    status:      'ok',
    timestamp:   new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database:    dbOk ? 'connected' : 'error',
    version:     '1.0.0',
  })
})

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes)
app.use('/api/dashboard',   dashboardRoutes)
app.use('/api/products',    productRoutes)
app.use('/api/warehouses',  warehouseRoutes)
app.use('/api/receipts',    receiptRoutes)
app.use('/api/deliveries',  deliveryRoutes)
app.use('/api/transfers',   transferRoutes)
app.use('/api/adjustments', adjustmentRoutes)
app.use('/api/movements',   movementRoutes)
app.use('/api/users',       userRoutes)

// ─── API Root Info ────────────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({
    name:    'CoreInventory API',
    version: '1.0.0',
    endpoints: [
      'POST   /api/auth/signup',
      'POST   /api/auth/login',
      'GET    /api/auth/me',
      'PUT    /api/auth/profile',
      'PUT    /api/auth/password',
      'POST   /api/auth/otp/send',
      'POST   /api/auth/otp/verify',
      'POST   /api/auth/otp/reset',
      'GET    /api/dashboard',
      'GET    /api/products',
      'POST   /api/products',
      'GET    /api/products/:id',
      'PUT    /api/products/:id',
      'DELETE /api/products/:id',
      'GET    /api/products/:id/movements',
      'GET    /api/warehouses',
      'POST   /api/warehouses',
      'GET    /api/warehouses/:id',
      'PUT    /api/warehouses/:id',
      'DELETE /api/warehouses/:id',
      'GET    /api/receipts',
      'POST   /api/receipts',
      'GET    /api/receipts/:id',
      'PUT    /api/receipts/:id',
      'DELETE /api/receipts/:id',
      'POST   /api/receipts/:id/validate',
      'POST   /api/receipts/:id/cancel',
      'GET    /api/deliveries',
      'POST   /api/deliveries',
      'GET    /api/deliveries/:id',
      'PUT    /api/deliveries/:id',
      'DELETE /api/deliveries/:id',
      'POST   /api/deliveries/:id/validate',
      'POST   /api/deliveries/:id/cancel',
      'GET    /api/transfers',
      'POST   /api/transfers',
      'GET    /api/transfers/:id',
      'PUT    /api/transfers/:id',
      'DELETE /api/transfers/:id',
      'POST   /api/transfers/:id/validate',
      'POST   /api/transfers/:id/cancel',
      'GET    /api/adjustments',
      'POST   /api/adjustments',
      'GET    /api/adjustments/:id',
      'GET    /api/movements',
      'GET    /api/movements/summary',
      'GET    /api/users',
      'GET    /api/users/:id',
      'PUT    /api/users/:id',
      'DELETE /api/users/:id',
    ],
  })
})

// Serve the built frontend from the API origin in production.
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../dist')
  app.use(express.static(dist))
  app.get('*', (req, res, next) => req.path.startsWith('/api') ? next() : res.sendFile(path.join(dist,'index.html')))
}

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` })
})

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (!err.status || err.status >= 500) console.error('Request failed:', err.code || err.message)

  // SQLite constraint errors
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE constraint failed/.test(err.message)) {
    return res.status(409).json({ success: false, message: 'A record with that value already exists' })
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.status && err.status < 500 ? err.message : (err.status === 503 ? err.message : 'Internal server error'),

  })
})

// ─── Import email utility ────────────────────────────────────────────────────
const { verifyConnection } = require('./utils/email')

// ─── Start Server ─────────────────────────────────────────────────────────────
if (require.main === module) app.listen(PORT, async () => {
  console.log(`CoreInventory API listening at http://localhost:${PORT}`)
  console.log(await verifyConnection() ? 'SMTP connected' : 'SMTP unavailable: configure backend/.env for email OTP')
})
module.exports = app
