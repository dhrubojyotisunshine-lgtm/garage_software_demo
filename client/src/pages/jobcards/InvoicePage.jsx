import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { jobcardsApi } from '../../api/jobcards';
import useAuthStore from '../../store/authStore';
import TaxInvoiceDoc from '../../components/print/TaxInvoiceDoc';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : null;
const fmtTime = (t) => { if (!t) return null; const [h, m] = t.split(':'); const d = new Date(); d.setHours(+h, +m); return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); };

export default function InvoicePage() {
  const { id } = useParams();
  const { garage, fetchMe } = useAuthStore();
  const [jc, setJc] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await fetchMe();
        const { data } = await jobcardsApi.getById(id);
        setJc(data);
      } catch {
        setErr('Failed to load invoice. Please close this tab and try again.');
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
  if (!jc || !garage) return <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#94a3b8', textAlign: 'center', marginTop: 80 }}>Loading invoice…</div>;

  const bill = jc.billAmount || 0, paid = jc.paidAmount || 0, bal = jc.balanceDue || 0;
  const paymentStatus = (bal <= 0 && (paid > 0 || bill > 0)) ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';

  const deliveryDisplay = (() => {
    const dp = jc.deliveryDate ? fmtDate(jc.deliveryDate) : '';
    const tp = jc.deliveryTime ? fmtTime(jc.deliveryTime) : '';
    return [dp, tp].filter(Boolean).join(', ') || null;
  })();

  const vehicleRows = [
    ['Vehicle Number', jc.vehicleNo],
    ['Model', [jc.vehicleMake, jc.vehicleModel].filter(Boolean).join(' ') || null],
    ['In KM Reading', jc.kmReading != null && jc.kmReading !== '' ? `${Number(jc.kmReading).toLocaleString('en-IN')}` : null],
    ['In Time', fmtDateTime(jc.createdAt)],
  ].filter(([, v]) => v);

  const metaRows = [
    ['Invoice Number', jc.jobcardNumber],
    ['Date', fmtDate(jc.createdAt)],
    ['Est Delivery', deliveryDisplay],
    ['Status', jc.statusLabel],
    ['Mechanic', jc.mechanicName],
  ].filter(([, v]) => v);

  return (
    <TaxInvoiceDoc
      garage={garage}
      title="Tax Invoice"
      number={jc.jobcardNumber}
      billTo={{ name: jc.customerName, mobile: jc.customerMobile }}
      vehicleRows={vehicleRows}
      metaLabel="Invoice Details"
      metaRows={metaRows}
      items={jc.items || []}
      customerVoice={jc.customerVoiceLabels || []}
      advice={(jc.workNotes || []).map(w => w.note).filter(Boolean)}
      summary={{ total: bill, paid, balance: bal, showPayment: true }}
      paymentStatus={paymentStatus}
      reminder={{
        km: jc.reminderKm && jc.reminderKm !== 'No KM Reminder' ? jc.reminderKm : null,
        period: jc.reminderPeriod || null,
      }}
      footerNote={jc.exitNote || 'Thank you for your visit. Service regularly and ride safely!'}
    />
  );
}
