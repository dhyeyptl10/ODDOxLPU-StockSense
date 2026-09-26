const {test,after} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), os = require('node:os'), path = require('node:path')
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'coreinventory-test-'))
process.env.NODE_ENV='test'
process.env.DB_PATH=path.join(dir,'inventory.db')
process.env.JWT_SECRET='test-only-strong-key-not-a-production-secret-00001'
process.env.SMTP_USER='sender@example.com';process.env.SMTP_PASS='test-password'
const sent=[]
const email = require('../utils/email')
email.sendOTPEmail=async(to,code)=>{sent.push({to,code});return {accepted:[to]}}
const whatsapp = require('../utils/whatsapp')
whatsapp.configured=()=>true
whatsapp.sendWhatsAppOTP=async(to,code)=>{sent.push({to,code});return 'mock-message-id'}
const app = require('../server'), db = require('../db/database')
const bcrypt = require('bcryptjs')
const server=app.listen(0,'127.0.0.1')
const ready=new Promise(resolve=>server.on('listening',resolve))
let adminToken,staffToken
async function api(method,url,body,token=adminToken) {
  await ready
  const res=await fetch(`http://127.0.0.1:${server.address().port}${url}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})})
  return {status:res.status,body:await res.json()}
}
async function ok(method,url,body,status=200,token=adminToken) {
  const result=await api(method,url,body,token);assert.equal(result.status,status,JSON.stringify(result.body));return result.body
}
after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();fs.rmSync(dir,{recursive:true,force:true})})

test('authentication, atomic stock workflows, dashboard, locations and OTP recovery',async t=>{
  const hash=bcrypt.hashSync('AdminPass!123',4)
  db.prepare('INSERT INTO users(id,name,email,password,role,login_id) VALUES(?,?,?,?,?,?)').run('admin','Admin','admin@example.com',hash,'admin','admin01')
  await t.test('health, Login ID, error text and no signup role escalation',async()=>{
    assert.equal((await ok('GET','/health')).database,'connected')
    const login=await ok('POST','/api/auth/login',{loginId:'ADMIN01',password:'AdminPass!123'},200,null);adminToken=login.token
    const invalid=await api('POST','/api/auth/login',{loginId:'admin01',password:'wrong'},null);assert.equal(invalid.status,401);assert.equal(invalid.body.message,'Invalid Login Id or Password')
    const data={name:'Staff',email:'staff@example.com',loginId:'staff01',password:'StaffPass!123',confirmPassword:'StaffPass!123',role:'admin'}
    const signup=await ok('POST','/api/auth/signup',data,201,null);assert.equal(signup.user.role,'warehouse_staff');staffToken=signup.token
    assert.equal((await api('POST','/api/auth/signup',{...data,email:'unique@example.com'},null)).status,409)
    assert.equal((await api('POST','/api/auth/signup',{...data,loginId:'x'},null)).status,400)
    assert.equal((await api('POST','/api/auth/signup',{...data,password:'weak',confirmPassword:'weak'},null)).status,400)
  })
  let wh1,wh2,p1,p2,receipt,delivery
  await t.test('warehouse/location hierarchy and product creation',async()=>{
    wh1=(await ok('POST','/api/warehouses',{name:'Main',location:'Ahmedabad',shortCode:'WH'},201)).data.id
    wh2=(await ok('POST','/api/warehouses',{name:'Rack A',location:'Aisle 1',shortCode:'RACKA',parentId:wh1},201)).data.id
    p1=(await ok('POST','/api/products',{name:'Steel',sku:'steel',category:'Raw Materials',unit:'kg',reorderLevel:10,unitCost:25},201)).data.id
    p2=(await ok('POST','/api/products',{name:'Chairs',sku:'chair',category:'Furniture',unit:'pieces',reorderLevel:3},201)).data.id
    assert.equal((await api('POST','/api/products',{name:'Denied'},staffToken)).status,403)
  })
  const stock=async(p,w)=> (await ok('GET',`/api/products/${p}`)).data.stock[w]||0
  await t.test('draft cannot bypass validation, item edits checked, receipt adds stock once',async()=>{
    const body={supplier:'Vendor',warehouseId:wh1,items:[{productId:p1,qty:100},{productId:p2,qty:20}]}
    assert.equal((await api('POST','/api/receipts',{...body,status:'done'})).status,400)
    receipt=(await ok('POST','/api/receipts',body,201)).data
    assert.equal(receipt.ref,'WH/IN/0001')
    assert.equal(await stock(p1,wh1),0)
    assert.equal((await api('PUT',`/api/receipts/${receipt.id}`,{items:[{productId:p1,qty:-10}]})).status,400)
    assert.equal((await api('POST',`/api/receipts/${receipt.id}/validate`)).status,409)
    await ok('POST',`/api/receipts/${receipt.id}/ready`)
    assert.equal((await api('POST',`/api/receipts/${receipt.id}/validate`,null,staffToken)).status,403)
    await ok('POST',`/api/receipts/${receipt.id}/validate`)
    assert.equal(await stock(p1,wh1),100);assert.equal(await stock(p2,wh1),20)
    assert.equal((await api('POST',`/api/receipts/${receipt.id}/validate`)).status,409)
    assert.equal((await api('PUT',`/api/receipts/${receipt.id}`,{status:'draft'})).status,409)
    const history=await ok('GET','/api/movements?search=Vendor');assert.equal(history.total,2);assert.ok(history.data.every(m=>m.contact==='Vendor'))
  })
  await t.test('duplicate product quantities aggregate, insufficient stock waits without mutation',async()=>{
    delivery=(await ok('POST','/api/deliveries',{customer:'Customer',warehouseId:wh1,items:[{productId:p1,qty:60},{productId:p1,qty:60}]},201)).data
    assert.equal(delivery.ref,'WH/OUT/0001');assert.equal(delivery.items.length,1);assert.equal(delivery.items[0].qty,120)
    const ready=await ok('POST',`/api/deliveries/${delivery.id}/ready`);assert.equal(ready.data.status,'waiting')
    assert.equal((await api('POST',`/api/deliveries/${delivery.id}/validate`)).status,409);assert.equal(await stock(p1,wh1),100)
  })
  await t.test('receipt unblocks waiting delivery; reservations prevent competing order; pick-pack dispatch',async()=>{
    const r=(await ok('POST','/api/receipts',{supplier:'Vendor',warehouseId:wh1,items:[{productId:p1,qty:30}]},201)).data
    await ok('POST',`/api/receipts/${r.id}/ready`);await ok('POST',`/api/receipts/${r.id}/validate`)
    const product=(await ok('GET',`/api/products/${p1}`)).data;assert.equal(product.freeToUse,10)
    const second=(await ok('POST','/api/deliveries',{customer:'Second',warehouseId:wh1,items:[{productId:p1,qty:20}]},201)).data
    assert.equal((await ok('POST',`/api/deliveries/${second.id}/ready`)).data.status,'waiting')
    assert.equal((await api('POST',`/api/deliveries/${delivery.id}/validate`)).status,409)
    await ok('POST',`/api/deliveries/${delivery.id}/fulfillment`,{stage:'picked'},200,staffToken)
    await ok('POST',`/api/deliveries/${delivery.id}/fulfillment`,{stage:'packed'},200,staffToken)
    await ok('POST',`/api/deliveries/${delivery.id}/validate`)
    assert.equal(await stock(p1,wh1),10)
    await ok('POST',`/api/deliveries/${second.id}/cancel`)
    assert.equal((await api('PUT',`/api/deliveries/${second.id}`,{status:'draft'})).status,409)
  })
  await t.test('transfer moves stock and logs ledger; partial edit cannot create identical endpoints',async()=>{
    const tr=(await ok('POST','/api/transfers',{fromWarehouse:wh1,toWarehouse:wh2,items:[{productId:p1,qty:5}]},201)).data
    assert.equal((await api('PUT',`/api/transfers/${tr.id}`,{toWarehouse:wh1})).status,400)
    await ok('POST',`/api/transfers/${tr.id}/ready`);await ok('POST',`/api/transfers/${tr.id}/validate`)
    assert.equal(await stock(p1,wh1),5);assert.equal(await stock(p1,wh2),5)
    assert.equal((await ok('GET','/api/movements?type=transfer')).total,1)
  })
  await t.test('adjustment logs delta, counts and trend derive from ledger, filters and date validation',async()=>{
    await ok('POST','/api/adjustments',{productId:p1,warehouseId:wh2,newQty:2,reason:'Damage'},201)
    assert.equal(await stock(p1,wh2),2)
    const ledger=await ok('GET','/api/movements?type=adjustment');assert.equal(ledger.data[0].qty,-3)
    const dash=(await ok('GET','/api/dashboard')).data;assert.equal(dash.kpis.receiptsPending,0);assert.equal(dash.movementTrend.reduce((a,r)=>a+r.receipts,0),150)
    assert.equal(dash.movementTrend.reduce((a,r)=>a+r.deliveries,0),120)
    assert.equal(dash.movementTrend.reduce((a,r)=>a+r.transfers,0),5)
    assert.equal(dash.movementTrend.reduce((a,r)=>a+r.adjustments,0),3)
    assert.equal((await api('POST','/api/receipts',{supplier:'Bad',warehouseId:wh1,date:'2026-02-30',items:[{productId:p1,qty:1}]})).status,400)
    assert.equal((await api('GET','/api/movements?limit=-1')).status,400)
    assert.equal((await ok('GET',`/api/dashboard?warehouseId=${wh2}&category=Raw+Materials`)).data.kpis.totalStockUnits,2)
    assert.equal((await api('DELETE',`/api/products/${p1}`)).status,409)
  })
  await t.test('failed ledger write rolls back every stock line; simultaneous validation applies once',async()=>{
    const r=(await ok('POST','/api/receipts',{supplier:'Atomic',warehouseId:wh1,items:[{productId:p1,qty:3},{productId:p2,qty:4}]},201)).data
    await ok('POST',`/api/receipts/${r.id}/ready`)
    const before1=await stock(p1,wh1),before2=await stock(p2,wh1)
    db.exec("CREATE TEMP TRIGGER test_fail_ledger BEFORE INSERT ON stock_movements WHEN NEW.qty = 4 BEGIN SELECT RAISE(ABORT,'simulated ledger failure'); END")
    assert.equal((await api('POST',`/api/receipts/${r.id}/validate`)).status,500)
    assert.equal(await stock(p1,wh1),before1);assert.equal(await stock(p2,wh1),before2)
    assert.equal((await ok('GET',`/api/receipts/${r.id}`)).data.status,'ready')
    assert.equal((await ok('GET',`/api/movements?search=${encodeURIComponent(r.ref)}`)).total,0)
    db.exec('DROP TRIGGER test_fail_ledger')
    const results=await Promise.all([api('POST',`/api/receipts/${r.id}/validate`),api('POST',`/api/receipts/${r.id}/validate`)])
    assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal(await stock(p1,wh1),before1+3)
  })
  await t.test('reference sequences survive draft deletion and numeric rollover',async()=>{
    const body={supplier:'Sequence',warehouseId:wh1,items:[{productId:p1,qty:1}]}
    const r=(await ok('POST','/api/receipts',body,201)).data
    await ok('DELETE',`/api/receipts/${r.id}`)
    const next=(await ok('POST','/api/receipts',body,201)).data
    assert.ok(Number(next.ref.split('/').at(-1))>Number(r.ref.split('/').at(-1)))
    db.prepare("UPDATE reference_sequences SET value=9999 WHERE prefix='WH/IN'").run()
    const rollover=(await ok('POST','/api/receipts',body,201)).data;assert.equal(rollover.ref,'WH/IN/10000')
  })
  await t.test('schedule dates are separate from stock state and historical charts retain real dates',async()=>{
    const {toDay}=require('../utils/helpers')
    const date=new Date(`${toDay()}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+2)
    const r=(await ok('POST','/api/receipts',{supplier:'Future',warehouseId:wh1,date:date.toISOString().slice(0,10),items:[{productId:p1,qty:1}]},201)).data
    assert.equal(r.status,'draft');assert.equal(r.waiting,true);assert.equal(r.late,false)
    const summary=(await ok('GET','/api/dashboard?type=receipt')).data
    assert.ok(summary.kpis.waiting>=1)
    const dates=db.prepare('SELECT id,date FROM stock_movements').all()
    db.prepare("UPDATE stock_movements SET date='2020-01-02'").run()
    const historical=(await ok('GET','/api/dashboard')).data
    assert.equal(historical.trendRange.historical,true);assert.equal(historical.trendRange.to,'2020-01-02')
    dates.forEach(m=>db.prepare('UPDATE stock_movements SET date=? WHERE id=?').run(m.date,m.id))
  })
  await t.test('migration preserves quantities, dates and ledger links and is repeatable',async()=>{
    const prior=db.prepare('SELECT SUM(quantity) AS n FROM product_stock').get().n
    const date=db.prepare('SELECT date FROM receipts WHERE id=?').get(receipt.id).date
    db.prepare("UPDATE receipts SET ref='RCT-0900' WHERE id=?").run(receipt.id)
    db.prepare("UPDATE stock_movements SET ref='RCT-0900' WHERE ref=?").run(receipt.ref)
    const migrate=require('../db/migrate');migrate(db);migrate(db)
    assert.equal(db.prepare('SELECT ref FROM receipts WHERE id=?').get(receipt.id).ref,'WH/IN/0900')
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM stock_movements WHERE ref='WH/IN/0900'").get().n,2)
    assert.equal(db.prepare('SELECT SUM(quantity) AS n FROM product_stock').get().n,prior)
    assert.equal(db.prepare('SELECT date FROM receipts WHERE id=?').get(receipt.id).date,date)
  })
  await t.test('email OTP is hashed, hidden, single-use; sessions revoked on reset',async()=>{
    const send=await ok('POST','/api/auth/otp/send',{email:'staff@example.com'},200,null)
    assert.equal(send.devOtp,undefined);assert.equal(sent.length,1)
    const otp=db.prepare('SELECT * FROM otp_codes ORDER BY rowid DESC LIMIT 1').get();assert.notEqual(otp.code,sent.at(-1).code)
    const verified=await ok('POST','/api/auth/otp/verify',{email:'staff@example.com',code:sent.at(-1).code},200,null)
    assert.equal((await api('POST','/api/auth/otp/verify',{email:'staff@example.com',code:sent.at(-1).code},null)).status,400)
    await ok('POST','/api/auth/otp/reset',{resetToken:verified.resetToken,newPassword:'ChangedPass!123'},200,null)
    assert.equal((await api('POST','/api/auth/otp/reset',{resetToken:verified.resetToken,newPassword:'AgainPass!123'},null)).status,400)
    assert.equal((await api('GET','/api/auth/me',null,staffToken)).status,401)
    staffToken=(await ok('POST','/api/auth/login',{loginId:'staff01',password:'ChangedPass!123'},200,null)).token
  })
  await t.test('WhatsApp linking requires password and verified code, then supports phone recovery',async()=>{
    assert.equal((await api('POST','/api/auth/phone/send',{phone:'+919876543210',currentPassword:'wrong'},staffToken)).status,400)
    await ok('POST','/api/auth/phone/send',{phone:'+919876543210',currentPassword:'ChangedPass!123'},200,staffToken)
    await ok('POST','/api/auth/phone/verify',{phone:'+919876543210',code:sent.at(-1).code},200,staffToken)
    db.prepare("UPDATE otp_codes SET created_at=datetime('now','-2 minutes')").run()
    await ok('POST','/api/auth/otp/send',{channel:'whatsapp',phone:'+919876543210'},200,null)
    const verified=await ok('POST','/api/auth/otp/verify',{channel:'whatsapp',phone:'+919876543210',code:sent.at(-1).code},200,null)
    assert.ok(verified.resetToken)
  })
  await t.test('expired OTP and attempt exhaustion are enforced; unconfigured provider returns error',async()=>{
    db.prepare("UPDATE otp_codes SET created_at=datetime('now','-2 minutes')").run()
    await ok('POST','/api/auth/otp/send',{email:'admin@example.com'},200,null)
    db.prepare("UPDATE otp_codes SET expires_at=? WHERE email='admin@example.com'").run(new Date(Date.now()-1000).toISOString())
    assert.equal((await api('POST','/api/auth/otp/verify',{email:'admin@example.com',code:sent.at(-1).code},null)).status,400)
    db.prepare("UPDATE otp_codes SET expires_at=?, attempts=5 WHERE email='admin@example.com'").run(new Date(Date.now()+60000).toISOString())
    assert.equal((await api('POST','/api/auth/otp/verify',{email:'admin@example.com',code:sent.at(-1).code},null)).status,400)
    delete process.env.SMTP_PASS
    const result=await api('POST','/api/auth/otp/send',{email:'admin@example.com'},null);assert.equal(result.status,503);assert.equal(result.body.devOtp,undefined)
  })
  await t.test('CORS rejects unrelated origins',async()=>{
    const response=await fetch(`http://127.0.0.1:${server.address().port}/health`,{headers:{Origin:'https://untrusted.example'}})
    assert.equal(response.status,403);assert.equal(response.headers.get('access-control-allow-origin'),null)
  })
})
