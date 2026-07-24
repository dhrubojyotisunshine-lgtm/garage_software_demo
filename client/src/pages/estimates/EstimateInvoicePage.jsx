import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { estimatesApi } from '../../api/estimates';
import useAuthStore from '../../store/authStore';
import TaxInvoiceDoc from '../../components/print/TaxInvoiceDoc';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : null;

export default function EstimateInvoicePage() {
  const { id } = useParams();
  const { garage, fetchMe } = useAuthStore();
  const [est, setEst] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        await fetchMe();
        const { data } = await estimatesApi.getById(id);
        setEst(data);
      } catch {
        setErr('Failed to load estimate. Please close this tab and try again.');
      }
    })();
  }, [id]);

  useEffect(() => {
    if (est && garage) {
      const t = setTimeout(() => window.print(), 700);
      return () => clearTimeout(t);
    }
  }, [est, garage]);

  if (err) return <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#C62828', textAlign: 'center', marginTop: 80 }}>⚠ {err}</div>;
  if (!est || !garage) return <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#94a3b8', textAlign: 'center', marginTop: 80 }}>Loading estimate…</div>;

  const vehicleRows = [
    ['Vehicle Number', est.vehicleNo],
    ['Model', [est.vehicleMake, est.vehicleModel].filter(Boolean).join(' ') || null],
  ].filter(([, v]) => v);

  const metaRows = [
    ['Estimate Number', est.estimateNumber],
    ['Date', fmtDate(est.estimateDate)],
    ['In Time', fmtDateTime(est.createdAt)],
  ].filter(([, v]) => v);

  return (
    <TaxInvoiceDoc
      garage={garage}
      title="Estimate"
      number={est.estimateNumber}
      billTo={{ name: est.customerName, mobile: est.customerMobile }}
      vehicleRows={vehicleRows}
      metaLabel="Estimate Details"
      metaRows={metaRows}
      items={est.items || []}
      summary={{ total: est.total, showPayment: false }}
      footerNote={est.additionalNote || 'This is an estimate only. Final charges may vary based on actual work performed.'}
    />
  );
}
