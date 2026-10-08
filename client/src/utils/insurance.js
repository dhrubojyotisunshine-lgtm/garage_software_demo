// Insurance-claim billing maths — mirrors server/utils/insuranceCalc.js (the server
// recomputes and stores the authoritative values on save; this drives live previews).
//
//   Parts (Spare/Lube): rate is tax-INCLUSIVE; customer share % = Depreciation %
//   Labour / Outsource: rate is tax-EXCLUSIVE; customer share % = the row's own `customerPct`
//   Insurance Payable = insurance share - claim fees
//   Customer Payable  = customer share + claim fees - bill discount + round-off

export const isPartType = (t) => t === 'Spare' || t === 'Lube';

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pct = (v) => Math.min(100, Math.max(0, Number(v) || 0));

export const fmtMoney = (n) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

export const computeLine = (it) => {
  const part = isPartType(it.itemType);
  const gross = r2(it.finalAmount);
  const taxRate = Math.max(0, Number(it.taxRate) || 0);
  const depreciation = pct(it.depreciation);
  const customerPct = part ? depreciation : pct(it.customerPct);

  let base, gst, lineTotal;
  if (part) {
    base = r2(gross / (1 + taxRate / 100));
    gst = r2(gross - base);
    lineTotal = gross;
  } else {
    base = gross;
    gst = r2(base * taxRate / 100);
    lineTotal = r2(base + gst);
  }
  const custBase = r2(base * customerPct / 100);
  const custGst = r2(gst * customerPct / 100);
  return {
    taxRate, depreciation, customerPct, base, gst, lineTotal,
    insPayable: r2(base - custBase), insGst: r2(gst - custGst),
    custPayable: custBase, custGst
  };
};

export const computeInsurance = ({ items = [], claimFees = 0, discount = 0, discountType = 'amount' }) => {
  const lines = items.map(computeLine);
  const sum = (k) => r2(lines.reduce((s, l) => s + l[k], 0));
  const sumType = (type) => r2(items.reduce((s, it, i) => s + (it.itemType === type ? lines[i].lineTotal : 0), 0));

  const total = sum('lineTotal');
  const discAmt = r2(discountType === 'percent' ? (total * (Number(discount) || 0)) / 100 : Number(discount) || 0);
  const net = Math.max(0, r2(total - discAmt));
  const billAmount = Math.round(net);
  const roundOff = r2(billAmount - net);
  const fees = Math.max(0, r2(claimFees));

  const insuranceItems = r2(sum('insPayable') + sum('insGst'));
  const customerItems = r2(sum('custPayable') + sum('custGst'));

  return {
    lines,
    summary: {
      partsBase: r2(lines.reduce((s, l, i) => s + (isPartType(items[i].itemType) ? l.base : 0), 0)),
      labourBase: r2(lines.reduce((s, l, i) => s + (isPartType(items[i].itemType) ? 0 : l.base), 0)),
      gstTotal: sum('gst'),
      discountAmt: discAmt,
      roundOff,
      claimFees: fees,
      insurancePayable: r2(insuranceItems - fees),
      customerPayable: r2(customerItems + fees - discAmt + roundOff)
    },
    totals: {
      labourTotal: sumType('Labour'), spareTotal: sumType('Spare'),
      lubeTotal: sumType('Lube'), outsourceTotal: sumType('Outsource'),
      total, billAmount
    }
  };
};

// Blank claim block for a customer / jobcard form.
export const emptyInsurance = () => ({
  applied: false, companyId: '', companyName: '', policyNo: '', accidentDate: '', idv: '', claimNo: ''
});

// Client-side mirror of the server's customer rule: all claim fields required when applied.
export const validateClaim = (ins) => {
  if (!ins?.applied) return null;
  if (!ins.companyId) return 'Select an insurance company';
  if (!String(ins.policyNo || '').trim()) return 'Policy No. is required';
  if (!ins.accidentDate) return 'Accident date is required';
  if (ins.idv === '' || ins.idv === null || ins.idv === undefined || isNaN(Number(ins.idv)) || Number(ins.idv) < 0) return 'Enter a valid IDV amount';
  if (!String(ins.claimNo || '').trim()) return 'Claim No. is required';
  return null;
};

// Shape a form's claim block for the API (empty strings -> omitted / numbers).
export const claimPayload = (ins) => {
  if (!ins?.applied) return { applied: false };
  return {
    applied: true,
    companyId: ins.companyId,
    companyName: ins.companyName || '',
    policyNo: String(ins.policyNo || '').trim(),
    accidentDate: ins.accidentDate,
    idv: Number(ins.idv) || 0,
    claimNo: String(ins.claimNo || '').trim()
  };
};

// Hydrate a form's claim block from a saved customer/jobcard `insurance` object.
export const claimFromSaved = (ins) => ({
  ...emptyInsurance(),
  ...(ins || {}),
  companyId: ins?.companyId || '',
  accidentDate: ins?.accidentDate ? String(ins.accidentDate).slice(0, 10) : '',
  idv: ins?.idv ?? ''
});
