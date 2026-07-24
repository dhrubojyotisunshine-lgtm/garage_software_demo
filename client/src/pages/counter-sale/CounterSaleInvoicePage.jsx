import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { counterSalesApi } from '../../api/counterSales';
import useAuthStore from '../../store/authStore';

const BRAND  = '#C62828';
const DARK   = '#1e293b';
const BORDER = '#e2e8f0';
const STRIPE = '#f8fafc';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function below100(n) { return n < 20 ? ONES[n] : TENS[Math.floor(n/10)] + (n%10 ? ' '+ONES[n%10] : ''); }
function below1000(n) { return n < 100 ? below100(n) : ONES[Math.floor(n/100)]+' Hundred'+(n%100 ? ' '+below100(n%100) : ''); }
function inWords(amount) {
  let n = Math.floor(amount || 0);
  if (n === 0) return 'Zero Rupees Only';
  let r = '';
  if (n >= 10000000) { r += below1000(Math.floor(n/10000000))+' Crore '; n %= 10000000; }
  if (n >= 100000)   { r += below1000(Math.floor(n/100000))+' Lakh ';   n %= 100000; }
  if (n >= 1000)     { r += below1000(Math.floor(n/1000))+' Thousand '; n %= 1000; }
  if (n > 0) r += below1000(n);
  return r.trim() + ' Rupees Only';
}

const badge = (type) => ({
  Spare: { bg: '#dcfce7', color: '#15803d' },
  Lube:  { bg: '#fef3c7', color: '#92400e' },
}[type] || { bg: '#f1f5f9', color: '#475569' });

