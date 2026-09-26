const {test} = require('node:test')
const assert = require('node:assert/strict')
const nodemailer=require('nodemailer')
let transportOptions,message
nodemailer.createTransport=options=>{transportOptions=options;return {sendMail:async mail=>{message=mail;return {accepted:[mail.to],rejected:[]}},verify:async()=>true}}
process.env.SMTP_USER='sender@example.com';process.env.SMTP_PASS='test-only';process.env.SMTP_HOST='smtp.example.com';process.env.SMTP_PORT='587'
const {sendOTPEmail}=require('../utils/email')
test('SMTP sends the code only in the message body with TLS certificate verification',async()=>{
  await sendOTPEmail('recipient@example.com','123456','<Injected>')
  assert.equal(transportOptions.tls.rejectUnauthorized,true)
  assert.equal(message.to,'recipient@example.com')
  assert.ok(message.text.includes('123456'));assert.ok(!message.subject.includes('123456'))
  assert.ok(message.html.includes('&lt;Injected&gt;'));assert.ok(!message.html.includes('<Injected>'))
})
test('WhatsApp uses an authentication template with explicit destination and handles provider failures',async()=>{
  const previous=global.fetch
  Object.assign(process.env,{TWILIO_ACCOUNT_SID:'ACtest',TWILIO_AUTH_TOKEN:'secret-test',TWILIO_WHATSAPP_FROM:'whatsapp:+14155550000',TWILIO_OTP_CONTENT_SID:'HXtest'})
  const {sendWhatsAppOTP}=require('../utils/whatsapp')
  let request
  global.fetch=async(url,opts)=>{request={url,opts};return {ok:true,json:async()=>({sid:'SMtest',status:'queued'})}}
  try {
    assert.equal(await sendWhatsAppOTP('+919876543210','654321'),'SMtest')
    assert.equal(request.opts.body.get('To'),'whatsapp:+919876543210')
    assert.equal(request.opts.body.get('ContentSid'),'HXtest')
    assert.equal(JSON.parse(request.opts.body.get('ContentVariables'))['1'],'654321')
    global.fetch=async()=>({ok:false,json:async()=>({code:63016})})
    await assert.rejects(()=>sendWhatsAppOTP('+919876543210','654321'),e=>e.status===503)
    delete process.env.TWILIO_AUTH_TOKEN
    await assert.rejects(()=>sendWhatsAppOTP('+919876543210','654321'),e=>e.status===503)
  } finally {global.fetch=previous}
})
test('production refuses an absent JWT secret',()=>{
  const result=require('node:child_process').spawnSync(process.execPath,['-e',"require('./config')"],{cwd:require('node:path').join(__dirname,'..'),env:{...process.env,NODE_ENV:'production',JWT_SECRET:''},encoding:'utf8'})
  assert.notEqual(result.status,0);assert.match(result.stderr,/JWT_SECRET must be configured/)
})
