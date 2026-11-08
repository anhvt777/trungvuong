// Run from repository root: node --test tests/partial-payments.test.mjs
// These are isolated regression checks for the staged payment calculations.
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const from = source.indexOf('function paidAmountsByItem(');
const to = source.indexOf('function renderStudents(', from);
assert(from !== -1 && to > from, 'Cannot locate financial summary logic');
const context = vm.createContext({
  FEES: [{ key: 'service', label: 'Dịch vụ bán trú' }],
  transactionMatchedItemIds: tx => tx.matchedDueItemIds || [],
  studentDueItems: student => student.dueItems,
  Map, Set, Object, Math, Number,
});
vm.runInContext(source.slice(from, to) + '\nthis.api={paidAmountsByItem,feeSummaries,totals};', context);
const { api } = context;
const student = { code: 'TV01', dueItems: [{ id: 'BT11', name: 'Bán trú tháng 11', category: 'service', amount: 600000 }] };
const payment = (ref, amount, paymentStatus = 'valid', ids = ['BT11']) =>
  ({ ref, amount, studentCode: student.code, paymentStatus, matchedDueItemIds: ids });

test('two distinct partial payments accumulate without treating the charge as fully paid', () => {
  const r = api.totals([student], [payment('ref-1',100000),payment('ref-2',100000)]);
  assert.equal(r.due,600000);
  assert.equal(r.paid,200000);
  assert.equal(r.remain,400000);
  assert.equal(r.paidItems,0);
});
test('a fully settled charge counts as one fully paid item', () => {
  const r=api.totals([student],[payment('ref-1',250000),payment('ref-2',350000)]);
  assert.equal(r.paid,600000);
  assert.equal(r.paidItems,1);
  assert.equal(r.remain,0);
});
test('reversed and duplicate transactions are excluded from confirmed amount', () => {
  const r=api.totals([student],[payment('a',100000),payment('b',200000,'duplicate'),payment('c',100000,'reversed')]);
  assert.equal(r.paid,100000);
  assert.equal(r.remain,500000);
});
test('unverifiable multi-item transaction is excluded rather than guessed', () => {
  const r=api.totals([student],[payment('bundle',200000,'valid',['BT11','YT'])]);
  assert.equal(r.paid,0);
});
test('the summary does not count over the configured obligation', () => {
  const r=api.totals([student],[payment('a',700000)]);
  assert.equal(r.paid,600000);
  assert.equal(r.remain,0);
});

test('a bundle covering two known full charges is allocated exactly once per charge', () => {
  const two={code:'TV01',dueItems:[
    {id:'BT11',category:'service',amount:600000},
    {id:'YT',category:'service',amount:683100},
  ]};
  const tx=[payment('bundle-valid',1283100,'valid',['BT11','YT'])];
  const result=api.totals([two],tx);
  assert.equal(result.paid,1283100);
  assert.equal(result.paidItems,2);
  assert.equal(result.remain,0);
});
test('a non-exact bundled total is not silently split into charge amounts', () => {
  const two={code:'TV01',dueItems:[
    {id:'BT11',category:'service',amount:600000},
    {id:'YT',category:'service',amount:683100},
  ]};
  const tx=[payment('bundle-unclear',1200000,'valid',['BT11','YT'])];
  const result=api.totals([two],tx);
  assert.equal(result.paid,0);
  assert.equal(result.paidItems,0);
});
