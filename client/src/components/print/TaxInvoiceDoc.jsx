import { assetUrl } from '../../utils/asset';

// Shared TTN-style tax-invoice / estimate print layout.
// Matches the Reckon Motors reference: header (logo + workshop/GSTN/addr/phone/email),
// Bill To | Vehicle | Doc details, GST item table (18% inclusive split),
// Tax Details + Bill Amount, amount in words, authorised signature, customer voice.

const HEAD = '#BDD7EE';
const BORDER = '#111111';
const NAME = '#7e22ce';
const EMAIL = '#2563eb';
const MUTED = '#475569';

const GST_RATE = 18; // CGST 9% + SGST 9%, prices treated as inclusive

export function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const below100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''));
const below1000 = (n) => (n < 100 ? below100(n) : ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below100(n % 100) : ''));
export function inWords(amount) {
  let n = Math.floor(amount || 0);
  if (n === 0) return 'Zero Rupees Only';
  let r = '';
  if (n >= 10000000) { r += below1000(Math.floor(n / 10000000)) + ' Crore '; n %= 10000000; }
  if (n >= 100000) { r += below1000(Math.floor(n / 100000)) + ' Lakh '; n %= 100000; }
  if (n >= 1000) { r += below1000(Math.floor(n / 1000)) + ' Thousand '; n %= 1000; }
  if (n > 0) r += below1000(n);
  return r.trim() + ' Rupees Only';
}

const td = (extra = {}) => ({ border: `1px solid ${BORDER}`, padding: '6px 8px', fontSize: 11, verticalAlign: 'top', ...extra });
const th = (extra = {}) => ({ border: `1px solid ${BORDER}`, padding: '6px 8px', fontSize: 11, fontWeight: 700, background: HEAD, textAlign: 'left', ...extra });

