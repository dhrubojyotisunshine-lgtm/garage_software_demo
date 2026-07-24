import { Wallet, CreditCard, History } from 'lucide-react';
import { DateField } from '../ui/DateField';
import { SectionCard, Field, inputCls, errorCls } from './parts';
import { computeDerived, num } from '../../pages/VehicleSale/saleUtils';
import { formatCurrency, formatDate } from '../../utils/format';

function SummaryRow({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className={`text-sm ${strong ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-sm ${strong ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{value}</span>
    </div>
  );
}

export default function Step7Payment({ form, setTop, setNested, errors }) {
  const p = form.payment;
  const d = computeDerived(form).payment;

  // Full payment trail = advance (if any) + recorded installments.
  const history = [];
  if (num(p.advancePaid) > 0) history.push({ date: p.paymentDate, amount: p.advancePaid, mode: p.paymentMode, reference: p.transactionId, note: 'Advance at sale' });
  (form.payments || []).forEach(x => history.push({ date: x.date, amount: x.amount, mode: x.mode, reference: x.reference, note: x.note }));

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SectionCard title="Payment Summary" icon={Wallet}>
        <SummaryRow label="Showroom Price" value={formatCurrency(d.showroomPrice)} />
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500">Finance Amount</span>
          <input type="number" className={`${inputCls} max-w-[160px] text-right`} value={p.totalDiscount} onChange={e => setNested('payment', 'totalDiscount', e.target.value)} />
        </div>
        <SummaryRow label="Net Payable" value={formatCurrency(d.netPayable)} strong />
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500">Advance/Full Payment/DP Payment</span>
          <input type="number" className={`${inputCls} max-w-[160px] text-right`} value={p.advancePaid} onChange={e => setNested('payment', 'advancePaid', e.target.value)} />
        </div>
        <SummaryRow label="Total Paid" value={formatCurrency(d.totalPaid)} strong />
        <SummaryRow label="Balance Amount" value={formatCurrency(d.balanceAmount)} strong />
      </SectionCard>

      <SectionCard title="Payment Information" icon={CreditCard}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Payment Mode">
            <select className={inputCls} value={p.paymentMode} onChange={e => setNested('payment', 'paymentMode', e.target.value)}>
              <option value="">Select Mode</option>
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="UPI">UPI</option>
              <option value="Cheque">Cheque</option>
              <option value="Card">Card</option>
              <option value="Finance">Finance</option>
            </select>
          </Field>
          <Field label="Transaction ID / Ref No.">
            <input className={inputCls} value={p.transactionId} onChange={e => setNested('payment', 'transactionId', e.target.value)} />
          </Field>
          <Field label="Payment Date">
            <DateField value={p.paymentDate} onChange={e => setNested('payment', 'paymentDate', e.target.value)} className={`${inputCls} w-full`} />
          </Field>
          <Field label="Payment Status" required error={errors['payment.paymentStatus']}>
            <div className="flex items-center gap-6 pt-1.5">
              {['Paid', 'Pending'].map(s => (
                <label key={s} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" name="paymentStatus" className="accent-primary w-4 h-4" checked={p.paymentStatus === s} onChange={() => setNested('payment', 'paymentStatus', s)} />
                  {s}
                </label>
              ))}
            </div>
          </Field>
        </div>
      </SectionCard>
    </div>

    {history.length > 0 && (
      <SectionCard title="Payment History" icon={History}>
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
              {history.map((r, i) => (
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
        <p className="text-xs text-gray-400 mt-2">Use “Add Payment” from the Sales List to record new installments.</p>
      </SectionCard>
    )}

    {/* Booking Details — moved here from the Vehicle Details step. */}
    <SectionCard title="Booking Details">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Field label="Booking Number">
          <input className={inputCls} value={form.bookingNo} onChange={e => setTop('bookingNo', e.target.value)} />
        </Field>
        <Field label="Booking Date">
          <DateField value={form.bookingDate} onChange={e => setTop('bookingDate', e.target.value)} className={`${inputCls} w-full`} />
        </Field>
        <Field label="Expected Delivery Date">
          <DateField value={form.deliveryDate} onChange={e => setTop('deliveryDate', e.target.value)} className={`${inputCls} w-full`} />
        </Field>
        <Field label="Invoice No.">
          <input className={`${inputCls} bg-gray-50 text-gray-500`} value={form.invoiceNo || ''} readOnly placeholder="Auto-generated on save" />
        </Field>
        <Field label="Sale Type" required error={errors['saleType']}>
          <select className={inputCls} value={form.saleType} onChange={e => setTop('saleType', e.target.value)}>
            <option value="Cash">Cash</option>
            <option value="Finance">Finance</option>
            <option value="Exchange">Exchange</option>
          </select>
        </Field>
        <Field label="Enter Financer">
          <input className={inputCls} value={form.salesExecutive} onChange={e => setTop('salesExecutive', e.target.value)} placeholder="Enter Financer" />
        </Field>
      </div>
    </SectionCard>
    </>
  );
}
