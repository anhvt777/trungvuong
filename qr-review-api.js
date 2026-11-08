
function qrTextNormalize(v){return String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toUpperCase().replace(/[^A-Z0-9 _.-]/g,' ').replace(/\s+/g,' ').trim()}
function qrEmvTag(id,value){const v=String(value);if(v.length>99)throw Error('EMV tag too long');return id+String(v.length).padStart(2,'0')+v}
function qrEmvCRC(v){let c=65535;for(let i=0;i<v.length;i++){c^=v.charCodeAt(i)<<8;for(let k=0;k<8;k++){c=c&32768?(c<<1)^4129:c<<1;c&=65535}}return c.toString(16).toUpperCase().padStart(4,'0')}
function qrBuildEmv(x){const info=qrEmvTag('00','A000000727')+qrEmvTag('01',qrEmvTag('00',x.bank_bin)+qrEmvTag('01',x.account_number))+qrEmvTag('02','QRIBFTTA');let s='000201010212'+qrEmvTag('38',info)+'52040000'+'5303704'+qrEmvTag('54',String(x.amount))+'5802VN'+qrEmvTag('59',qrTextNormalize(x.account_name).slice(0,25))+qrEmvTag('60','VIETNAM')+qrEmvTag('62',qrEmvTag('08',x.remark))+'6304';return s+qrEmvCRC(s)}
async function reviewedQrApi(req,env){
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 let email;try{email=await identify(req,env)}catch{return reply({error:'Access denied'},403)}
 if(!env.DB)return reply({error:'D1 unavailable'},503);
 if(req.headers.get('Origin')!==new URL(req.url).origin||req.headers.get('X-Portal-QR')!=='review-v1'||!/^application\/json/.test(req.headers.get('Content-Type')||''))return reply({error:'Origin denied'},403);
 if(Number(req.headers.get('Content-Length')||0)>235000)return reply({error:'Too large'},413);
 let body;try{body=await req.json()}catch{return reply({error:'Invalid JSON'},400)}
 const x=body?.row;
 if(!x||!['preview','approve'].includes(body.action)||body.schema!=='bidvqrgen-parent-qr-manifest/1'||body.school_id!=='TRUNGVUONG')return reply({error:'Invalid manifest'},400);
 for(const k of ['student_name','class_name','charge_name','account_name','remark','bank_bin','account_number','qr_payload','qr_png_base64'])if(typeof x[k]!=='string')return reply({error:'Missing '+k},400);
 if([x.student_name,x.class_name,x.charge_name,x.account_name].some(v=>!v.trim()||v.length>120))return reply({error:'Invalid identity or charge'},422);
 if(x.bank_bin!=='970418'||!/^[A-Za-z0-9]{4,34}$/.test(x.account_number)||!/^[A-Za-z0-9 _.-]{1,95}$/.test(x.remark)||!Number.isSafeInteger(x.amount)||x.amount<=0||x.amount>10000000)return reply({error:'Invalid BIDV data'},422);
 if(!/^[A-Za-z0-9+/=]+$/.test(x.qr_png_base64)||x.qr_png_base64.length<100||x.qr_png_base64.length>=175000||!x.qr_png_base64.startsWith('iVBORw0KGgo'))return reply({error:'Invalid QR PNG'},422);
 let png;try{png=atob(x.qr_png_base64)}catch{return reply({error:'Malformed QR PNG'},422)}
 if(png.length<200||png.length>140000||png.slice(0,8)!=='\x89PNG\r\n\x1a\n'||png.slice(12,16)!=='IHDR')return reply({error:'Not a valid PNG signature'},422);
 const dimension=i=>((png.charCodeAt(i)*16777216)+(png.charCodeAt(i+1)*65536)+(png.charCodeAt(i+2)*256)+png.charCodeAt(i+3));
 const w=dimension(16),h=dimension(20);
 if(w<180||w>1200||h<180||h>1200)return reply({error:'Invalid QR image dimensions'},422);
 if(x.qr_payload.length>600||x.qr_payload!==qrBuildEmv(x))return reply({error:'EMV payload mismatch'},422);
 const rs=await env.DB.prepare("SELECT c.id,c.name,c.payment_reference,c.payment_account,c.amount_due,c.qr_verified,c.qr_amount,s.uid,s.display_name,s.class_name,p.label period_label,COALESCE(SUM(CASE WHEN pay.status='confirmed' THEN pa.amount ELSE 0 END),0) paid FROM charges c JOIN students s ON s.uid=c.student_uid JOIN billing_periods p ON p.id=c.period_id LEFT JOIN payment_allocations pa ON pa.charge_id=c.id LEFT JOIN payments pay ON pay.id=pa.payment_id WHERE s.school_id='TRUNGVUONG' AND s.uid LIKE 'tv_demo_%' AND c.published=1 AND (c.payment_reference=? OR c.payment_reference=?) GROUP BY c.id").bind(x.remark,x.account_number).all();
 const matchingStudent=c=>qrTextNormalize(c.display_name)===qrTextNormalize(x.student_name)&&qrTextNormalize(c.class_name)===qrTextNormalize(x.class_name);
 let candidates=(rs.results||[]).filter(matchingStudent);
 let matchedBy='REFERENCE';
 if(candidates.length!==1){
   // AccountNumber from bank's Excel may not equal D1's offline reference.
   // DEMO fallback is diagnostic and MUST be resolved by explicit bank-app verification.
   const alt=await env.DB.prepare("SELECT c.id,c.name,c.payment_reference,c.payment_account,c.amount_due,c.qr_verified,c.qr_amount,s.uid,s.display_name,s.class_name,p.label period_label,COALESCE(SUM(CASE WHEN pay.status='confirmed' THEN pa.amount ELSE 0 END),0) paid FROM charges c JOIN students s ON s.uid=c.student_uid JOIN billing_periods p ON p.id=c.period_id LEFT JOIN payment_allocations pa ON pa.charge_id=c.id LEFT JOIN payments pay ON pay.id=pa.payment_id WHERE s.school_id='TRUNGVUONG' AND s.uid LIKE 'tv_demo_%' AND c.published=1 AND s.display_name=? AND UPPER(s.class_name)=? GROUP BY c.id").bind(x.student_name,x.class_name.toUpperCase()).all();
   const fee=qrTextNormalize(x.charge_name),cat=v=>/BHYT|BH Y TE/.test(v)?'YT':/BHTT|THAN THE/.test(v)?'TT':/BAN TRU/.test(v)?'BT':null;
   const month=String(x.account_number).toUpperCase().match(/BT(0[1-9]|1[0-2])$/)?.[1]||null;
   candidates=(alt.results||[]).filter(c=>matchingStudent(c)&&(qrTextNormalize(c.name)===fee||(cat(fee)&&cat(fee)===cat(qrTextNormalize(c.name))))&&(!month||c.period_label.includes('Tháng '+Number(month)+'/')));
   if(candidates.length===1)matchedBy='STUDENT_FEE_PERIOD';
 }
 if(candidates.length!==1)return reply({status:'HELD',reason:candidates.length?'AMBIGUOUS_CHARGE_MATCH':'NO_EXACT_STUDENT_CHARGE_MATCH',next:'Check exact bank virtual account and billing period'},422);
 const c=candidates[0],remaining=c.amount_due-c.paid;
 const referenceMismatch=!(x.remark===c.payment_reference||x.account_number===c.payment_reference);
 if(matchedBy!=='REFERENCE'&&!referenceMismatch)return reply({status:'HELD',reason:'REFERENCE_MATCH_STATE_UNEXPECTED'},422);
 if(c.payment_account&&c.payment_account!==x.account_number)return reply({status:'HELD',reason:'ACCOUNT_CONFLICT'},422);
 if(remaining<=0||remaining!==x.amount)return reply({status:'HELD',reason:'AMOUNT_CHANGED',remaining},422);
 const name=qrTextNormalize(x.charge_name),expected=qrTextNormalize(c.name);
 const cat=v=>/BHYT|BH Y TE/.test(v)?'YT':/BHTT|THAN THE/.test(v)?'TT':/BAN TRU/.test(v)?'BT':null;
 if(name!==expected&&!(cat(name)&&cat(name)===cat(expected)))return reply({status:'HELD',reason:'FEE_MISMATCH',expected:c.name},422);
 const info={charge_id:c.id,student:c.display_name,class_name:c.class_name,charge_name:c.name,period:c.period_label,due:c.amount_due,paid:c.paid,remaining,account:x.account_number,bin:x.bank_bin,remark:x.remark,payee:x.account_name,previously_verified:c.qr_verified,matched_by:matchedBy,reference_mismatch:referenceMismatch,existing_payment_reference:c.payment_reference,warning:referenceMismatch?'MÃ TÀI KHOẢN QR KHÁC MÃ THAM CHIẾU D1. Chỉ duyệt sau khi xác minh ngân hàng đã cấp đúng tài khoản cho khoản/kỳ này.':null};
 if(body.action==='preview')return reply({status:'PREVIEW',info,note:'Manually scan QR in bank app and verify payee, account, remark and remaining amount'});
 if(body.confirm!=='I_VERIFIED_QR_WITH_BANK_APP'||body.charge_id!==c.id)return reply({error:'Missing verification confirmation'},403);
 if(referenceMismatch&&body.confirm_reference_mismatch!=='I_VERIFIED_ACCOUNT_MAPPING')return reply({status:'HELD',reason:'ACCOUNT_REFERENCE_MISMATCH_CONFIRMATION_REQUIRED',info},409);
 const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x.qr_payload)))).map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,24);
 const update=env.DB.prepare("UPDATE charges SET payment_account=?,qr_png_base64=?,qr_amount=?,qr_verified=1,qr_source=?,revision=revision+1 WHERE id=? AND published=1 AND (payment_account IS NULL OR payment_account=?) AND amount_due-COALESCE((SELECT SUM(pa.amount) FROM payment_allocations pa JOIN payments p ON p.id=pa.payment_id WHERE pa.charge_id=charges.id AND p.status='confirmed'),0)=?").bind(x.account_number,x.qr_png_base64,x.amount,'DEMO_ONLY',c.id,x.account_number,x.amount);
 const audit=env.DB.prepare("INSERT INTO audit_events(id,school_id,event_type,target_id,created_at) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),'TRUNGVUONG','DEMO_QR_APPROVED:'+email+':'+fingerprint,c.id,new Date().toISOString());
 let result;try{result=await env.DB.batch([update,audit])}catch{return reply({error:'D1 QR verification failed'},503)}
 if(!result?.[0]?.meta?.changes)return reply({status:'NEEDS_REVIEW',info},409);
 return reply({status:'QR_VERIFIED',info});
}
