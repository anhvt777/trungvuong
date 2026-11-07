/* Parent Portal payment reconciliation preview.
   Runs only when a school operator clicks the export button.
   No HTTP requests, no tokens, no direct Cloudflare mutation.
   Source transactions remain in local IndexedDB. */
(function () {
  'use strict';
  const SCHEMA = 'school-parent-payments-draft/1';
  function makeSafeRef(tx) {
    const raw = String(tx.ref || tx.bankTransactionId || tx.transactionId || tx.id || '').trim();
    const normalized = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    return normalized ? 'DEMO-TV-' + normalized : '';
  }
  async function exportParentPaymentsPreview() {
    const status = document.querySelector('#parentPaymentsExportStatus');
    try {
      const [students, stored] = await Promise.all([all('students'), all('transactions')]);
      const activeStudents = new Map(students.filter(s => s.status !== 'inactive').map(s => [String(s.code), s]));
      const resolved = reconcileTransactions(students, stored);
      const proposed = [], held = [], refs = new Set();
      for (const t of resolved) {
        if (t.paymentStatus !== 'valid') {
          if (t.amount > 0) held.push({ reason: 'NOT_CONFIRMED_OR_UNMATCHED', source: String(t.sourceType || ''), amount: Number(t.amount) || 0 });
          continue;
        }
        const student = activeStudents.get(String(t.studentCode || ''));
        const matched = transactionMatchedItemIds(t);
        const ref = makeSafeRef(t);
        const amount = Number(t.amount);
        const date = String(t.date || t.paidAt || '').trim();
        // Do not silently allocate one bank transfer over multiple items.
        if (!student || matched.length !== 1 || !ref || !Number.isSafeInteger(amount) || amount <= 0) {
          held.push({ reason: 'REQUIRES_MANUAL_ALLOCATION', amount: amount || 0 });
          continue;
        }
        const item = studentDueItems(student).find(x => x.id === matched[0]);
        if (!item || item.legacy || amount > Number(item.amount) || refs.has(ref)) {
          held.push({ reason: 'INVALID_OR_DUPLICATE_REFERENCE', reference: ref, amount });
          continue;
        }
        refs.add(ref);
        proposed.push({
          source_ref: ref,
          school_student_id: String(student.code),
          student_name: String(student.name || ''),
          class_name: String(student.className || ''),
          school_charge_id: String(item.id),
          charge_name: String(item.name || ''),
          period_id: String(item.periodId || item.period || ''),
          amount,
          paid_at_source: date,
          source_type: String(t.sourceType || ''),
          mapping_status: 'PENDING_PARENT_PORTAL_CHARGE_MAPPING'
        });
      }
      const draft = {
        schema: SCHEMA,
        school_id: 'TRUNGVUONG',
        status: 'OFFLINE_PAYMENT_DRAFT_NOT_APPROVED',
        generated_at: new Date().toISOString(),
        summary: { matched: proposed.length, held: held.length, amount: proposed.reduce((a,b) => a + b.amount, 0) },
        payments: proposed,
        held
      };
      const filename = 'TRUNGVUONG_PAYMENTS_PREVIEW_' + new Date().toISOString().slice(0,10) + '.json';
      download(filename, JSON.stringify(draft, null, 2), 'application/json;charset=utf-8');
      if (status) status.textContent = 'Đã tạo bản nháp: ' + proposed.length + ' giao dịch đủ điều kiện sơ bộ, ' + held.length + ' giao dịch cần kiểm tra. Chưa đồng bộ lên Cloudflare. Cần đối chiếu mã món thu trước khi công bố.';
    } catch (err) {
      console.error('Parent payments preview', err);
      if (status) status.textContent = 'Không thể xuất bản nháp đối chiếu. Vui lòng kiểm tra dữ liệu local.';
    }
  }
  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.querySelector('#exportParentPaymentsPreview');
    if (btn) btn.addEventListener('click', exportParentPaymentsPreview);
  });
})();
