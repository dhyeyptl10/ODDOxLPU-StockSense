const { fail } = require('./validation')
const configured = () => ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_WHATSAPP_FROM','TWILIO_OTP_CONTENT_SID'].every(k => process.env[k] && !process.env[k].startsWith('your_'))
async function sendWhatsAppOTP(phone, code) {
  if (!configured()) fail('WhatsApp OTP is not configured. Ask the administrator to configure a Twilio sender and approved authentication template.', 503)
  const sid = process.env.TWILIO_ACCOUNT_SID
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ From: process.env.TWILIO_WHATSAPP_FROM, To: `whatsapp:${phone}`, ContentSid: process.env.TWILIO_OTP_CONTENT_SID, ContentVariables: JSON.stringify({ '1': code }) })
  })
  const result = await response.json()
  if (!response.ok || result.error_code || ['failed','undelivered'].includes(result.status)) fail('WhatsApp provider rejected the OTP. Check sender, template and account configuration.', 503)
  return result.sid
}
module.exports = { sendWhatsAppOTP, configured }
