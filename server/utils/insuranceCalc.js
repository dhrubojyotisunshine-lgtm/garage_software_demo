// Insurance-claim billing maths (server = source of truth; the client keeps an
// identical copy in client/src/utils/insurance.js for live previews).
//
// Per line:
//   Parts (Spare/Lube)  — rate is tax-INCLUSIVE.  base = gross / (1 + tax%)
//                         customer share % = the item's Depreciation %
//   Labour / Outsource  — rate is tax-EXCLUSIVE.  gst = base * tax%
//                         customer share % = the item's own `customerPct`
// The customer's share of base and GST is `customerPct`; insurance pays the rest.
//
// Claim Fees move from the insurance side to the customer side:
//   Insurance Payable = sum(insurance share) - claimFees
//   Customer Payable  = sum(customer share) + claimFees - bill discount + round-off
// so Insurance Payable + Customer Payable = Balance (the rounded bill amount).

const PART_TYPES = ['Spare', 'Lube'];

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pct = (v) => Math.min(100, Math.max(0, Number(v) || 0));
const isPart = (t) => PART_TYPES.includes(t);

const computeLine = (it) => {
  const part = isPart(it.itemType);
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

const computeInsurance = ({ items = [], claimFees = 0, discount = 0, discountType = 'amount' }) => {
  const lines = items.map(computeLine);
  const sum = (k) => r2(lines.reduce((s, l) => s + l[k], 0));
  const sumType = (types) => r2(items.reduce((s, it, i) => s + (types.includes(it.itemType) ? lines[i].lineTotal : 0), 0));

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
      partsBase: r2(lines.reduce((s, l, i) => s + (isPart(items[i].itemType) ? l.base : 0), 0)),
      labourBase: r2(lines.reduce((s, l, i) => s + (isPart(items[i].itemType) ? 0 : l.base), 0)),
      gstTotal: sum('gst'),
      discountAmt: discAmt,
      roundOff,
      claimFees: fees,
      insurancePayable: r2(insuranceItems - fees),
      customerPayable: r2(customerItems + fees - discAmt + roundOff)
    },
    totals: {
      labourTotal: sumType(['Labour']),
      spareTotal: sumType(['Spare']),
      lubeTotal: sumType(['Lube']),
      outsourceTotal: sumType(['Outsource']),
      total, billAmount
    }
  };
};

// Validates and applies insurance maths to a jobcard request body.
// Returns null for normal jobcards. Throws Error (message safe to show) when invalid.
const prepareInsurance = (body) => {
  const ins = body.insurance;
  if (!ins || !ins.applied) return null;

  const items = body.items || [];
  for (const it of items) {
    for (const [field, label] of [['depreciation', 'Depreciation'], ['customerPct', 'Customer share']]) {
      const v = it[field];
      if (v === undefined || v === null || v === '') continue;
      if (isNaN(Number(v)) || Number(v) < 0 || Number(v) > 100) {
        throw new Error(`${label} % for "${it.name || 'item'}" must be between 0 and 100.`);
      }
    }
    if (it.taxRate !== undefined && it.taxRate !== null && it.taxRate !== '' && (isNaN(Number(it.taxRate)) || Number(it.taxRate) < 0)) {
      throw new Error(`Tax rate for "${it.name || 'item'}" is invalid.`);
    }
  }
  if (Number(ins.claimFees) < 0) throw new Error('Claim fees cannot be negative.');

  const calc = computeInsurance({ items, claimFees: ins.claimFees, discount: body.discount, discountType: body.discountType });
  return {
    items: items.map((it, i) => {
      const l = calc.lines[i];
      return {
        ...it, taxRate: l.taxRate, depreciation: l.depreciation, customerPct: l.customerPct,
        insPayable: l.insPayable, insGst: l.insGst, custPayable: l.custPayable, custGst: l.custGst, lineTotal: l.lineTotal
      };
    }),
    insurance: { ...ins, claimFees: calc.summary.claimFees, summary: calc.summary },
    totals: calc.totals
  };
};

module.exports = { computeInsurance, computeLine, prepareInsurance, PART_TYPES };
