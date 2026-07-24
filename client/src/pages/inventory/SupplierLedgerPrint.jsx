import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { suppliersApi } from '../../api/suppliers';
import useAuthStore from '../../store/authStore';

const BORDER = '#111111';
const NAME = '#7e22ce';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cell = (extra = {}) => ({ borderBottom: `1px solid #ccc`, padding: '6px 8px', fontSize: 11, verticalAlign: 'top', ...extra });
const hcell = (extra = {}) => ({ borderBottom: `1.5px solid ${BORDER}`, borderTop: `1.5px solid ${BORDER}`, padding: '6px 8px', fontSize: 11, fontWeight: 700, textAlign: 'left', ...extra });

export default function SupplierLedgerPrint() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { garage, fetchMe } = useAuthStore();
  const [ledger, setLedger] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await fetchMe();
        const params = {};
        const df = searchParams.get('dateFrom'); const dt = searchParams.get('dateTo');
        if (df) params.dateFrom = df;
        if (dt) params.dateTo = dt;
        const { data } = await suppliersApi.ledger(id, params);
        setLedger(data);
      } catch {
        setErr('Failed to load ledger. Please close this tab and try again.');
      }
    })();
  }, [id]);

  useEffect(() => {
    if (ledger && garage) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [ledger, garage]);

  if (err) return <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#C62828', textAlign: 'center', marginTop: 80 }}>⚠ {err}</div>;
  if (!ledger || !garage) return <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#94a3b8', textAlign: 'center', marginTop: 80 }}>Loading ledger…</div>;

  const { supplier, rows, opening, totalDebit, totalCredit, closing, range } = ledger;
  const garageAddress = [garage.address, garage.city, garage.state, garage.zipcode].filter(Boolean).join(', ');
  const rangeLabel = (range?.dateFrom || range?.dateTo)
    ? `${range.dateFrom ? fmtDate(range.dateFrom) : '…'} to ${range.dateTo ? fmtDate(range.dateTo) : '…'}`
    : 'All dates';

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: '#e2e8f0', minHeight: '100vh', paddingBottom: 48, color: '#111' }}>
      <style>{`
        @page { size: A4; margin: 10mm; }
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
        <span style={{ color: '#94a3b8', fontSize: 13 }}>Supplier Ledger — {supplier.firmName}</span>
        <button onClick={() => window.print()}
          style={{ background: '#C62828', color: '#fff', border: 'none', padding: '9px 22px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Download / Print
        </button>
      </div>

      <div className="doc-shell" style={{ background: '#fff', maxWidth: 900, margin: '24px auto 0', padding: 24 }}>
        {/* Garage header */}
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: NAME }}>{garage.workshopName}</div>
          {garageAddress && <div style={{ fontSize: 11, color: '#475569' }}>{garageAddress}</div>}
          {garage.gstNo && <div style={{ fontSize: 10.5, color: '#64748b' }}>GSTN: {garage.gstNo}</div>}
        </div>

        {/* Ledger party */}
        <div style={{ textAlign: 'center', marginTop: 10, marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{supplier.firmName}</div>
          <div style={{ fontSize: 12, color: '#475569' }}>Ledger Account</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{rangeLabel}</div>
        </div>

        {/* Ledger table */}
        <table style={{ width: '100%', marginTop: 12 }}>
          <thead>
            <tr>
              <th style={hcell({ width: 90 })}>Date</th>
              <th style={hcell()}>Particulars</th>
              <th style={hcell({ width: 80 })}>Vch Type</th>
              <th style={hcell({ width: 80 })}>Vch No.</th>
              <th style={hcell({ width: 95, textAlign: 'right' })}>Debit</th>
              <th style={hcell({ width: 95, textAlign: 'right' })}>Credit</th>
              <th style={hcell({ width: 100, textAlign: 'right' })}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {/* Opening */}
            <tr>
              <td style={cell()} />
              <td style={cell({ fontWeight: 600 })}>Opening Balance</td>
              <td style={cell()} />
              <td style={cell()} />
              <td style={cell()} />
              <td style={cell()} />
              <td style={cell({ textAlign: 'right', fontWeight: 700 })}>{fmt(opening)}</td>
            </tr>

            {rows.map((r, i) => (
              <tr key={i}>
                <td style={cell({ whiteSpace: 'nowrap' })}>{fmtDate(r.date)}</td>
                <td style={cell()}>
                  <div style={{ fontWeight: 700 }}>
                    <span style={{ fontSize: 9.5, fontWeight: 700, marginRight: 5, color: r.credit > 0 ? NAME : '#16a34a' }}>{r.credit > 0 ? 'Cr' : 'Dr'}</span>
                    {r.particulars}
                  </div>
                  <div style={{ fontStyle: 'italic', color: '#64748b', fontSize: 10 }}>{r.narration}</div>
                </td>
                <td style={cell()}>{r.vchType}</td>
                <td style={cell()}>{r.vchNo || ''}</td>
                <td style={cell({ textAlign: 'right' })}>{r.debit ? fmt(r.debit) : ''}</td>
                <td style={cell({ textAlign: 'right' })}>{r.credit ? fmt(r.credit) : ''}</td>
                <td style={cell({ textAlign: 'right', fontWeight: 600 })}>{fmt(r.balance)}</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr><td style={cell({ textAlign: 'center', color: '#94a3b8' })} colSpan={7}>No entries in this range</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ borderTop: `1.5px solid ${BORDER}`, padding: '8px', fontWeight: 700, fontSize: 11 }} colSpan={4}>Closing Balance</td>
              <td style={{ borderTop: `1.5px solid ${BORDER}`, padding: '8px', fontWeight: 700, fontSize: 11, textAlign: 'right' }}>{fmt(totalDebit)}</td>
              <td style={{ borderTop: `1.5px solid ${BORDER}`, padding: '8px', fontWeight: 700, fontSize: 11, textAlign: 'right' }}>{fmt(totalCredit)}</td>
              <td style={{ borderTop: `1.5px solid ${BORDER}`, padding: '8px', fontWeight: 800, fontSize: 11, textAlign: 'right' }}>{fmt(closing)}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ marginTop: 10, fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
          Balance is outstanding payable to supplier. Cr = purchase (payable), Dr = payment made.
        </div>
      </div>
    </div>
  );
}
