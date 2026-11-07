/* Parent Portal staging only. No remote writes. All input is processed in the browser. */
(function () {
  'use strict';
  const SCHEMA = 'school-parent-payments-draft/2';
  const plain = x => String(x ?? '').trim();
  const norm = x => plain(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  function dobISO(value) {
    const v = plain(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const match = /^(\d{2})[\/-](\d{2})[\/-](\d{4})$/.exec(v);
    return match ? match[3]+'-'+match[2]+'-'+match[1] : '';
  }
  function periodKey(value) {
    const s = norm(value);
    let m = /(?:^|\D)(20\d{2})[ -](0?[1-9]|1[0-2])(?:$|\D)/.exec(s);
    if (m) return m[1]+'-'+m[2].padStart(2,'0');
    m = /(?:^|\D)(0?[1-9]|1[0-2])[ -](20\d{2})(?:$|\D)/.exec(s);
    if (m) return m[2]+'-'+m[1].padStart(2,'0');
    m = /(20\d{2})[ -](20\d{2})/.exec(s);
    return m ? m[1]+'-'+m[2] : '';
  }
  function feeKey(value) {
    let s = norm(value);
    if (/^(bh|bao hiem) y te(?: bhyt)?$/.test(s)) return 'BHYT';
    if (/^(bh|bao hiem) than the(?: bhtt)?$/.test(s)) return 'BHTT';
    s = s.replace(/ thang (0?[1-9]|1[0-2])(?: 20\d{2})?$/, '');
    return s;
  }
  const identity = (name,cls,dob) => [norm(name),norm(cls),dobISO(dob)].join('|');
  function refKey(t) {
    const src = plain(t.ref || t.bankTransactionId || t.transactionId || t.id);
    const clean = src.toUpperCase().replace(/[^A-Z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,60);
    return clean ? 'DEMO-TV-'+clean : '';
  }
  const hold = (held,why,t) => held.push({reason:why,source_ref:refKey(t),amount:Number(t.amount)||0});
  async function buildDraft() {
    const input=document.querySelector('#parentChargeReference');
    try {
      if (!input?.files?.length) throw Error('Chưa chọn bảng tham chiếu D1 riêng tư.');
      const reference=JSON.parse(await input.files[0].text());
      if (reference.schema!=='parent-portal-charge-reference/1'||reference.school_id!=='TRUNGVUONG'||reference.mode!=='demo_only'||reference.count!==60||!Array.isArray(reference.charges)||reference.charges.length!==60) throw Error('Bảng tham chiếu không hợp lệ hoặc không phải bộ 60 khoản giả lập.');
      const map=new Map(),usedPortalIds=new Set();
      for(const x of reference.charges) {
        if (!/^tv_charge_[a-z0-9]{16,40}$/.test(plain(x.portal_charge_id)) || !plain(x.student_name) || !plain(x.birth_date) || !plain(x.class_name) || !Number.isSafeInteger(x.amount_due) || x.amount_due<=0) throw Error('Bảng tham chiếu chứa dữ liệu không hợp lệ.');
        if(usedPortalIds.has(x.portal_charge_id))throw Error('Trùng portal_charge_id trong bảng tham chiếu.');
        usedPortalIds.add(x.portal_charge_id);
        const key=[identity(x.student_name,x.class_name,x.birth_date),periodKey(x.period_id)||periodKey(x.period_label),feeKey(x.charge_name),x.amount_due].join('|');
        if(!map.has(key))map.set(key,[]);
        map.get(key).push(x);
      }
      const [students,rawTransactions]=await Promise.all([all('students'),all('transactions')]);
      const active=new Map(students.filter(s=>s.status!=='inactive').map(s=>[plain(s.code),s]));
      const resolved=reconcileTransactions(students,rawTransactions);
      const payments=[],held=[],refs=new Set();
      for(const t of resolved) {
        const amount=Number(t.amount);
        if(t.paymentStatus!=='valid'){if(amount>0)hold(held,'NOT_CONFIRMED_OR_UNMATCHED',t);continue;}
        const student=active.get(plain(t.studentCode));
        const ids=transactionMatchedItemIds(t);
        if(!student||ids.length!==1||!Number.isSafeInteger(amount)||amount<=0){hold(held,'MANUAL_REVIEW_REQUIRED',t);continue;}
        const item=studentDueItems(student).find(x=>plain(x.id)===plain(ids[0]));
        if(!item||item.legacy||!Number.isSafeInteger(Number(item.amount))||Number(item.amount)<amount){hold(held,'INVALID_SCHOOL_CHARGE_OR_AMOUNT',t);continue;}
        const period=periodKey(item.periodId || item.period);
        const key=[identity(student.name,student.className,student.birthDate),period,feeKey(item.name),Number(item.amount)].join('|');
        const matches=map.get(key)||[];
        if(!period||matches.length!==1){hold(held,matches.length>1?'AMBIGUOUS_PORTAL_CHARGE':'NO_EXACT_PORTAL_MATCH',t);continue;}
        const source_ref=refKey(t);
        if(!source_ref||refs.has(source_ref)){hold(held,'MISSING_OR_DUPLICATE_REF',t);continue;}
        refs.add(source_ref);
        const paid_at_source=plain(t.date || t.paidAt);
        // Do not guess ambiguous dates; require ISO with timezone to be eligible for API.
        const dateOK=/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(paid_at_source)&&Number.isFinite(Date.parse(paid_at_source));
        if(!dateOK){hold(held,'DATE_NEEDS_VERIFICATION',t);continue;}
        payments.push({source_ref,charge_id:matches[0].portal_charge_id,school_charge_id:plain(item.id),school_student_id:plain(student.code),student_name:plain(student.name),class_name:plain(student.className),period_id:period,charge_name:plain(item.name),amount,paid_at:paid_at_source,mapping_status:'MATCHED_EXACT_DEMO'});
      }
      if(!payments.length)throw Error('Chưa có giao dịch đủ điều kiện. Có '+held.length+' giao dịch cần rà soát. Hãy dùng dữ liệu DEMO đã xác minh trước khi đồng bộ.');
      const draft={schema:SCHEMA,school_id:'TRUNGVUONG',status:'OFFLINE_PAYMENT_DRAFT_NOT_APPROVED',mode:'demo_only',generated_at:new Date().toISOString(),reference_generated_at:reference.generated_at,summary:{matched:payments.length,held:held.length,total_matched:payments.reduce((a,b)=>a+b.amount,0)},payments,held};
      return draft;
    } catch(err) {
      throw err;
    }
  }
  const PORTAL_ORIGIN='https://school-parent-dev.tuananh0001.workers.dev';
  async function exportPreview(){
    const status=document.querySelector('#parentPaymentsExportStatus');
    try{
      const draft=await buildDraft();
      download('TRUNGVUONG_PAYMENTS_MAPPED_DRAFT_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(draft,null,2),'application/json;charset=utf-8');
      if(status)status.textContent='Đã tạo bản nháp '+draft.payments.length+' giao dịch, '+draft.held.length+' giao dịch giữ lại. Chưa ghi lên Cloudflare.';
    }catch(e){if(status)status.textContent=e.message;console.error(e)}
  }
  async function connectDemo(){
    const status=document.querySelector('#parentPaymentsExportStatus');
    // Use a user gesture to open Access without browser popup blocking.
    const popup=window.open(PORTAL_ORIGIN+'/admin/live-bridge','tvParentPortalDemoBridge');
    if(!popup){if(status)status.textContent='Trình duyệt chặn cửa sổ. Hãy cho phép popup rồi thử lại.';return}
    let draft;
    try{draft=await buildDraft()}catch(e){popup.close();if(status)status.textContent='Chưa thể đối chiếu: '+e.message;return}
    if(draft.payments.length>30){popup.close();if(status)status.textContent='Lô vượt 30 giao dịch, hãy chia lô theo lớp/kỳ trên bản nháp.';return}
    const listener=ev=>{
      if(ev.origin!==PORTAL_ORIGIN||ev.source!==popup||ev.data?.type!=='TV_PORTAL_READY'||!/^([a-f0-9]{40})$/.test(ev.data.challenge||''))return;
      window.removeEventListener('message',listener);
      popup.postMessage({type:'TV_PORTAL_DRAFT',challenge:ev.data.challenge,draft},PORTAL_ORIGIN);
      if(status)status.textContent='Đã gửi bản nháp '+draft.payments.length+' giao dịch tới trang quản trị. Cần kiểm tra và duyệt trên Cloudflare; không ghi tự động.';
    };
    window.addEventListener('message',listener);
    popup.postMessage({type:'TV_PORTAL_HELLO'},PORTAL_ORIGIN);
    if(status)status.textContent='Đang mở Cloudflare Access. Đăng nhập tại cửa sổ mới để tiếp tục.';
  }
  document.addEventListener('DOMContentLoaded',()=>{
    const tester = new URLSearchParams(location.search).get('parentSyncPreview') === '1';
    const panel=document.querySelector('#parentPaymentsPreviewPanel');
    if(panel)panel.hidden=!tester;
    if(tester){
      document.querySelector('#exportParentPaymentsPreview')?.addEventListener('click',exportPreview);
      document.querySelector('#sendParentPaymentsPreview')?.addEventListener('click',connectDemo);
    }
  });
})();
