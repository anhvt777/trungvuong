
async function qrEngineV1List(req,env){
 if(req.method!=='GET')return reply({error:'METHOD_NOT_ALLOWED'},405);
 try{await identify(req,env)}catch{return reply({error:'ADMIN_ACCESS_REQUIRED'},403)}
 if(!env.DB)return reply({error:'D1_UNAVAILABLE'},503);
 const data=await env.DB.prepare("SELECT c.id,c.name,c.amount_due,c.qr_verified,c.qr_amount,c.qr_engine_version,c.qr_renderer_version,s.display_name,s.class_name,p.label AS period,COALESCE(SUM(CASE WHEN pay.status='confirmed' THEN pa.amount ELSE 0 END),0) AS paid FROM charges c JOIN students s ON s.uid=c.student_uid JOIN billing_periods p ON p.id=c.period_id LEFT JOIN payment_allocations pa ON pa.charge_id=c.id LEFT JOIN payments pay ON pay.id=pa.payment_id WHERE s.school_id='TRUNGVUONG' AND s.uid LIKE 'tv_demo_%' GROUP BY c.id ORDER BY s.class_name,s.display_name,p.label,c.name").all();
 const rows=(data.results||[]).map(r=>({charge_id:r.id,student:r.display_name,class_name:r.class_name,charge:r.name,period:r.period,due:r.amount_due,paid:r.paid,remaining:Math.max(0,r.amount_due-r.paid),qr_verified:r.qr_verified===1,qr_engine_version:r.qr_engine_version,qr_renderer_version:r.qr_renderer_version}));
 return reply({status:'DEMO_ONLY',qr_engine_version:BIDVQREngine.version,students:new Set(rows.map(x=>x.student+'|'+x.class_name)).size,charges:rows.length,rows});
}
