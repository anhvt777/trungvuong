async function reviewedQrPage(req,env){
 if(req.method!=='GET')return new Response('Method not allowed',{status:405});
 try{await identify(req,env)}catch{return new Response('Access denied',{status:403})}
 const html=String.raw`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Duyệt QR Trưng Vương</title>
<style>body{margin:0;background:#edf6f2;color:#143e3c;font:15px system-ui}main{max-width:1000px;margin:28px auto;background:white;padding:26px;border-radius:18px}h1{font-size:25px}button,input,select{font:inherit;padding:10px}button{background:#087e72;color:white;border:0;border-radius:8px;cursor:pointer;margin:6px}button:disabled{opacity:.5}select,input[type=file]{width:100%;box-sizing:border-box;border:1px solid #bdd4cb;border-radius:8px}img{max-width:280px;max-height:280px;border:1px solid #d4e4de}pre{background:#edf5f2;white-space:pre-wrap;overflow-wrap:anywhere;padding:14px}.warn{background:#fff0ce;padding:13px;border-radius:9px}.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:700px){.two{grid-template-columns:1fr}}a{color:#057e71}</style><main><h1>Duyệt QR từ bộ sinh QR BIDV – Trưng Vương</h1><p class="warn"><b>THỬ NGHIỆM 15 HỌC SINH.</b> Chỉ chọn file JSON vừa xuất từ bidvqrgen. Mọi QR phải kiểm tra thủ công bằng app ngân hàng trước khi công bố. Không tải dữ liệu học sinh thật.</p><p><a href="/admin/qr-status">Trạng thái QR</a> · <a href="/admin/reconciliation">Đối chiếu thu</a></p>
<label>1. Chọn danh mục QR đã xuất ở bidvqrgen <input id="file" type="file" accept=".json,application/json"></label><p id="counter" role="status"></p>
<label>2. Chọn một QR cần kiểm tra <select id="choice" disabled><option>Chưa có dữ liệu</option></select></label>
<div class="two"><div><h3>Ảnh QR nguồn</h3><img id="qr" alt="Ảnh QR nguồn" hidden><p id="details"></p></div><div><h3>Kết quả đối chiếu D1</h3><pre id="result">Chưa kiểm tra</pre></div></div>
<button id="preview" disabled>3. Đối chiếu với dữ liệu D1</button>
<label><input type="checkbox" id="verified" disabled> Tôi đã quét QR bằng ứng dụng ngân hàng, kiểm tra đúng tên thụ hưởng, tài khoản, nội dung định danh và số tiền</label><label class="warn" id="referenceWarning" hidden><input type="checkbox" id="referenceConfirmed"> TÀI KHOẢN QR KHÁC MÃ THAM CHIẾU D1. Tôi đã đối chiếu với danh sách tài khoản định danh BIDV được cấp cho đúng học sinh, khoản và kỳ thu; chấp nhận liên kết có kiểm soát.</label>
<button id="approve" disabled>4. Công bố QR đã kiểm tra (DEMO)</button><p id="status" role="status"></p>
<script>
(()=>{
let items=[],current=null,checked=null;
const e=id=>document.getElementById(id),reset=()=>{e('verified').checked=false;e('verified').disabled=true;e('approve').disabled=true;e('referenceConfirmed').checked=false;e('referenceWarning').hidden=true;checked=null};
const SRC='https://anhvt777.github.io';
if(window.opener){
 const challenge=Array.from(crypto.getRandomValues(new Uint8Array(20)),v=>v.toString(16).padStart(2,'0')).join('');
 const ready=()=>window.opener.postMessage({type:'BIDV_QR_PORTAL_READY',challenge},SRC);
 ready();
 window.addEventListener('message',ev=>{
   if(ev.origin!==SRC||ev.source!==window.opener)return;
   if(ev.data?.type==='BIDV_QR_PORTAL_HELLO'){ready();return}
   if(ev.data?.type!=='BIDV_QR_PORTAL_DRAFT'||ev.data.challenge!==challenge)return;
   const data=ev.data.manifest;
   if(!data||data.schema!=='bidvqrgen-parent-qr-manifest/1'||data.school_id!=='TRUNGVUONG'||data.status!=='UNVERIFIED_QR_DRAFT'||!Array.isArray(data.rows)||data.rows.length>200){e('counter').textContent='Bản nháp gửi trực tiếp không hợp lệ';return}
   const txt=JSON.stringify(data);
   if(txt.length>12000000){e('counter').textContent='Bản nháp quá lớn';return}
   const dt=new DataTransfer();dt.items.add(new File([txt],'TRUNGVUONG_QR_DRAFT.json',{type:'application/json'}));
   e('file').files=dt.files;e('file').dispatchEvent(new Event('change'));
   e('status').textContent='Đã nhận danh mục từ bidvqrgen. Chưa công bố QR nào.';
 });
}

function show(){
 reset();current=items[Number(e('choice').value)]||null;
 e('qr').hidden=!current;
 if(!current)return;
 e('qr').src='data:image/png;base64,'+current.qr_png_base64;
 e('details').textContent=current.student_name+' · '+current.class_name+' · '+current.charge_name+' · '+current.amount.toLocaleString('vi-VN')+'đ · Tài khoản '+current.account_number+' · Nội dung '+current.remark;
 e('result').textContent='Chưa đối chiếu D1';e('preview').disabled=false;
}
e('file').addEventListener('change',async ev=>{
 reset();items=[];e('preview').disabled=true;e('choice').disabled=true;e('qr').hidden=true;
 const f=ev.target.files[0];if(!f)return;
 if(f.size>12000000){e('counter').textContent='File quá lớn (giới hạn 12MB)';return}
 try{
  const d=JSON.parse(await f.text());
  if(d.schema!=='bidvqrgen-parent-qr-manifest/1'||d.school_id!=='TRUNGVUONG'||d.status!=='UNVERIFIED_QR_DRAFT'||!Array.isArray(d.rows)||d.rows.length>200)throw Error('Sai mẫu danh mục QR Trưng Vương');
  items=d.rows;
  e('counter').textContent='Có '+items.length+' QR; '+(d.held?.length||0)+' dòng chưa hợp lệ, cần kiểm tra riêng.';
  e('choice').innerHTML='';
  items.forEach((x,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=x.class_name+' – '+x.student_name+' – '+x.charge_name+' – '+Number(x.amount).toLocaleString('vi-VN')+'đ';e('choice').appendChild(opt)});
  e('choice').disabled=!items.length;
  show();
 }catch(err){e('counter').textContent='Không đọc được: '+err.message}
});
e('choice').addEventListener('change',show);
async function api(action){
 const r=await fetch('/api/admin/qr-review',{method:'POST',headers:{'Content-Type':'application/json','X-Portal-QR':'review-v1'},credentials:'same-origin',body:JSON.stringify({action,school_id:'TRUNGVUONG',schema:'bidvqrgen-parent-qr-manifest/1',row:current,charge_id:checked?.charge_id,confirm:action==='approve'?'I_VERIFIED_QR_WITH_BANK_APP':'',confirm_reference_mismatch:e('referenceConfirmed').checked?'I_VERIFIED_ACCOUNT_MAPPING':''})});
 let d;try{d=await r.json()}catch{d={error:'Không đọc được phản hồi'}}return {ok:r.ok,data:d};
}
e('preview').addEventListener('click',async()=>{reset();e('preview').disabled=true;try{const r=await api('preview');e('result').textContent=JSON.stringify(r.data,null,2);if(r.ok&&r.data.status==='PREVIEW'){checked=r.data.info;e('verified').disabled=false;e('referenceWarning').hidden=!checked.reference_mismatch;e('status').textContent=checked.reference_mismatch?'Khác mã D1! Cần xác minh tài khoản BIDV và đánh dấu xác nhận liên kết trước khi duyệt.':'Đối chiếu D1 khớp. Hãy quét QR thật bằng app ngân hàng để xác minh.'}else e('status').textContent='QR chưa đủ điều kiện công bố.'}catch{e('status').textContent='Không kết nối được API. Chưa ghi D1.'}finally{e('preview').disabled=false}});
function updateApproval(){e('approve').disabled=!(checked&&e('verified').checked&&(!checked.reference_mismatch||e('referenceConfirmed').checked))}
e('verified').addEventListener('change',updateApproval);e('referenceConfirmed').addEventListener('change',updateApproval);
e('approve').addEventListener('click',async()=>{if(!checked||!e('verified').checked||(checked.reference_mismatch&&!e('referenceConfirmed').checked)||!confirm('Anh xác nhận đã quét QR bằng app ngân hàng và kiểm tra đúng mọi thông tin trước khi công bố DEMO?'))return;e('approve').disabled=true;e('preview').disabled=true;try{const r=await api('approve');e('result').textContent=JSON.stringify(r.data,null,2);e('status').textContent=r.ok&&r.data.status==='QR_VERIFIED'?'Đã ghi QR đã được cán bộ xác nhận vào D1.':'Chưa công bố. Kiểm tra kết quả.'}catch{e('status').textContent='Lỗi xác nhận. Kiểm tra trạng thái trước khi thử lại.'}finally{e('preview').disabled=false;reset()}});
})();
</script></main></html>`;
 return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private,no-store','X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; base-uri 'none'; frame-ancestors 'none'"}});
}