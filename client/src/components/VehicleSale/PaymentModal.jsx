import { useState } from 'react';
import { X } from 'lucide-react';
import { DateField } from '../ui/DateField';
import { vehicleSaleApi } from '../../api/vehicleSaleApi';
import { useToast } from '../ui/Toast';
import { formatCurrency } from '../../utils/format';

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

// Record a "pay remaining" installment against a sale.
export default function PaymentModal({ sale, onClose, onSaved }) {
  const balance = sale.payment?.balanceAmount || 0;
  const today = String(sale.saleDate || '').slice(0, 10);
  const [form, setForm] = useState({ amount: balance > 0 ? String(balance) : '', date: today, mode: '', reference: '', note: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    const amt = Number(form.amount);
    if (!amt || amt <= 0) { setError('Enter a valid payment amount.'); return; }
    if (balance <= 0) { setError('This sale is already fully paid.'); return; }
    if (amt > balance) { setError(`Payment exceeds remaining balance (${formatCurrency(balance)}).`); return; }
    setError('');
    setSaving(true);
    try {
      const { data } = await vehicleSaleApi.addPayment(sale._id, { ...form, amount: amt });
      toast({ title: 'Payment recorded', variant: 'success' });
      onSaved?.(data);
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Failed to record payment', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex items-start justify-between px-6 pt-6 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Add Payment</h2>
            <p className="text-sm text-gray-500">{sale.invoiceNo} · {sale.customer?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
            <span className="text-gray-500">Remaining Balance</span>
            <span className={`font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(balance)}</span>
          </div>

          <div>
            <label className={labelCls}>Amount <span className="text-red-500">*</span></label>
            <input type="number" min="0" max={balance > 0 ? balance : undefined} className={inputCls} value={form.amount} onChange={e => set('amount', e.target.value)} />
            {error && <p className="text-red-500 text-xs mt-0.5">{error}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date</label>
              <DateField value={form.date} onChange={e => set('date', e.target.value)} className={`${inputCls} w-full`} />
            </div>
            <div>
              <label className={labelCls}>Mode</label>
              <select className={inputCls} value={form.mode} onChange={e => set('mode', e.target.value)}>
                <option value="">Select Mode</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Card">Card</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Transaction ID / Ref No.</label>
            <input className={inputCls} value={form.reference} onChange={e => set('reference', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Note</label>
            <input className={inputCls} value={form.note} onChange={e => set('note', e.target.value)} />
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-600 disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Save Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