export default function CounterSaleInvoicePage() {
  const { id } = useParams();
  const { garage, fetchMe } = useAuthStore();
  const [sale, setSale] = useState(null);
  const [err, setErr]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await fetchMe();
        const { data } = await counterSalesApi.get(id);
        setSale(data);
      } catch {
        setErr('Failed to load invoice. Please close this tab and try again.');
      }
    })();
  }, [id]);

  useEffect(() => {
    if (sale && garage) {
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [sale, garage]);

  if (err) return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', color: BRAND, textAlign: 'center', marginTop: 80 }}>
      <div style={{ fontSize: 18 }}>⚠ {err}</div>
    </div>
  );

  if (!sale || !garage) return (
    <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#94a3b8', textAlign: 'center', marginTop: 80 }}>
      <div style={{ fontSize: 14 }}>Loading invoice…</div>
    </div>
  );

  const garageAddress = [garage.address, garage.city, garage.state, garage.zipcode].filter(Boolean).join(', ');

  const billToRows = [
    ['Name', sale.customerName],
    ['Mobile', sale.customerMobile],
    ['Email', sale.customerEmail],
    ['Address', sale.customerAddress],
    ['Vehicle No', sale.vehicleNumber],
  ].filter(([, v]) => v);

  const invoiceRows = [
    ['Number', sale.counterNumber],
    ['Date', fmtDate(sale.date || sale.createdAt)],
  ].filter(([, v]) => v);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: '#e2e8f0', minHeight: '100vh', paddingBottom: 48 }}>
      <style>{`
        @page { size: A4; margin: 10mm 12mm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #e2e8f0; }
        @media print {
          body { background: #fff !important; }
          .no-print { display: none !important; }
          .invoice-shell { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
        }
        @media screen { .invoice-shell { box-shadow: 0 8px 40px rgba(0,0,0,0.18); } }
        .info-label { font-size: 10.5px; color: #64748b; padding-right: 12px; padding-bottom: 5px; white-space: nowrap; vertical-align: top; }
        .info-value { font-size: 11px; font-weight: 500; padding-bottom: 5px; vertical-align: top; }
      `}</style>

      {/* Screen toolbar */}
      <div className="no-print" style={{ background: DARK, padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>Invoice — {sale.counterNumber}</span>
        <button
          onClick={() => window.print()}
          style={{ background: BRAND, color: '#fff', border: 'none', padding: '9px 22px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          Print / Save PDF
        </button>
      </div>

      <div className="invoice-shell" style={{ background: '#fff', maxWidth: 860, margin: '32px auto 0' }}>

        {/* ── Header ── */}
        <div style={{ background: DARK, padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 72, height: 56, background: 'rgba(255,255,255,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>LOGO</span>
          </div>
          <div style={{ textAlign: 'right', color: '#fff' }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0.5 }}>{garage.workshopName}</div>
            {garageAddress && <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 5, lineHeight: 1.6 }}>{garageAddress}</div>}
            <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 3 }}>
              {[garage.mobile, garage.mobile2].filter(Boolean).map((m, i) => (
                <span key={m}>{i > 0 && <span style={{ opacity: 0.4, margin: '0 6px' }}>|</span>}☎ {m}</span>
              ))}
            </div>
            {garage.email && <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>✉ {garage.email}</div>}
            {garage.gstNo && <div style={{ fontSize: 10.5, opacity: 0.55, marginTop: 3 }}>GST: {garage.gstNo}</div>}
          </div>
        </div>

        {/* ── Title band ── */}
        <div style={{ background: BRAND, padding: '7px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12, letterSpacing: 2.5, textTransform: 'uppercase' }}>Invoice</span>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11.5 }}>Invoice # {sale.counterNumber}</span>
        </div>

        {/* ── Info grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${BORDER}` }}>
          {/* Bill To */}
          <div style={{ padding: '14px 20px', borderRight: `1px solid ${BORDER}` }}>
            <div style={{ fontWeight: 700, fontSize: 9.5, color: BRAND, letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' }}>Bill To</div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {billToRows.map(([k, v]) => (
                  <tr key={k}>
                    <td className="info-label">{k}</td>
                    <td className="info-value">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Invoice Details */}
          <div style={{ padding: '14px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 9.5, color: BRAND, letterSpacing: 1.5, marginBottom: 10, textTransform: 'uppercase' }}>Invoice Details</div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {invoiceRows.map(([k, v]) => (
                  <tr key={k}>
                    <td className="info-label">{k}</td>
                    <td className="info-value">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Items table ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ background: DARK }}>
              {['#', 'Particulars', 'Type', 'Qty', 'Unit Price (₹)', 'Discount', 'Amount (₹)'].map((h, i) => (
                <th key={h} style={{
                  padding: '10px 12px', color: '#fff', fontWeight: 600, fontSize: 11,
                  textAlign: i === 0 ? 'center' : i <= 2 ? 'left' : 'right',
                  width: [36, undefined, 68, 52, 110, 80, 110][i],
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(sale.items || []).map((item, i) => {
              const b = badge(item.itemType);
              const discDisplay = item.discount > 0
                ? (item.discountType === 'percent' ? `${item.discount}%` : `₹${item.discount}`)
                : '—';
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : STRIPE }}>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#94a3b8', borderBottom: `1px solid ${BORDER}`, fontSize: 11 }}>{i + 1}</td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${BORDER}`, fontWeight: 500 }}>{item.name || '—'}</td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ background: b.bg, color: b.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4 }}>{item.itemType}</span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', borderBottom: `1px solid ${BORDER}` }}>{item.qty ?? 1}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', borderBottom: `1px solid ${BORDER}` }}>{fmt(item.unitPrice)}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', borderBottom: `1px solid ${BORDER}`, color: item.discount > 0 ? BRAND : '#94a3b8' }}>{discDisplay}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'right', borderBottom: `1px solid ${BORDER}`, fontWeight: 600 }}>{fmt(item.amount)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f1f5f9' }}>
              <td colSpan={6} style={{ padding: '10px 12px', fontWeight: 700, fontSize: 12 }}>Total (₹)</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontSize: 12 }}>{fmt(sale.total)}</td>
            </tr>
          </tfoot>
        </table>

        {/* ── Summary & Signature ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', borderTop: `2px solid ${DARK}` }}>
          {/* Breakdown */}
          <div style={{ padding: '18px 24px', borderRight: `1px solid ${BORDER}` }}>
            <div style={{ fontWeight: 700, fontSize: 9.5, color: BRAND, letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' }}>Amount Details</div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1.5px solid ${DARK}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: DARK }}>Bill Amount</span>
              <span style={{ fontWeight: 800, fontSize: 15, color: DARK }}>₹ {fmt(sale.total)}</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#64748b' }}>
              <span>Paid Amount</span>
              <span>₹ {fmt(sale.paidAmount)}</span>
            </div>
            <div style={{ marginTop: 5, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: (sale.balanceDue || 0) > 0 ? BRAND : '#16a34a' }}>
              <span>Balance Due</span>
              <span>₹ {fmt(sale.balanceDue)}</span>
            </div>

            {/* Payment history */}
            {(sale.transactions || []).length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 10, color: '#94a3b8', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Payment History</div>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <tbody>
                    {sale.transactions.map((t, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 10.5, color: '#475569', paddingBottom: 3, paddingRight: 12 }}>{fmtDate(t.date)}</td>
                        <td style={{ fontSize: 10.5, color: '#475569', paddingBottom: 3, paddingRight: 12 }}>{t.paymentType}</td>
                        <td style={{ fontSize: 10.5, fontWeight: 600, textAlign: 'right', paddingBottom: 3 }}>₹ {fmt(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Note */}
            {sale.note && (
              <div style={{ marginTop: 14, padding: '10px 12px', background: STRIPE, borderRadius: 6, borderLeft: `3px solid ${BRAND}` }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: BRAND, letterSpacing: 1, marginBottom: 4, textTransform: 'uppercase' }}>Note</div>
                <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.6 }}>{sale.note}</div>
              </div>
            )}
          </div>

          {/* Signature */}
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 9.5, color: BRAND, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' }}>Authorized Signature</div>
              <div style={{ height: 56 }}></div>
            </div>
            <div style={{ borderTop: `1px solid ${DARK}`, paddingTop: 8, textAlign: 'center', fontWeight: 700, fontSize: 12, color: DARK }}>
              {garage.workshopName}
            </div>
          </div>
        </div>

        {/* ── Amount in words ── */}
        <div style={{ padding: '10px 24px', background: STRIPE, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, fontSize: 11.5 }}>
          <span style={{ fontWeight: 700, color: DARK }}>Amount in Words: </span>
          <span style={{ fontStyle: 'italic', color: '#475569' }}>{inWords(sale.total)}</span>
        </div>

        {/* ── Terms ── */}
        {garage.termsAndConditions && (
          <div style={{ padding: '10px 24px', borderBottom: `1px solid ${BORDER}`, fontSize: 11.5, color: '#64748b', lineHeight: 1.7 }}>
            <span style={{ fontWeight: 600, color: DARK }}>Terms &amp; Conditions: </span>
            {garage.termsAndConditions}
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ background: DARK, padding: '10px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 10.5, letterSpacing: 3 }}>
          ★  ★  ★  ★
        </div>
      </div>
    </div>
  );
}