export default function TaxInvoiceDoc({
  garage, title, number, billTo, vehicleRows = [], metaLabel, metaRows = [],
  items = [], customerVoice = [], advice = [], summary = {}, footerNote, paymentStatus, reminder,
}) {
  const logo = assetUrl(garage?.branding?.logoUrl || garage?.logoUrl) || null;
  const garageAddress = [garage?.address, garage?.city, garage?.state, garage?.zipcode].filter(Boolean).join(', ');

  // GST split (inclusive)
  const calc = items.map(it => {
    const amount = it.finalAmount || 0;
    const taxable = amount / (1 + GST_RATE / 100);
    const gst = amount - taxable;
    return { ...it, amount, taxable, cgst: gst / 2, sgst: gst / 2 };
  });
  const sum = (f) => calc.reduce((s, r) => s + (r[f] || 0), 0);
  const tTaxable = sum('taxable'), tCgst = sum('cgst'), tSgst = sum('sgst'), tAmount = sum('amount');

  const billTotal = summary.total != null ? summary.total : tAmount;
  const half = GST_RATE / 2;

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: '#e2e8f0', minHeight: '100vh', paddingBottom: 48, color: '#111' }}>
      <style>{`
        @page { size: A4; margin: 8mm 10mm; }
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

      {/* Screen toolbar */}
      <div className="no-print" style={{ background: '#1e293b', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>{title} — {number}</span>
        <button onClick={() => window.print()}
          style={{ background: '#C62828', color: '#fff', border: 'none', padding: '9px 22px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Download / Print
        </button>
      </div>

      <div className="doc-shell" style={{ background: '#fff', maxWidth: 860, margin: '24px auto 0', padding: 18 }}>
        {/* Title */}
        <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{title}</div>

        {/* Header: logo + workshop */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
          <div style={{ width: 110, minHeight: 60, display: 'flex', alignItems: 'center' }}>
            {logo
              ? <img src={logo} alt="logo" style={{ maxWidth: 110, maxHeight: 70, objectFit: 'contain' }} />
              : <div style={{ fontSize: 18, fontWeight: 800, color: NAME }}>{garage?.workshopName}</div>}
          </div>
          <div style={{ textAlign: 'right', lineHeight: 1.5 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: NAME }}>{garage?.workshopName}</div>
            {garage?.gstNo && <div style={{ fontSize: 10.5, color: '#64748b' }}>GSTN: {garage.gstNo}</div>}
            {garageAddress && <div style={{ fontSize: 11 }}>{garageAddress}</div>}
            <div style={{ fontSize: 11 }}>Phone: {[garage?.mobile, garage?.mobile2].filter(Boolean).join(' / ')}</div>
            {garage?.email && <div style={{ fontSize: 11, color: EMAIL }}>Email: {garage.email}</div>}
          </div>
        </div>

        {/* Bill To | Vehicle | Doc details */}
        <table style={{ width: '100%', marginBottom: 12 }}>
          <tbody>
            <tr>
              <th style={th({ width: '33%' })}>Bill To</th>
              <th style={th({ width: '40%' })}>Vehicle Details</th>
              <th style={th()}>{metaLabel}</th>
            </tr>
            <tr>
              <td style={td()}>
                <div style={{ fontWeight: 600 }}>{billTo?.name || '—'}</div>
                {billTo?.mobile && <div>Mobile: {billTo.mobile}</div>}
              </td>
              <td style={td()}>
                {vehicleRows.map(([k, v]) => <div key={k}>{k}: {v}</div>)}
              </td>
              <td style={td()}>
                {metaRows.map(([k, v]) => <div key={k}>{k}: {v}</div>)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Items */}
        <table style={{ width: '100%', marginBottom: 12 }}>
          <thead>
            <tr>
              {['#', 'Particulars', 'HSN/SAC', 'Qty', 'Unit Price(Rs.)', 'Total Amount(Rs.)', 'Discount', 'Taxable Amount(Rs.)', 'CGST(Rs.)', 'SGST(Rs.)', 'Amount(Rs.)'].map((h, i) => (
                <th key={h} style={th({ textAlign: i >= 3 ? 'right' : 'left', fontSize: 10 })}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calc.map((it, i) => {
              const disc = it.discount
                ? (it.discountType === 'percent' ? `${it.discount} %` : `₹${it.discount}`)
                : '0 %';
              return (
                <tr key={i}>
                  <td style={td({ textAlign: 'center', color: '#64748b' })}>{i + 1}</td>
                  <td style={td({ fontWeight: 500 })}>{it.name || '—'}</td>
                  <td style={td()}>{it.hsn || ''}</td>
                  <td style={td({ textAlign: 'right' })}>{it.qty ?? 1} {it.unit || 'units'}</td>
                  <td style={td({ textAlign: 'right' })}>{fmt(it.unitPrice)} <span style={{ color: '#94a3b8', fontSize: 9 }}>(Incl)</span></td>
                  <td style={td({ textAlign: 'right' })}>{fmt((it.qty ?? 1) * (it.unitPrice || 0))}</td>
                  <td style={td({ textAlign: 'right' })}>{disc}</td>
                  <td style={td({ textAlign: 'right' })}>{fmt(it.taxable)}</td>
                  <td style={td({ textAlign: 'right' })}>{fmt(it.cgst)} <span style={{ color: '#94a3b8', fontSize: 9 }}>({half}%)</span></td>
                  <td style={td({ textAlign: 'right' })}>{fmt(it.sgst)} <span style={{ color: '#94a3b8', fontSize: 9 }}>({half}%)</span></td>
                  <td style={td({ textAlign: 'right', fontWeight: 600 })}>{fmt(it.amount)}</td>
                </tr>
              );
            })}
            {calc.length === 0 && <tr><td style={td({ textAlign: 'center', color: '#94a3b8' })} colSpan={11}>No items</td></tr>}
            <tr>
              <td style={td({ fontWeight: 700, background: '#f1f5f9' })} colSpan={7}>Total(Rs.)</td>
              <td style={td({ textAlign: 'right', fontWeight: 700, background: '#f1f5f9' })}>{fmt(tTaxable)}</td>
              <td style={td({ textAlign: 'right', fontWeight: 700, background: '#f1f5f9' })}>{fmt(tCgst)}</td>
              <td style={td({ textAlign: 'right', fontWeight: 700, background: '#f1f5f9' })}>{fmt(tSgst)}</td>
              <td style={td({ textAlign: 'right', fontWeight: 700, background: '#f1f5f9' })}>{fmt(tAmount)}</td>
            </tr>
          </tbody>
        </table>

        {/* Tax details | Bill amount */}
        <table style={{ width: '100%', marginBottom: 0 }}>
          <tbody>
            <tr>
              <th style={th({ width: '68%' })}>Tax Details:</th>
              <th style={th()}>Bill Amount Details:</th>
            </tr>
            <tr>
              <td style={td()}>
                SGST@{half}%:Rs. {fmt(tSgst)}&nbsp;&nbsp;&nbsp;&nbsp;
                CGST@{half}%:Rs. {fmt(tCgst)}&nbsp;&nbsp;&nbsp;&nbsp;
                GST@{GST_RATE}%:Rs. {fmt(tCgst + tSgst)}
              </td>
              <td style={td()}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Total(Rs.)</span><span style={{ fontWeight: 700 }}>{fmt(billTotal)}</span></div>
                {summary.showPayment && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}><span>Paid</span><span>{fmt(summary.paid)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#C62828', fontWeight: 700 }}><span>Balance Due</span><span>{fmt(summary.balance)}</span></div>
                  </>
                )}
              </td>
            </tr>
            <tr>
              <th style={th()}>{title === 'Estimate' ? 'Estimate' : 'Invoice'} Amount In Words</th>
              <th style={th()}>Authorised Signature{summary.showPayment ? ' and Payment Status' : ''}</th>
            </tr>
            <tr>
              <td style={td({ height: 64 })}>
                <span style={{ fontStyle: 'italic', color: MUTED }}>{inWords(billTotal)}</span>
              </td>
              <td style={td({ textAlign: 'center' })}>
                {logo ? <img src={logo} alt="sign" style={{ maxHeight: 44, maxWidth: 110, objectFit: 'contain', opacity: 0.9 }} /> : <div style={{ height: 30 }} />}
                {summary.showPayment && paymentStatus && <div style={{ marginTop: 4, fontWeight: 700 }}>{paymentStatus}</div>}
              </td>
            </tr>
            <tr>
              <th style={th()} colSpan={2}>Customer Voice</th>
            </tr>
            <tr>
              <td style={td({ minHeight: 26 })} colSpan={2}>{(customerVoice || []).join(' · ') || ''}</td>
            </tr>
            {advice && advice.length > 0 && (
              <>
                <tr>
                  <th style={th()} colSpan={2}>Advice</th>
                </tr>
                <tr>
                  <td style={td({ minHeight: 26 })} colSpan={2}>{advice.join(' · ')}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>

        {reminder && (reminder.km || reminder.period) && (
          <div style={{ marginTop: 12, border: `2px solid ${NAME}`, borderRadius: 6, background: '#faf5ff', padding: '10px 14px', textAlign: 'center', breakInside: 'avoid' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: NAME, textTransform: 'uppercase', letterSpacing: 1.5 }}>Next Service Reminder</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#111', marginTop: 3 }}>
              {[reminder.km, reminder.period].filter(Boolean).join('  •  ')}
            </div>
          </div>
        )}

        {footerNote && (
          <div style={{ marginTop: 10, fontSize: 10.5, color: '#64748b', textAlign: 'center' }}>{footerNote}</div>
        )}
      </div>
    </div>
  );
}
