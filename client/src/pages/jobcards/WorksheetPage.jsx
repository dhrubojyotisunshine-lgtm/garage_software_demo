import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { jobcardsApi } from '../../api/jobcards';
import useAuthStore from '../../store/authStore';
import { assetUrl } from '../../utils/asset';

const HEAD = '#BDD7EE';
const BORDER = '#111111';
const NAME = '#7e22ce';
const EMAIL = '#2563eb';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : null;
const fmtTime = (t) => { if (!t) return null; const [h, m] = t.split(':'); const d = new Date(); d.setHours(+h, +m); return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); };

const th = (extra = {}) => ({ border: `1px solid ${BORDER}`, padding: '6px 8px', fontSize: 11, fontWeight: 700, background: HEAD, textAlign: 'left', ...extra });
const td = (extra = {}) => ({ border: `1px solid ${BORDER}`, padding: '7px 8px', fontSize: 11, verticalAlign: 'top', ...extra });

// Only the actual item rows — no blank padding.
function padRows(items) {
  return items.map(it => ({ name: it.name || '', mechanic: it.mechanicName || '' }));
}

export default function WorksheetPage() {
  const { id } = useParams();
  const { garage, fetchMe } = useAuthStore();
  const [jc, setJc] = useState(null);
  const [history, setHistory] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await fetchMe();
        const { data } = await jobcardsApi.getById(id);
        setJc(data);
        // Last history = most recent earlier jobcard for the same vehicle
        if (data.vehicleNo) {
          try {
            const res = await jobcardsApi.list({ vehicleNoExact: data.vehicleNo, limit: 20 });
            const prev = (res.data.jobcards || [])
              .filter(j => j._id !== data._id && new Date(j.createdAt) <= new Date(data.createdAt))
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
            if (prev) setHistory(prev);
          } catch { /* ignore */ }
        }
      } catch {
        setErr('Failed to load worksheet. Please close this tab and try again.');
      }
    })();
  }, [id]);

  useEffect(() => {
    if (jc && garage) {
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [jc, garage]);

  if (err) return <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#C62828', textAlign: 'center', marginTop: 80 }}>⚠ {err}</div>;
  if (!jc || !garage) return <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#94a3b8', textAlign: 'center', marginTop: 80 }}>Loading worksheet…</div>;

  const logo = assetUrl(garage.branding?.logoUrl || garage.logoUrl) || null;
  const garageAddress = [garage.address, garage.city, garage.state, garage.zipcode].filter(Boolean).join(', ');

  const particulars = padRows((jc.items || []).filter(i => i.itemType === 'Spare' || i.itemType === 'Lube' || i.itemType === 'Outsource'));
  const labour = padRows((jc.items || []).filter(i => i.itemType === 'Labour'));

  const readyBy = (() => {
    const dp = jc.deliveryDate ? fmtDate(jc.deliveryDate) : '';
    const tp = jc.deliveryTime ? fmtTime(jc.deliveryTime) : '';
    return [dp, tp].filter(Boolean).join(', ');
  })();

  const histWork = history
    ? (history.exitNote || (history.workNotes || []).map(n => n.note).filter(Boolean).join('; ') || (history.customerVoiceLabels || []).join(', ') || '—')
    : null;

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

      <div className="no-print" style={{ background: '#1e293b', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>Mechanic Worksheet — {jc.jobcardNumber}</span>
        <button onClick={() => window.print()}
          style={{ background: '#C62828', color: '#fff', border: 'none', padding: '9px 22px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Download / Print
        </button>
      </div>

      <div className="doc-shell" style={{ background: '#fff', maxWidth: 860, margin: '24px auto 0', padding: 18 }}>
        <div style={{ textAlign: 'center', fontSize: 15, marginBottom: 8 }}>Mechanic Worksheet</div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
          <div style={{ width: 110, minHeight: 60, display: 'flex', alignItems: 'center' }}>
            {logo
              ? <img src={logo} alt="logo" style={{ maxWidth: 110, maxHeight: 70, objectFit: 'contain' }} />
              : <div style={{ fontSize: 18, fontWeight: 800, color: NAME }}>{garage.workshopName}</div>}
          </div>
          <div style={{ textAlign: 'right', lineHeight: 1.5 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: NAME }}>{garage.workshopName}</div>
            {garage.gstNo && <div style={{ fontSize: 10.5, color: '#64748b' }}>GSTN: {garage.gstNo}</div>}
            {garageAddress && <div style={{ fontSize: 11 }}>{garageAddress}</div>}
            <div style={{ fontSize: 11 }}>Phone: {[garage.mobile, garage.mobile2].filter(Boolean).join(' / ')}</div>
            {garage.email && <div style={{ fontSize: 11, color: EMAIL }}>Email: {garage.email}</div>}
          </div>
        </div>

        {/* Vehicle | Jobcard */}
        <table style={{ width: '100%', marginBottom: 14 }}>
          <tbody>
            <tr>
              <th style={th({ width: '55%' })}>Vehicle Details</th>
              <th style={th()}>Jobcard Details</th>
            </tr>
            <tr>
              <td style={td()}>
                <div>Vehicle Number: {jc.vehicleNo || '—'}</div>
                <div>Model: {[jc.vehicleMake, jc.vehicleModel].filter(Boolean).join(' ') || '—'}</div>
                <div>In KM Reading: {jc.kmReading != null && jc.kmReading !== '' ? Number(jc.kmReading).toLocaleString('en-IN') : '0'}</div>
              </td>
              <td style={td({ textAlign: 'right' })}>
                <div>Jobcard Number: {jc.jobcardNumber || '—'}</div>
                <div>Date: {fmtDate(jc.createdAt)}</div>
                {readyBy && <div>Est Delivery Time: {readyBy}</div>}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Customer Voice & Notes */}
        {((jc.customerVoiceLabels || []).length > 0 || (jc.workNotes || []).length > 0) && (
          <table style={{ width: '100%', marginBottom: 14 }}>
            <tbody>
              {(jc.customerVoiceLabels || []).length > 0 && (
                <tr>
                  <th style={th({ width: 150 })}>Customer Voice</th>
                  <td style={td()}>{jc.customerVoiceLabels.join(', ')}</td>
                </tr>
              )}
              {(jc.workNotes || []).length > 0 && (
                <tr>
                  <th style={th({ width: 150 })}>Advice</th>
                  <td style={td()}>{jc.workNotes.map(n => n.note).filter(Boolean).join('; ')}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Particulars (spares / lubes / outsource) — no prices */}
        <table style={{ width: '100%', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={th({ width: 36, textAlign: 'center' })}>#</th>
              <th style={th()}>Particulars</th>
              <th style={th({ width: 130 })}>Status</th>
              <th style={th({ width: 160 })}>Mechanic</th>
              <th style={th({ width: 160 })}>Remark</th>
            </tr>
          </thead>
          <tbody>
            {particulars.map((r, i) => (
              <tr key={i}>
                <td style={td({ textAlign: 'center' })}>{i + 1}</td>
                <td style={td({ height: 24 })}>{r.name}</td>
                <td style={td()} />
                <td style={td()}>{r.mechanic}</td>
                <td style={td()} />
              </tr>
            ))}
          </tbody>
        </table>

        {/* Labour — no prices */}
        <table style={{ width: '100%', marginBottom: 16, marginTop: -1 }}>
          <thead>
            <tr>
              <th style={th({ width: 36, textAlign: 'center' })}>#</th>
              <th style={th()}>Labour</th>
              <th style={th({ width: 130 })}>Status</th>
              <th style={th({ width: 160 })}>Mechanic</th>
              <th style={th({ width: 160 })}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {labour.map((r, i) => (
              <tr key={i}>
                <td style={td({ textAlign: 'center' })}>{i + 1}</td>
                <td style={td({ height: 26 })}>{r.name}</td>
                <td style={td()} />
                <td style={td()}>{r.mechanic}</td>
                <td style={td()} />
              </tr>
            ))}
          </tbody>
        </table>

        {/* Last History */}
        <table style={{ width: '100%', marginBottom: 16 }}>
          <tbody>
            <tr><th style={th()}>Last History</th></tr>
            <tr>
              <td style={td()}>
                {history ? (
                  <>
                    <div>Service Date: {fmtDate(history.createdAt)}{history.statusCategory === 'Closed' ? `, Closed Date: ${fmtDate(history.updatedAt)}` : ''}</div>
                    <div>Assigned Mechanic: {history.mechanicName || '—'}</div>
                    <div>Work Details: {histWork}</div>
                  </>
                ) : (
                  <div style={{ color: '#94a3b8' }}>No previous service history for this vehicle.</div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Ready by */}
        <table style={{ width: '100%' }}>
          <tbody>
            <tr>
              <td style={td({ textAlign: 'center', fontWeight: 700, fontSize: 13, padding: '10px 8px' })}>
                Vehicle Need to be ready by {readyBy || fmtDateTime(jc.createdAt)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Gate Pass (appended below the worksheet) ── */}
        <div style={{ marginTop: 18, border: `2px dashed #C62828`, breakInside: 'avoid' }}>
          <div style={{ background: '#C62828', color: '#fff', textAlign: 'center', fontWeight: 800, fontSize: 13, letterSpacing: 3, padding: '6px 0', textTransform: 'uppercase' }}>
            Gate Pass
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px' }}>
            <div style={{ fontWeight: 700, color: NAME }}>{garage.workshopName}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Pass No: {jc.jobcardNumber}</div>
          </div>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <td style={td({ width: '50%', border: 'none' })}>
                  <div>Vehicle Number: {jc.vehicleNo || '—'}</div>
                  <div>Model: {[jc.vehicleMake, jc.vehicleModel].filter(Boolean).join(' ') || '—'}</div>
                  <div>Customer: {jc.customerName || '—'}</div>
                  <div>Mobile: {jc.customerMobile || '—'}</div>
                </td>
                <td style={td({ border: 'none' })}>
                  <div>In Time: {fmtDateTime(jc.createdAt)}</div>
                  <div>Out Date/Time: {readyBy || '—'}</div>
                  <div style={{ fontWeight: 700 }}>Est. Delivery Date &amp; Time: {readyBy || fmtDateTime(jc.createdAt)}</div>
                  <div>KM Reading: {jc.kmReading != null && jc.kmReading !== '' ? Number(jc.kmReading).toLocaleString('en-IN') : '0'}</div>
                  <div style={{ fontWeight: 700, color: '#C62828' }}>Estimated Amount: ₹ {Number(jc.billAmount || jc.total || 0).toLocaleString('en-IN')}</div>
                </td>
              </tr>
            </tbody>
          </table>
          <table style={{ width: '100%', borderTop: `1px solid ${BORDER}` }}>
            <tbody>
              <tr>
                {['Security', 'Customer', 'Authorised By'].map((sig, i) => (
                  <td key={sig} style={{ width: '33.33%', padding: '30px 10px 10px', textAlign: 'center', borderRight: i < 2 ? `1px solid ${BORDER}` : 'none' }}>
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 5, fontSize: 11 }}>{sig} Signature</div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <div style={{ padding: '6px 12px', background: '#f8fafc', fontSize: 10, color: '#94a3b8', textAlign: 'center', borderTop: `1px solid ${BORDER}` }}>
            Vehicle may leave the premises only after balance dues are cleared and this pass is signed.
          </div>
        </div>
      </div>
    </div>
  );
}
