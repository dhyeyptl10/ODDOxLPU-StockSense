const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
const db = require('../db/database')
const { secret } = require('../config')
const { auth } = require('../middleware/auth')
const { sendOTPEmail } = require('../utils/email')
const { sendWhatsAppOTP, configured: whatsappConfigured } = require('../utils/whatsapp')
const { passwordValid, passwordMessage, fail, wrap } = require('../utils/validation')
const { generateOTP } = require('../utils/helpers')
const safeUser = u => ({ id:u.id, name:u.name, email:u.email, loginId:u.login_id, phone:u.phone, role:u.role, avatar:u.avatar || u.name.slice(0,2).toUpperCase() })
const signToken = u => jwt.sign({ id:u.id, version:u.token_version, purpose:'session' }, secret, { expiresIn:process.env.JWT_EXPIRES_IN || '7d' })
const emailValue = value => typeof value === 'string' ? value.trim().toLowerCase() : ''
const phoneValue = value => {
  if (typeof value !== 'string' || !/^\+[1-9]\d{7,14}$/.test(value)) fail('Use a phone number with country code, e.g. +919876543210')
  return value
}
const hashCode = (id, code) => crypto.createHmac('sha256', secret).update(`${id}:${code}`).digest('hex')
const generic = 'If this account has that recovery method enabled, a code has been requested. Check your inbox or WhatsApp.'

