const path = require('path')
const crypto = require('crypto')
require('dotenv').config({ path: path.join(__dirname, '.env') })
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be configured with at least 32 random characters in production')
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex')
  console.warn('Using an ephemeral development JWT key; sessions expire on restart.')
}
module.exports = { secret: process.env.JWT_SECRET }
