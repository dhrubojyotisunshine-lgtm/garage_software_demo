import { X } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';

// Read-only view of every payment made against a sale (advance + installments).
export default function PaymentHistoryModal({ sale, onClose }) {
  const p = sale.payment || {};
  const rows = [];
  if ((p.advancePaid || 0) > 0) {
    rows.push({ date: p.paymentDate || sale.saleDate, amount: p.advancePaid, mode: p.paymentMode, reference: p.transactionId, note: 'Advance at sale' });
  }
  (sale.payments || []).forEach(x => rows.push({ date: x.date, amount: x.amount, mode: x.mode, reference: x.reference, note: x.note }));

  const totalPaid = p.totalPaid ?? ((p.advancePaid || 0) + (sale.payments || []).reduce((s, x) => s + (x.amount || 0), 0));

  const Summary = ({ label, value, cls }) => (
    <div className="bg-gray-50 rounded-lg px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-base font-bold ${cls || 'text-gray-800'}`}>{value}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 pt-6 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Payment History</h2>
            <p className="text-sm text-gray-500">{sale.invoiceNo} · {sale.customer?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Summary label="Net Payable" value={formatCurrency(p.netPayable)} />
            <Summary label="Total Paid" value={formatCurrency(totalPaid)} cls="text-green-600" />
            <Summary label="Balance" value={formatCurrency(p.balanceAmount)} cls={(p.balanceAmount || 0) > 0 ? 'text-red-600' : 'text-gray-800'} />
            <Summary label="Status" value={p.paymentStatus || '-'} cls={p.paymentStatus === 'Paid' ? 'text-green-600' : 'text-amber-600'} />
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {['#', 'Date', 'Amount', 'Mode', 'Reference', 'Note'].map((h, i) => (
                    <th key={h} className={`py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase ${i === 2 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No payments recorded</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0">
                    <td className="py-2.5 px-3 text-gray-500">{i + 1}</td>
                    <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-gray-800">{formatCurrency(r.amount)}</td>
                    <td className="py-2.5 px-3 text-gray-600">{r.mode || '-'}</td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">{r.reference || '-'}</td>
                    <td className="py-2.5 px-3 text-gray-500 text-xs">{r.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