router.post('/signup', wrap(async (req, res) => {
  const { name, password, confirmPassword, loginId } = req.body
  const email = emailValue(req.body.email)
  if (typeof name !== 'string' || !name.trim() || name.length > 100) fail('Name is required (maximum 100 characters)')
  if (typeof loginId !== 'string' || !/^[a-zA-Z0-9_]{6,12}$/.test(loginId)) fail('Login ID must contain 6–12 letters, numbers or underscores')
  if (!isEmail(email)) fail('Valid email required')
  if (!passwordValid(password)) fail(passwordMessage)
  if (password !== confirmPassword) fail('Passwords do not match')
  if (db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE OR login_id = ? COLLATE NOCASE').get(email, loginId)) fail('Email or Login ID already registered',409)
  const hash = await bcrypt.hash(password,12)
  const id = crypto.randomUUID()
  db.prepare('INSERT INTO users(id,name,email,password,role,login_id) VALUES(?,?,?,?,?,?)').run(id,name.trim(),email,hash,'warehouse_staff',loginId.toLowerCase())
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  res.status(201).json({ success:true, token:signToken(user), user:safeUser(user) })
}))
router.post('/login', wrap(async (req,res) => {
  const identifier = emailValue(req.body.loginId || req.body.email)
  const user = db.prepare('SELECT * FROM users WHERE (login_id = ? COLLATE NOCASE OR email = ? COLLATE NOCASE) AND is_active = 1').get(identifier,identifier)
  if (!user || typeof req.body.password !== 'string' || !await bcrypt.compare(req.body.password,user.password)) fail('Invalid Login Id or Password',401)
  res.json({success:true,token:signToken(user),user:safeUser(user)})
}))

async function issueCode(user, channel, destination, purpose) {
  const previous = db.prepare('SELECT * FROM otp_codes WHERE email = ? AND purpose = ? ORDER BY rowid DESC LIMIT 1').get(user.email,purpose)
  if (previous && Date.now() - Date.parse(previous.created_at + 'Z') < 60000) fail('Please wait 60 seconds before requesting another code',429)
  const id = crypto.randomUUID(), code = generateOTP()
  // Save OTP in database (used = 0 so it can be verified)
  db.transaction(() => {
    db.prepare('UPDATE otp_codes SET used = 1 WHERE email = ? AND purpose = ?').run(user.email,purpose)
    db.prepare('INSERT INTO otp_codes(id,email,code,purpose,expires_at,channel,destination,used) VALUES(?,?,?,?,?,?,?,0)').run(id,user.email,hashCode(id,code),purpose,new Date(Date.now()+600000).toISOString(),channel,destination)
  })()
  let delivered = false
  try {
    if (channel === 'email' && process.env.SMTP_USER && process.env.SMTP_PASS && !process.env.SMTP_USER.startsWith('your_')) {
      await sendOTPEmail(destination,code,user.name)
      delivered = true
    } else if (channel === 'whatsapp' && whatsappConfigured()) {
      await sendWhatsAppOTP(destination,code)
      delivered = true
    }
  } catch (err) {
    console.warn(`⚠️  OTP delivery via ${channel} skipped/failed: ${err.message}`)
  }

  console.log(`\n🔑  ═══════════════════════════════════════════════`)
  console.log(`🔑  DEV/FALLBACK OTP FOR: ${destination} (${channel.toUpperCase()})`)
  console.log(`🔑  CODE: ${code}`)
  console.log(`🔑  ═══════════════════════════════════════════════\n`)

  return { code, delivered }
}
function checkCode(email, code, purpose, channel, destination) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) fail('Enter the 6-digit OTP')
  const otp = db.prepare('SELECT * FROM otp_codes WHERE email = ? AND purpose = ? ORDER BY rowid DESC LIMIT 1').get(email,purpose)
  if (!otp || otp.used || otp.verified || otp.attempts >= 5 || Date.parse(otp.expires_at) <= Date.now() || otp.channel !== channel || otp.destination !== destination) fail('Invalid or expired OTP')
  db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(otp.id)
  const expected = hashCode(otp.id,code)
  if (otp.code.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(otp.code),Buffer.from(expected))) fail('Invalid or expired OTP')
  db.prepare('UPDATE otp_codes SET verified = 1 WHERE id = ?').run(otp.id)
  return otp
}
function recoveryTarget(body) {
  const channel = body.channel || 'email'
  if (!['email','whatsapp'].includes(channel)) fail('Invalid OTP channel')
  const destination = channel === 'email' ? emailValue(body.email) : phoneValue(body.phone)
  if (channel === 'email' && !isEmail(destination)) fail('Valid email required')
  const user = channel === 'email'
    ? db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE AND is_active = 1').get(destination)
    : db.prepare('SELECT * FROM users WHERE phone = ? AND is_active = 1').get(destination)
  return { channel, destination, user }
}
router.post('/otp/send', wrap(async (req,res) => {
  const { channel,destination,user } = recoveryTarget(req.body)
  let result = null
  if (user) {
    result = await issueCode(user,channel,destination,'reset')
  }
  if (result && !result.delivered) {
    return res.json({
      success: true,
      devMode: true,
      devOtp: result.code,
      message: `OTP Code: ${result.code} (SMTP not configured — code prefilled for testing)`
    })
  }
  res.json({success:true,message: result?.delivered ? 'OTP sent to your email! Please check your inbox.' : generic})
}))
router.post('/otp/verify', wrap((req,res) => {
  const {channel,destination,user} = recoveryTarget(req.body)
  if (!user) fail('Invalid or expired OTP')
  const otp = checkCode(user.email,req.body.code,'reset',channel,destination)
  const resetToken = jwt.sign({id:user.id,otpId:otp.id,purpose:'password-reset',version:user.token_version},secret,{expiresIn:'10m'})
  res.json({success:true,resetToken})
}))
router.post('/otp/reset', wrap(async (req,res) => {
  if (!passwordValid(req.body.newPassword)) fail(passwordMessage)
  let decoded
  try { decoded = jwt.verify(req.body.resetToken,secret) } catch { fail('Reset token expired or invalid') }
  if (decoded.purpose !== 'password-reset') fail('Invalid reset token')
  const hash = await bcrypt.hash(req.body.newPassword,12)
  db.transaction(() => {
    const otp = db.prepare('SELECT * FROM otp_codes WHERE id = ?').get(decoded.otpId)
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(decoded.id)
    if (!user || !otp || otp.email !== user.email || otp.used || !otp.verified || Date.parse(otp.expires_at) <= Date.now() || decoded.version !== user.token_version) fail('Reset token expired or already used')
    db.prepare('UPDATE users SET password = ?, token_version = token_version + 1 WHERE id = ?').run(hash,user.id)
    db.prepare('UPDATE otp_codes SET used = 1 WHERE email = ?').run(user.email)
  })()
  res.json({success:true,message:'Password reset successfully. Please sign in.'})
}))
router.get('/me',auth,(req,res) => res.json({success:true,user:safeUser(req.user)}))
router.put('/profile',auth,wrap((req,res) => {
  const {name} = req.body
  if (typeof name !== 'string' || !name.trim() || name.length > 100) fail('Name is required (maximum 100 characters)')
  db.prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?').run(name.trim(),name.trim().slice(0,2).toUpperCase(),req.user.id)
  res.json({success:true,user:safeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id))})
}))
router.put('/password',auth,wrap(async (req,res) => {
  if (!passwordValid(req.body.newPassword)) fail(passwordMessage)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (typeof req.body.currentPassword !== 'string' || !await bcrypt.compare(req.body.currentPassword,user.password)) fail('Current password is incorrect')
  const hash = await bcrypt.hash(req.body.newPassword,12)
  db.prepare('UPDATE users SET password = ?, token_version = token_version + 1 WHERE id = ?').run(hash,user.id)
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)
  res.json({success:true,message:'Password changed',token:signToken(updated)})
}))
router.post('/phone/send',auth,wrap(async (req,res) => {
  const phone = phoneValue(req.body.phone)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (typeof req.body.currentPassword !== 'string' || !await bcrypt.compare(req.body.currentPassword,user.password)) fail('Confirm your current password to link a recovery phone')
  if (db.prepare('SELECT id FROM users WHERE phone = ? AND id != ?').get(phone,user.id)) fail('Phone is already linked to an account',409)
  await issueCode(user,'whatsapp',phone,'link-phone')
  res.json({success:true,message:'Verification code requested on WhatsApp.'})
}))
router.post('/phone/verify',auth,wrap((req,res) => {
  const phone = phoneValue(req.body.phone)
  const otp = checkCode(req.user.email,req.body.code,'link-phone','whatsapp',phone)
  db.transaction(() => {
    db.prepare('UPDATE users SET phone = ? WHERE id = ?').run(phone,req.user.id)
    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otp.id)
  })()
  res.json({success:true,user:safeUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id))})
}))
module.exports = router
