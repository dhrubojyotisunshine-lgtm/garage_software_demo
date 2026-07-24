import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { vehicleSaleApi } from '../../api/vehicleSaleApi';
import useAuthStore from '../../store/authStore';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency, formatDate } from '../../utils/format';
import { downloadInvoicePdf } from './invoicePdf';

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className={`text-sm ${strong ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-sm ${strong ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{value}</span>
    </div>
  );
}

export default function VehicleSaleInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { garage } = useAuthStore();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vehicleSaleApi.get(id)
      .then(({ data }) => setSale(data))
      .catch(() => toast({ title: 'Failed to load invoice', variant: 'error' }))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="py-16 text-center text-gray-400">Loading…</div>;
  if (!sale) return <div className="py-16 text-center text-gray-400">Invoice not found.</div>;

  const d = sale.dealer || {}, c = sale.customer || {}, p = sale.payment || {};
  const gstin = d.gstin || garage?.gstNo || '';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toolbar — hidden when printing */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <button onClick={() => navigate('/sale/vehicle-sales')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => downloadInvoicePdf(sale, garage?.gstNo)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-green-300 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 bg-white">
            <Download size={14} /> Download PDF
          </button>
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Invoice sheet */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 print:border-0 print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-4 mb-4">
          <div>
            <h1 className="font-heading font-bold text-gray-800 text-xl">{d.name || 'Vehicle Sale'}</h1>
            <div className="text-xs text-gray-500 mt-1 whitespace-pre-line">{d.address}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {d.phone && <span>Phone: {d.phone} </span>}{d.email && <span>· {d.email} </span>}{gstin && <span>· GSTIN: {gstin}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="font-heading font-bold text-gray-700 text-lg">TAX INVOICE</div>
            <div className="text-sm text-gray-600 mt-1">Invoice: <b>{sale.invoiceNo}</b></div>
            <div className="text-sm text-gray-600">Date: {formatDate(sale.saleDate)}</div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Bill To</div>
          <div className="text-sm font-medium text-gray-800">{c.name}</div>
          <div className="text-xs text-gray-500">
            {c.mobile && <span>Mobile: {c.mobile} </span>}{c.email && <span>· {c.email} </span>}{c.pan && <span>· PAN: {c.pan}</span>}{c.aadhar && <span>· Aadhar: {c.aadhar}</span>}
          </div>
          {c.address && <div className="text-xs text-gray-500 whitespace-pre-line">{c.address}</div>}
        </div>

        {/* Vehicles */}
        <div className="overflow-x-auto mb-5">
          <table className="w-full text-sm border border-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['#', 'Vehicle Model', 'Variant', 'Color', 'Chassis No.', 'Engine No.', 'Price'].map((h) => (
                  <th key={h} className="py-2 px-3 text-xs font-semibold text-gray-500 text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sale.vehicles || []).map((v, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0 text-center">
                  <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                  <td className="py-2 px-3 text-gray-800 font-medium">{v.vehicleModel || '-'}</td>
                  <td className="py-2 px-3 text-gray-600">{v.variant || '-'}</td>
                  <td className="py-2 px-3 text-gray-600">{v.color || '-'}</td>
                  <td className="py-2 px-3 text-gray-600 text-xs">{v.chassisNumber || '-'}</td>
                  <td className="py-2 px-3 text-gray-600 text-xs">{v.engineNumber || '-'}</td>
                  <td className="py-2 px-3 text-gray-800">{formatCurrency(v.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment section: sale meta on the left, summary table on the right */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="text-sm text-gray-600 space-y-1">
            <div>Type: {sale.saleType}</div>
            {sale.salesExecutive && <div>Financer: {sale.salesExecutive}</div>}
          </div>
          <div className="w-full sm:max-w-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Payment Summary</div>
          <table className="w-full text-sm border border-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-2 px-3 text-left text-xs font-semibold text-gray-500">Description</th>
                <th className="py-2 px-3 text-right text-xs font-semibold text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Showroom Price', p.showroomPrice ?? p.grossAmount, true],
                ['Finance Amount', p.totalDiscount],
                ['Net Payable', p.netPayable, true],
                ['Advance/Full Payment/DP Payment', p.advancePaid],
                ['Balance Amount', p.balanceAmount, true],
              ].map(([label, val, strong]) => (
                <tr key={label} className={`border-b border-gray-100 last:border-0 ${strong ? 'bg-gray-50' : ''}`}>
                  <td className={`py-1.5 px-3 ${strong ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{label}</td>
                  <td className={`py-1.5 px-3 text-right ${strong ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{formatCurrency(val)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Payment meta + narration */}
        <div className="mt-5 pt-4 border-t border-gray-200 text-sm text-gray-600 space-y-1">
          <div>Payment Status: <b>{p.paymentStatus || '-'}</b> · Mode: {p.paymentMode || '-'} · Ref: {p.transactionId || '-'}{p.paymentDate ? ` · ${formatDate(p.paymentDate)}` : ''}</div>
          {sale.narration && <div>{sale.narration}</div>}
          {sale.remark && <div>{sale.remark}</div>}
        </div>
      </div>
    </div>
  );
}
