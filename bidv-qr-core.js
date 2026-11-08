/* BIDV QR Engine V1.0.0 — shared EMV payload authority.
 * Reusable on GitHub Pages and Cloudflare Workers. No student data, credentials,
 * network calls or external QR provider. The caller controls verified identifiers.
 * IMPORTANT: creating valid EMV does not verify that a bank account exists.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.BIDVQREngine=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const VERSION='1.0.0',BANK_BIN='970418';
  function normalize(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'D').toUpperCase().replace(/[^A-Z0-9 ._-]/g,' ').replace(/\s+/g,' ').trim()}
  function tag(k,v){v=String(v);if(v.length>99)throw Error('EMV_FIELD_TOO_LONG:'+k);return k+String(v.length).padStart(2,'0')+v}
  function crc(input){let r=65535;for(let i=0;i<input.length;i++){r^=input.charCodeAt(i)<<8;for(let j=0;j<8;j++)r=(r&32768)?((r<<1)^4129)&65535:(r<<1)&65535}return r.toString(16).toUpperCase().padStart(4,'0')}
  function generate(data){
    const bin=String(data.bankBin||data.bank_bin||BANK_BIN).trim();
    const account=String(data.accountNumber||data.account_number||'').trim();
    const name=normalize(data.accountName||data.account_name||'');
    const remark=normalize(data.remark||'');
    const amount=Number(data.amount);
    if(bin!==BANK_BIN)throw Error('BANK_BIN_NOT_BIDV');
    if(!/^[A-Za-z0-9]{4,34}$/.test(account))throw Error('INVALID_VIRTUAL_ACCOUNT');
    if(!name||name.length>80)throw Error('INVALID_ACCOUNT_NAME');
    if(!remark||remark.length>95)throw Error('INVALID_PAYMENT_REMARK');
    if(!Number.isSafeInteger(amount)||amount<=0||amount>999999999)throw Error('INVALID_AMOUNT');
    const bankData=tag('00','A000000727')+tag('01',tag('00',bin)+tag('01',account))+tag('02','QRIBFTTA');
    let dataString='000201010212'+tag('38',bankData)+'52040000'+'5303704'+tag('54',String(amount))+'5802VN'+tag('59',name.slice(0,25))+tag('60','VIETNAM')+tag('62',tag('08',remark))+'6304';
    return dataString+crc(dataString);
  }
  function parseCRC(payload){return typeof payload==='string'&&payload.length>8&&/^6304[0-9A-F]{4}$/.test(payload.slice(-8))&&payload.slice(-4)===crc(payload.slice(0,-4))}
  function verify(data,payload){try{return generate(data)===payload&&parseCRC(payload)}catch{return false}}
  return Object.freeze({version:VERSION,bankBin:BANK_BIN,normalize,generate,verify,crc});
});
