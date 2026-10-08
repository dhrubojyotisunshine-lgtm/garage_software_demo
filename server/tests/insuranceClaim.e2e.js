// Insurance-claim end-to-end test. Run from server/: node tests/insuranceClaim.e2e.js
// Uses a throwaway local DB (ins_test_tmp, dropped at start and end) on port 5099; never touches the real DB.
process.chdir(__dirname + '/..');
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/ins_test_tmp';
process.env.PORT = '5099';
process.env.NODE_ENV = 'development';
require('dotenv').config({ path: '../.env' }); // does not override the vars above
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/ins_test_tmp';
process.env.PORT = '5099';

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('../index.js');
const Garage = require('../models/Garage');
const SparePart = require('../models/masters/SparePart');

const base = 'http://localhost:5099/api';
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + m); };

(async () => {
  await new Promise(r => setTimeout(r, 1500));
  await mongoose.connection.dropDatabase();
  const g = await new Garage({ firstName: 'T', workshopName: 'T', mobile: '9000000001', password: 'x', rtoNo: 'JH01', isVerified: true }).save();
  const token = jwt.sign({ id: g._id }, process.env.JWT_SECRET);
  const H = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
  const call = async (m, p, b) => { const r = await fetch(base + p, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined }); return { s: r.status, d: await r.json() }; };

  // masters
  let r = await call('POST', '/masters/insurance-companies', { name: 'Oriental Insurance', email: 'a@b.com', mobile: '9876543210', address: 'Ranchi', pincode: '834001' });
  ok(r.s === 201, 'create insurance company ' + r.s + JSON.stringify(r.d).slice(0,200)); const coId = r.d._id;
  r = await call('POST', '/masters/insurance-companies', { name: 'oriental insurance' });
  ok(r.s === 400, 'duplicate company name rejected: ' + r.d.message);
  r = await call('POST', '/masters/insurance-companies', { name: 'X', pincode: '12' });
  ok(r.s === 400, 'bad pin rejected');
  r = await call('POST', '/masters/insurance-companies', { name: '' });
  ok(r.s === 400, 'empty name rejected');
  r = await call('PUT', `/masters/insurance-companies/${coId}`, { mobile: '9876543211' });
  ok(r.s === 200 && r.d.mobile === '9876543211', 'edit company');
  r = await call('GET', '/masters/insurance-companies');
  ok(r.d.length === 1, 'list companies');

  // customers
  r = await call('POST', '/customers', { name: 'Normal', mobile: '9111111111' });
  ok(r.s === 201 && r.d.insurance?.applied === false, 'normal customer unchanged (insurance.applied=false)');
  r = await call('POST', '/customers', { name: 'Ins', mobile: '9222222222', insurance: { applied: true, companyId: coId, policyNo: '' } });
  ok(r.s === 400, 'insurance customer missing fields rejected: ' + r.d.message);
  r = await call('POST', '/customers', { name: 'Sanjeev', mobile: '9939620289', insurance: { applied: true, companyId: coId, companyName: 'Oriental Insurance', policyNo: '4717805500', accidentDate: '2025-06-01', idv: 450000, claimNo: '125468' } });
  ok(r.s === 201 && r.d.insurance.claimNo === '125468', 'insurance customer saved');
  const custId = r.d._id;

  // stock items
  const spare = await SparePart.create({ name: 'Bumper', partNumber: 'B1', garageId: g._id, currentStock: 10, sellingPrice: 3000, unitPrice: 3000, gstRate: 28 });
  const spare2 = await SparePart.create({ name: 'Bonnet', partNumber: 'B2', garageId: g._id, currentStock: 10, sellingPrice: 4000, unitPrice: 4000, gstRate: 18 });

  const mk = (itemType, name, rate, taxRate, depreciation, customerPct, itemId) => ({ itemId, itemType, name, qty: 1, unitPrice: rate, finalAmount: rate, taxRate, depreciation, customerPct });
  const payload = {
    jobcardNumber: 'T-1', customerId: custId, customerName: 'Sanjeev', vehicleNo: 'JH01FB3175', discount: 0, discountType: 'amount',
    insurance: { applied: true, companyId: coId, companyName: 'Oriental Insurance', policyNo: '4717805500', accidentDate: '2025-06-01', idv: 450000, claimNo: '125468', claimFees: 1000 },
    items: [mk('Spare', 'Bumper', 3000, 28, 50, 0, spare._id), mk('Spare', 'Bonnet', 4000, 18, 40, 0, spare2._id), mk('Labour', 'Repair', 1500, 18, 0, 20), mk('Labour', 'Painting', 1500, 18, 0, 100 / 3)]
  };
  r = await call('POST', '/jobcards', payload);
  ok(r.s === 201, 'create insurance jobcard ' + (r.d.message || ''));
  const jc = r.d;
  ok(jc.billAmount === 10540 && jc.total === 10540, 'bill amount reconciles to 10540');
  const it = jc.items;
  ok(it[0].custPayable === 1171.88 && it[0].insPayable === 1171.87, 'bumper split 50/50');
  ok(Math.abs(it[1].custPayable - 1355.93) < 0.01 && Math.abs(it[1].insPayable - 2033.9) < 0.02, 'bonnet 60/40 split');
  ok(it[2].insPayable === 1200 && it[2].custPayable === 300 && it[2].insGst === 216 && it[2].custGst === 54, 'repair 80/20 labour');
  ok(it[3].insPayable === 1000 && it[3].custPayable === 500, 'painting 2/3 : 1/3 labour');
  const s = jc.insurance.summary;
  ok(Math.abs(s.insurancePayable + s.customerPayable - jc.billAmount) < 0.01, `insurance(${s.insurancePayable}) + customer(${s.customerPayable}) = bill`);
  ok(Math.abs(s.insurancePayable - 5496) < 0.02 && Math.abs(s.customerPayable - 5044) < 0.02, 'claim fee shifts 1000 (5496 / 5044)');
  const sp = await SparePart.findById(spare._id); ok(sp.currentStock === 9, 'stock deducted');

  // edit: change depreciation, qty
  const upd = { ...payload, items: payload.items.map(i => ({ ...i })) };
  upd.items[0].depreciation = 20; upd.items[0].qty = 2; upd.items[0].finalAmount = 6000;
  r = await call('PUT', `/jobcards/${jc._id}`, upd);
  ok(r.s === 200 && r.d.items[0].custPayable !== it[0].custPayable && r.d.billAmount === 13540, 'edit depreciation/qty recalculates (bill ' + r.d.billAmount + ')');
  const sp2 = await SparePart.findById(spare._id); ok(sp2.currentStock === 8, 'stock re-adjusted on edit');

  // invalid depreciation
  for (const bad of [-10, 110]) {
    const b = { ...payload, jobcardNumber: 'T-2', vehicleNo: 'XX', items: [mk('Labour', 'x', 100, 18, bad, 0)] };
    r = await call('POST', '/jobcards', b);
    ok(r.s === 400, `depreciation ${bad}% rejected: ${r.d.message}`);
  }
  // failed update must not touch stock
  const before = (await SparePart.findById(spare._id)).currentStock;
  const badUpd = { ...payload, items: [mk('Spare', 'Bumper', 3000, 28, 150, 0, spare._id)] };
  r = await call('PUT', `/jobcards/${jc._id}`, badUpd);
  ok(r.s === 400 && (await SparePart.findById(spare._id)).currentStock === before, 'invalid update leaves stock unchanged');

  // reload
  r = await call('GET', `/jobcards/${jc._id}`);
  ok(r.d.insurance.claimNo === '125468' && r.d.insurance.claimFees === 1000 && r.d.items[0].depreciation === 20, 'insurance + item depreciation reload');

  // normal jobcard unchanged
  const normal = { jobcardNumber: 'N-1', customerName: 'Normal', vehicleNo: 'NN01', discount: 100, discountType: 'amount', items: [{ itemType: 'Labour', name: 'Wash', qty: 1, unitPrice: 500, finalAmount: 500 }, { itemType: 'Spare', name: 'Bulb', qty: 1, unitPrice: 200, finalAmount: 200 }] };
  r = await call('POST', '/jobcards', normal);
  ok(r.s === 201 && r.d.total === 700 && r.d.billAmount === 600 && r.d.insurance.applied === false && r.d.items[0].lineTotal === 0, 'normal jobcard: totals unchanged, no insurance fields');

  console.log(`\n${pass} passed, ${fail} failed`);
  await mongoose.connection.dropDatabase();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
