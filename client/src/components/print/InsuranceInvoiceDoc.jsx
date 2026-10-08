import { assetUrl } from '../../utils/asset';
import { fmt, inWords } from './TaxInvoiceDoc';
import { isPartType } from '../../utils/insurance';

// Insurance-claim tax invoice (body-shop / accident repair).
// Layout follows the client's reference invoice: workshop + claim header, insurer block,
// item table with Depreciation / Tax Rate / Insurance Payable / Customer Payable (+ GST) columns,
// payment + claim-fee block, and the Parts / GST / Labour summary.
// Normal jobcards keep using TaxInvoiceDoc — this is only rendered when insurance.applied.

const HEAD = '#BDD7EE';
const BORDER = '#111111';
const NAME = '#7e22ce';

const td = (extra = {}) => ({ border: `1px solid ${BORDER}`, padding: '4px 6px', fontSize: 10.5, verticalAlign: 'top', ...extra });
const th = (extra = {}) => ({ border: `1px solid ${BORDER}`, padding: '4px 6px', fontSize: 10, fontWeight: 700, background: HEAD, textAlign: 'left', ...extra });

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const stateCode = (gstin) => (String(gstin || '').trim().slice(0, 2).match(/^\d{2}$/) || [null])[0];

export default function InsuranceInvoiceDoc({ garage, jc, company }) {
  const ins = jc.insurance || {};
  const sum = ins.summary || {};
  const items = jc.items || [];
  const logo = assetUrl(garage?.branding?.logoUrl || garage?.logoUrl) || null;
  const garageAddress = [garage?.address, garage?.city, garage?.state, garage?.zipcode].filter(Boolean).join(', ');

  const col = (k) => items.reduce((s, it) => s + (Number(it[k]) || 0), 0);
  const tIns = col('insPayable'), tInsGst = col('insGst'), tCust = col('custPayable'), tCustGst = col('custGst'), tTotal = col('lineTotal');

  // IGST when the insurer is in a different GST state from the workshop; else CGST + SGST.
  const gStateCode = stateCode(garage?.gstNo), cStateCode = stateCode(company?.gstin);
  const interState = !!(gStateCode && cStateCode && gStateCode !== cStateCode);
  const gstTotal = sum.gstTotal || 0;

  const bill = jc.billAmount || 0, paid = jc.paidAmount || 0, bal = jc.balanceDue || 0;
  const payments = (jc.transactions || []).filter(t => t.type !== 'Refund');
  const infoRows = [
    ['Tax Invoice No', jc.jobcardNumber], ['Date', fmtDate(jc.createdAt)],
    ['Vehicle No', jc.vehicleNo], ['Advisor Name', jc.supervisorName],
    ['Service Type', jc.typeLabel], ['Policy No', ins.policyNo],
    ['Claim No', ins.claimNo], ['Accident Date', fmtDate(ins.accidentDate)],
    ['IDV', ins.idv ? `₹${fmt(ins.idv)}` : '']
  ];
  const insurerAddr = [company?.address, company?.pincode].filter(Boolean).join(' ');

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: '#e2e8f0', minHeight: '100vh', paddingBottom: 48, color: '#111' }}>
      <style>{`
        @page { size: A4 landscape; margin: 8mm 8mm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #e2e8f0; }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .doc-shell { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
        }
        @media screen { .doc-shell { box-shadow: 0 8px 40px rgba(0,0,0,0.18); } }
        table { border-collapse: collapse; }
      `}</style>

      <div className="no-print" style={{ background: '#1e293b', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>Insurance Tax Invoice — {jc.jobcardNumber}</span>
        <button onClick={() => window.print()}
          style={{ background: '#C62828', color: '#fff', border: 'none', padding: '9px 22px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Download / Print
        </button>
      </div>

      <div className="doc-shell" style={{ background: '#fff', maxWidth: 1100, margin: '24px auto 0', padding: 16 }}>
        {/* Workshop header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div style={{ width: 90 }}>
            {logo && <img src={logo} alt="logo" style={{ maxWidth: 90, maxHeight: 70, objectFit: 'contain' }} />}
          </div>
          <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.45 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: NAME }}>{garage?.workshopName}</div>
            {garageAddress && <div style={{ fontSize: 11 }}>{garageAddress}</div>}
            {garage?.gstNo && <div style={{ fontSize: 11, fontWeight: 700 }}>GSTIN: {garage.gstNo}</div>}
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>TAX INVOICE</div>
          </div>
          <div style={{ width: 90 }} />
        </div>

        {/* Claim / vehicle header */}
        <table style={{ width: '100%', marginBottom: 8 }}>
          <tbody>
            <tr>
              <td style={td({ width: '34%' })}>
                <div style={{ fontWeight: 700 }}>{garage?.workshopName}</div>
                {garageAddress && <div>{garageAddress}</div>}
                {garage?.gstNo && <div>GSTIN: {garage.gstNo}</div>}
                <div>Contact: {[garage?.mobile, garage?.mobile2].filter(Boolean).join(', ')}</div>
                {garage?.email && <div>Email: {garage.email}</div>}
              </td>
              <td style={td({ width: '33%' })}>
                {infoRows.filter(([, v]) => v).map(([k, v]) => <div key={k}><b>{k}:</b> {v}</div>)}
              </td>
              <td style={td()}>
                <div><b>Customer:</b> {jc.customerName}</div>
                <div><b>Vehicle:</b> {[jc.vehicleMake, jc.vehicleModel].filter(Boolean).join(' ')}</div>
                {jc.kmReading != null && jc.kmReading !== '' && <div><b>Kilometer:</b> {jc.kmReading}</div>}
                {jc.vehicleColour && <div><b>Color:</b> {jc.vehicleColour}</div>}
                {jc.customerMobile && <div><b>PH:</b> {jc.customerMobile}</div>}
                {jc.customerEmail && <div><b>Email:</b> {jc.customerEmail}</div>}
              </td>
            </tr>
            <tr>
              <td style={td()} colSpan={3}>
                <b>Insurance Company:</b> {ins.companyName || company?.name || '—'}
                {insurerAddr && <span> &nbsp;|&nbsp; {insurerAddr}</span>}
                {company?.gstin && <span> &nbsp;|&nbsp; GST No: {company.gstin}</span>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items */}
        <table style={{ width: '100%', marginBottom: 8 }}>
          <thead>
            <tr>
              {['#', 'Service & Product', 'Description', 'Rate', 'Dis', 'Qty', 'Deprec. (%)', 'Tax Rate', 'Insurance Payable', 'Insurance Payable GST', 'Customer Payable', 'Customer Payable GST', 'Total'].map((h, i) => (
                <th key={h} style={th({ textAlign: i >= 3 ? 'right' : 'left' })}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td style={td()}>{i + 1}</td>
                <td style={td()}>{it.name}{it.partNumber ? <div style={{ color: '#64748b', fontSize: 9.5 }}>{it.partNumber}</div> : null}</td>
                <td style={td()}>{isPartType(it.itemType) ? 'PART' : 'Service'}</td>
                <td style={td({ textAlign: 'right' })}>{fmt(it.unitPrice)}</td>
                <td style={td({ textAlign: 'right' })}>{it.discount ? (it.discountType === 'percent' ? `${it.discount}%` : fmt(it.discount)) : 0}</td>
                <td style={td({ textAlign: 'right' })}>{it.qty}</td>
                <td style={td({ textAlign: 'right' })}>{it.depreciation || 0}%</td>
                <td style={td({ textAlign: 'right' })}>{it.taxRate || 0}%</td>
                <td style={td({ textAlign: 'right' })}>{fmt(it.insPayable)}</td>
                <td style={td({ textAlign: 'right' })}>{fmt(it.insGst)}</td>
                <td style={td({ textAlign: 'right' })}>{fmt(it.custPayable)}</td>
                <td style={td({ textAlign: 'right' })}>{fmt(it.custGst)}</td>
                <td style={td({ textAlign: 'right', fontWeight: 600 })}>{fmt(it.lineTotal)}</td>
              </tr>
            ))}
            <tr>
              <td style={td({ fontWeight: 700 })} colSpan={8}>Total</td>
              <td style={td({ textAlign: 'right', fontWeight: 700 })}>{fmt(tIns)}</td>
              <td style={td({ textAlign: 'right', fontWeight: 700 })}>{fmt(tInsGst)}</td>
              <td style={td({ textAlign: 'right', fontWeight: 700 })}>{fmt(tCust)}</td>
              <td style={td({ textAlign: 'right', fontWeight: 700 })}>{fmt(tCustGst)}</td>
              <td style={td({ textAlign: 'right', fontWeight: 700 })}>{fmt(tTotal)}</td>
            </tr>
          </tbody>
        </table>

        {/* Payment block + summary */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 10 }}>
          <table style={{ width: '48%' }}>
            <tbody>
              <tr>
                <td style={td({ fontWeight: 700 })}>Payment Mode</td>
                <td style={td({ textAlign: 'right', fontSize: 10 })}>
                  {payments.length === 0 ? '—' : payments.map((t, i) => <div key={i}>{t.paymentType}: {fmt(t.amount)}</div>)}
                </td>
              </tr>
              <tr><td style={td({ fontWeight: 700 })}>Claim Fees</td><td style={td({ textAlign: 'right' })}>{fmt(sum.claimFees)}</td></tr>
              <tr>
                <td style={td({ fontWeight: 700 })}>Insurance Payable <span style={{ fontWeight: 400 }}>(Insurance Payable − Claim Fees)</span></td>
                <td style={td({ textAlign: 'right' })}>{fmt(sum.insurancePayable)}</td>
              </tr>
              <tr>
                <td style={td({ fontWeight: 700 })}>Customer Payable <span style={{ fontWeight: 400 }}>(Customer Payable + Claim Fees)</span></td>
                <td style={td({ textAlign: 'right' })}>{fmt(sum.customerPayable)}</td>
              </tr>
            </tbody>
          </table>

          <div style={{ flex: 1 }} />

          <table style={{ width: '34%' }}>
            <tbody>
              {[
                ['Discount', fmt(sum.discountAmt)],
                ['Parts Total', fmt(sum.partsBase)],
                ...(interState
                  ? [['IGST Total', fmt(gstTotal)]]
                  : [['CGST Total', fmt(gstTotal / 2)], ['SGST Total', fmt(gstTotal / 2)]]),
                ['Labour Total', fmt(sum.labourBase)],
                ['Claim Fees', fmt(sum.claimFees)],
                ['Round Off', fmt(sum.roundOff)],
                ['Grand Total', fmt(bill)],
                ['Paid', fmt(paid)],
                ['Balance', fmt(bal)]
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={td({ fontWeight: 700 })}>{k}</td>
                  <td style={td({ textAlign: 'right' })}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 11, marginBottom: 4 }}><b>Amount (in Words):</b> INR {inWords(bill)}</div>
        <div style={{ fontSize: 10.5, marginBottom: 28 }}>I certify that the work has been done to my satisfaction and that I have taken delivery of the vehicle.</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 14 }}>
          {['Customer / Authorized Signatory', 'Service Advisor Signature', 'Cashier / Authorized Signature'].map(s => (
            <div key={s} style={{ borderTop: '1px solid #111', paddingTop: 4, width: '26%', textAlign: 'center' }}>{s}</div>
          ))}
        </div>

        {garage?.billingSettings?.termsAndConditions && (
          <div style={{ border: `1px solid ${BORDER}`, padding: 6, fontSize: 10, whiteSpace: 'pre-line' }}>
            <b>Terms &amp; Conditions:</b>{'\n'}{garage.billingSettings.termsAndConditions}
          </div>
        )}
      </div>
    </div>
  );
}
