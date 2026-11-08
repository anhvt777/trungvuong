async function qrEngineV1Page(req,env){
 if(req.method!=='GET')return new Response('Method not allowed',{status:405});
 try{await identify(req,env)}catch{return new Response('Access required',{status:403})}
 const page=`<!DOCTYPE html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BIDV QR Engine V1 – Trưng Vương</title><style>body{margin:0;background:#edf6f2;font:15px system-ui;color:#163e40}main{max-width:960px;margin:28px auto;background:white;padding:28px;border-radius:16px}h1{font-size:25px}select,button{font:inherit;padding:12px;border-radius:9px}select{width:100%;border:1px solid #a9c9c5}button{color:white;background:#067b72;border:0;cursor:pointer;margin:14px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f0f6f4;border-radius:8px;padding:16px}.notice{background:#fff0cd;padding:14px;border-radius:8px}a{color:#067b72}.meta{margin:12px 0}</style><main><h1>BIDV QR Engine V1 – Trưng Vương</h1><p class="notice"><strong>MÔI TRƯỜNG GIẢ LẬP.</strong> Trang này chỉ đọc số liệu đã duyệt trên D1, kiểm tra số dư và điều kiện tạo QR. Không tạo mã thanh toán ngân hàng nếu tài khoản chưa xác minh. Chưa công bố QR nào từ thao tác kiểm thử.</p><p><a href="/admin/qr-review">Duyệt QR từ bidvqrgen</a> · <a href="/admin/reconciliation">Báo cáo thu</a> · <a href="/admin/qr-status">Tình trạng QR</a></p><div id="summary" class="meta">Đang tải dữ liệu DEMO…</div><label>Chọn khoản thu để xem trước QR <select id="charge" disabled><option>Đang tải…</option></select></label><p><button id="preview" disabled>Kiểm tra số dư và phiên bản QR</button></p><pre id="result">Chưa kiểm tra</pre>
<script>
(async()=>{
const $=id=>document.getElementById(id),fmt=v=>Number(v||0).toLocaleString('vi-VN')+'đ';
try{
 const res=await fetch('/api/admin/qr-engine/list',{credentials:'same-origin',cache:'no-store'});
 if(!res.ok)throw Error('D1 list HTTP '+res.status);
 const data=await res.json();const list=data.rows||[];
 $('summary').textContent='BIDV QR Engine '+data.qr_engine_version+' · '+data.students+' học sinh giả lập · '+data.charges+' khoản thu · '+list.filter(x=>x.qr_verified).length+' QR đã xác minh';
 $('charge').innerHTML='';
 for(const row of list){const opt=document.createElement('option');opt.value=row.charge_id;opt.textContent=row.class_name+' · '+row.student+' · '+row.charge+' · '+row.period+' · còn '+fmt(row.remaining);$('charge').appendChild(opt)}
 $('charge').disabled=!list.length;$('preview').disabled=!list.length;
}catch(e){$('summary').textContent='Không lấy được dữ liệu: '+e.message}
$('preview').addEventListener('click',async()=>{
 $('preview').disabled=true;$('result').textContent='Đang kiểm tra...';
 try{
 const res=await fetch('/api/admin/qr-engine/preview',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-QR-Engine':'v1'},body:JSON.stringify({charge_id:$('charge').value})});
 const data=await res.json();$('result').textContent=JSON.stringify(data,null,2);
 }catch(e){$('result').textContent='Lỗi API: '+e.message}
 finally{$('preview').disabled=false}
});
})();
</script></main></html>`;
return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}