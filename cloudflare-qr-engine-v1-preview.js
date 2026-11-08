async function qrEngineV1Preview(req,env){
 let email;try{email=await identify(req,env)}catch{return reply({error:'ADMIN_ACCESS_REQUIRED'},403)}
 if(!env.DB)return reply({error:'D1_UNAVAILABLE'},503);
 if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
 if(req.headers.get('Origin')!==new URL(req.url).origin||req.headers.get('X-QR-Engine')!=='v1'||!(req.headers.get('Content-Type')||'').startsWith('application/json'))return reply({error:'ORIGIN_OR_HEADER_INVALID'},403);
 let input;try{const t=await req.text();if(t.length>2500)throw Error('TOO_LARGE');input=JSON.parse(t)}catch{return reply({error:'INVALID_REQUEST'},400)}
 const id=String(input?.charge_id||'');
 if(!/^tv_charge_[a-f0-9]{24}$/.test(id))return reply({error:'INVALID_DEMO_CHARGE'},422);
 const c=await env.DB.prepare("SELECT c.id,c.amount_due,c.payment_account,c.payment_reference,c.qr_verified,c.qr_source,c.qr_amount,c.qr_payee_name,c.qr_remark,c.qr_engine_version,c.qr_renderer_version,s.display_name,s.class_name,p.label AS period,COALESCE(SUM(CASE WHEN pay.status='confirmed' THEN pa.amount ELSE 0 END),0) paid FROM charges c JOIN students s ON s.uid=c.student_uid JOIN billing_periods p ON p.id=c.period_id LEFT JOIN payment_allocations pa ON pa.charge_id=c.id LEFT JOIN payments pay ON pay.id=pa.payment_id WHERE c.id=? AND s.school_id='TRUNGVUONG' AND s.uid LIKE 'tv_demo_%' GROUP BY c.id").bind(id).first();
 if(!c)return reply({error:'DEMO_CHARGE_NOT_FOUND'},404);
 const remaining=Math.max(0,Number(c.amount_due)-Number(c.paid));
 const base={school_id:'TRUNGVUONG',mode:'demo_only',qr_engine_version:BIDVQREngine.version,charge_id:c.id,period:c.period,due:c.amount_due,paid:c.paid,remaining,account_verified:Number(c.qr_verified)===1};
 if(!remaining)return reply({...base,status:'ALREADY_PAID',payload:null});
 if(!(c.payment_account&&Number(c.qr_verified)===1))return reply({...base,status:'BANK_ACCOUNT_UNVERIFIED',payload:null,note:'Không phát sinh QR thanh toán khi tài khoản ngân hàng chưa được xác minh.'});
 if(c.qr_amount!==remaining)return reply({...base,status:'STALE_QR_AMOUNT',payload:null,note:'Cần xác minh lại QR với số dư mới.'});
 if(c.qr_engine_version!==BIDVQREngine.version||c.qr_renderer_version!=='1.0.0'||!c.qr_payee_name||!c.qr_remark)return reply({...base,status:'REAPPROVAL_REQUIRED',payload:null,note:'Thiếu thông tin thụ hưởng hoặc phiên bản QR V1.'});
 const data={bankBin:BIDVQREngine.bankBin,accountNumber:c.payment_account,accountName:c.qr_payee_name,amount:remaining,remark:c.qr_remark};
 let payload;try{payload=BIDVQREngine.generate(data)}catch{return reply({...base,status:'INVALID_VERIFIED_QR_DATA',payload:null})}
 return reply({...base,status:'PREVIEW_VERIFIED_QR',payload,crc_valid:BIDVQREngine.verify(data,payload)});
}