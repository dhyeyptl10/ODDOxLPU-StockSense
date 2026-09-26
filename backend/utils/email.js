// utils/email.js — Nodemailer email utility with real OTP sending
const nodemailer = require('nodemailer')

let transporter = null

const getTransporter = () => {
  if (transporter) return transporter

  // Support multiple SMTP providers: Gmail, Outlook, custom SMTP
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: true,  // for self-signed certs in dev
    },
  }

  transporter = nodemailer.createTransport(smtpConfig)
  return transporter
}

// ── Verify connection ─────────────────────────────────────────────────────────
const verifyConnection = async () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS ||
      process.env.SMTP_USER === 'your_email@gmail.com') {
    console.warn('⚠️  SMTP not configured — OTP delivery is unavailable')
    return false
  }
  try {
    const t = getTransporter()
    await t.verify()
    console.log('✅  SMTP connected:', process.env.SMTP_HOST)
    return true
  } catch (err) {
    console.warn('⚠️  SMTP connection failed:', err.message)
    return false
  }
}

// ── Build OTP HTML email ──────────────────────────────────────────────────────
const buildOTPHtml = (otp, name, expires) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>CoreInventory OTP</title>
</head>
<body style="margin:0;padding:0;background:#07090f;font-family:'Segoe UI',system-ui,Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#0d1117;border:1px solid #1e2d40;border-radius:16px;overflow:hidden;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#06b6d4,#0891b2);padding:32px;text-align:center;">
      <div style="width:56px;height:56px;background:rgba(255,255,255,.18);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px;font-size:26px;">📦</div>
      <div style="color:white;font-size:22px;font-weight:800;letter-spacing:-.5px;">CoreInventory</div>
      <div style="color:rgba(255,255,255,.75);font-size:11px;letter-spacing:.12em;margin-top:4px;">ENTERPRISE STOCK MANAGEMENT</div>
    </div>

    <!-- Body -->
    <div style="padding:36px;">
      <h2 style="color:#f1f5f9;font-size:20px;margin:0 0 10px;font-weight:700;">Password Reset Request</h2>
      <p style="color:#94a3b8;font-size:14px;margin:0 0 28px;line-height:1.7;">
        Hi <strong style="color:#e2e8f0;">${name}</strong>, we received a request to reset your CoreInventory password. 
        Use the one-time password below to proceed.
      </p>

      <!-- OTP Box -->
      <div style="background:#0f172a;border:1px solid #1e293b;border-radius:14px;padding:28px;text-align:center;margin-bottom:28px;">
        <div style="color:#64748b;font-size:11px;letter-spacing:.12em;margin-bottom:10px;font-weight:600;">YOUR ONE-TIME PASSWORD</div>
        <div style="color:#22d3ee;font-size:42px;font-weight:800;letter-spacing:.25em;font-family:'Courier New',monospace;">${otp}</div>
        <div style="margin-top:10px;color:#475569;font-size:12px;">⏱ Expires in <strong>${expires} minutes</strong></div>
      </div>

      <!-- Steps -->
      <div style="background:#111827;border-radius:10px;padding:16px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:10px;letter-spacing:.05em;">HOW TO USE:</div>
        <div style="color:#64748b;font-size:13px;line-height:2;">
          1️⃣ &nbsp;Go back to the login page<br/>
          2️⃣ &nbsp;Click "Forgot Password"<br/>
          3️⃣ &nbsp;Enter your email and this OTP<br/>
          4️⃣ &nbsp;Set your new password
        </div>
      </div>

      <p style="color:#475569;font-size:12px;margin:0;line-height:1.6;">
        ⚠️ If you did not request this, please ignore this email. Your account is safe and no changes have been made.
        This OTP cannot be reused.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#0f172a;padding:18px 36px;text-align:center;border-top:1px solid #1e293b;">
      <p style="color:#334155;font-size:11px;margin:0;">CoreInventory © 2025 · Enterprise Stock Management · Secure by default</p>
    </div>
  </div>
</body>
</html>
`

// ── Send OTP email ─────────────────────────────────────────────────────────────
const sendOTPEmail = async (to, otp, name = 'User') => {
  const expires = parseInt(process.env.OTP_EXPIRE_MINUTES || '10')

  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS ||
      process.env.SMTP_USER === 'your_email@gmail.com' ||
      process.env.SMTP_USER === '') {
    const err = new Error('SMTP not configured')
    err.code = 'SMTP_NOT_CONFIGURED'
    throw err
  }

  const t = getTransporter()

  const info = await t.sendMail({
    from:    process.env.EMAIL_FROM || `CoreInventory <${process.env.SMTP_USER}>`,
    to,
    subject: 'Your CoreInventory verification code',
    html: buildOTPHtml(otp, name.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])), expires),
    text:    [
      'CoreInventory - Password Reset OTP',
      '-----------------------------------',
      'Hi ' + name + ',',
      '',
      'Your one-time password (OTP) is: ' + otp,
      '',
      'This OTP expires in ' + expires + ' minutes.',
      '',
      'If you did not request this, please ignore this email.',
      '',
      'CoreInventory Team',
    ].join('\n'),
  })

  if (!info.accepted?.length || info.rejected?.length) throw new Error('SMTP rejected recipient')
  return info
}

module.exports = { sendOTPEmail, verifyConnection }
