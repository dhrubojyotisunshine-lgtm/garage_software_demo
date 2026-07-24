import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { customersApi } from '../../api/customers';
import { formatCurrency } from '../../utils/format';

// Format a date as "5:59 PM 14 Jul 26"
// "04 Jun 26 03:06 pm" — date first, then 12-hour time (lowercase am/pm)
const fmtDT = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  const date = dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  const time = dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  return `${date} ${time}`;
};

// Date only, no time-of-day (for the delivery date which has no meaningful time component)
const fmtDateOnly = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
};

function Row({ label, value }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-500 w-36 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-semibold">{value}</span>
    </div>
  );
}

// Right-side drawer showing the customer's most recent PREVIOUS jobcard.
export default function LastHistoryDrawer({ customerId, excludeId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [jc, setJc] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!customerId) { setLoading(false); return; }
    customersApi.getJobcards(customerId)
      .then(({ data }) => {
        const list = (data?.jobcards || [])
          .filter(j => String(j._id) !== String(excludeId))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setCount(list.length);
        setJc(list[0] || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId, excludeId]);

  const lastTxn = jc?.transactions?.length ? jc.transactions[jc.transactions.length - 1] : null;
  const paymentMode = lastTxn ? `${lastTxn.paymentType || '-'}${lastTxn.details ? ` (${lastTxn.details})` : ''}` : '-';
  const nextService = [
    jc?.reminderPeriod,
    jc?.reminderKm ? `On ${jc.reminderKm} Km` : null
  ].filter(Boolean).join(' / ') || '-';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[560px] bg-white z-50 shadow-2xl overflow-y-auto border-l-4 border-red-500">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-red-500 rounded-full" />
            <h2 className="text-xl font-semibold text-gray-800">Last History <span className="text-primary">({count})</span></h2>
          </div>
          <div className="flex items-center gap-3">
            {jc && <span className="text-sm text-gray-500">{fmtDT(jc.createdAt)}</span>}
            <button onClick={onClose} className="text-gray-500 hover:text-red-600"><X size={22} /></button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading…</div>
        ) : !jc ? (
          <div className="py-20 text-center text-gray-400">No previous jobcard history for this customer.</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Summary grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
              <Row label="Running Km:" value={jc.kmReading ?? '-'} />
              <Row label="Invoice No.:" value={jc.jobcardNumber || '-'} />
              <Row label="Next Service Due:" value={nextService} />
              <Row label="Invoice Amount:" value={formatCurrency(jc.billAmount || 0)} />
              <Row label="Estimate:" value={jc.costEstimate != null ? String(jc.costEstimate) : '-'} />
              <Row label="Paid:" value={formatCurrency(jc.paidAmount || 0)} />
              <Row label="Mechanic:" value={jc.mechanicName || '-'} />
              <Row label="Payment Mode:" value={paymentMode} />
            </div>

            {/* Invoice / job details */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Invoice Details</p>
              <div className="rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm min-w-[420px]">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">#</th>
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Particulars</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Qty</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Unit Price</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(jc.items || []).length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-6 text-gray-400">No items</td></tr>
                    ) : jc.items.map((it, i) => (
                      <tr key={it._id || i} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                        <td className="py-2 px-3 text-gray-800">{it.name || '-'}</td>
                        <td className="py-2 px-3 text-right text-gray-700">{it.qty ?? 1}</td>
                        <td className="py-2 px-3 text-right text-gray-700">{formatCurrency(it.unitPrice || 0)}</td>
                        <td className="py-2 px-3 text-right font-medium text-gray-800">{formatCurrency(it.finalAmount || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                      <td className="py-2 px-3" colSpan={4}>Total</td>
                      <td className="py-2 px-3 text-right text-gray-900">{formatCurrency(jc.total || jc.billAmount || 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <Row label="Create Time:" value={`${fmtDT(jc.createdAt)}${jc.statusLabel ? ` (${jc.statusLabel})` : ''}`} />
              <Row label="Complete Time:" value={fmtDT(jc.updatedAt)} />
              <Row label="Delivery Time:" value={[jc.deliveryTime, fmtDateOnly(jc.deliveryDate)].filter(Boolean).join(' ') || '-'} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
