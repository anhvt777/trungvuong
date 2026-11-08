'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const QR=require('../bidv-qr-core.js');
const fixture={bankBin:'970418',accountNumber:'V4TVTH266A101BT11',accountName:'HOANG DUC ANH 6A1',remark:'HOANG DUC ANH 6A1 NOP DICH VU BAN TRU 2026 11',amount:600000};
test('Engine V1 requires exact BIDV BIN and valid bank identity',()=>{
 assert.equal(QR.version,'1.0.0');
 assert.throws(()=>QR.generate({...fixture,bankBin:'970436'}),/BANK_BIN_NOT_BIDV/);
 assert.throws(()=>QR.generate({...fixture,accountNumber:'??'}),/INVALID_VIRTUAL_ACCOUNT/);
 assert.throws(()=>QR.generate({...fixture,amount:0}),/INVALID_AMOUNT/);
});
test('EMV payload and CRC deterministic across different browser/Worker callers',()=>{
 const p1=QR.generate(fixture),p2=QR.generate({...fixture});
 assert.equal(p1,p2);assert.equal(QR.verify(fixture,p1),true);
 assert.equal(p1.slice(-8,-4),'6304');
 assert.equal(QR.verify({...fixture,amount:599999},p1),false);
});
test('Partial payment changes amount and CRC but preserves virtual account and remark',()=>{
 const before=QR.generate(fixture),after=QR.generate({...fixture,amount:400000});
 assert.notEqual(before,after);
 assert.equal(QR.verify({...fixture,amount:400000},after),true);
 assert.equal(after.includes(fixture.accountNumber),true);
 assert.equal(after.includes('400000'),true);
});
test('Month must be encoded in the virtual account and reference by the business layer',()=>{
 const eleven=QR.generate(fixture);
 const twelve=QR.generate({...fixture,accountNumber:'V4TVTH266A101BT12',remark:'HOANG DUC ANH 6A1 NOP DICH VU BAN TRU 2026 12'});
 assert.notEqual(eleven,twelve);
});
test('Do not create QR for zero, negative, fractional or noninteger remaining',()=>{
 for(const amount of [0,-50,200.5,Infinity,NaN])assert.throws(()=>QR.generate({...fixture,amount}),/INVALID_AMOUNT/);
});
test('Payee and remark are significant fields, not ignored in QR match',()=>{
 const p=QR.generate(fixture);
 assert.equal(QR.verify({...fixture,accountName:'UNKNOWN PAYEE'},p),false);
 assert.equal(QR.verify({...fixture,remark:'ANOTHER BILL'},p),false);
});
test('Uppercase accent-insensitive normalization yields one EMV',()=>{
 const a=QR.generate({...fixture,accountName:'Hoàng Đức Anh 6A1'});
 const b=QR.generate({...fixture,accountName:'HOANG DUC ANH 6A1'});
 assert.equal(a,b);
});
