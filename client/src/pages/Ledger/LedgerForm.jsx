import DateField from '../../components/ui/DateField';
import PartySelect from '../../components/PartySelect';

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const errorCls = 'text-red-500 text-xs mt-0.5';

// Presentational field set for the Ledger form. State/save handled by LedgerModal.
export default function LedgerForm({ form, errors, set, patch }) {
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Party Name <span className="text-red-500">*</span></label>
        <PartySelect
          selectedName={form.partyName}
          selectedPhone={form.partyPhone}
          onSelect={(p) => patch({ partyId: p._id, partyName: p.partyName, partyPhone: p.phone })}
        />
        {errors.partyName && <p className={errorCls}>{errors.partyName}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Amount <span className="text-red-500">*</span></label>
          <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} className={inputCls} />
          {errors.amount && <p className={errorCls}>{errors.amount}</p>}
        </div>
        <div>
          <label className={labelCls}>Date <span className="text-red-500">*</span></label>
          <DateField value={form.date} onChange={e => set('date', e.target.value)} className={`${inputCls} w-full`} />
          {errors.date && <p className={errorCls}>{errors.date}</p>}
        </div>
      </div>

      <div>
        <label className={labelCls}>Type <span className="text-red-500">*</span></label>
        <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
          <option value="">Select Type</option>
          <option value="Credit">Credit</option>
          <option value="Debit">Debit</option>
        </select>
        {errors.type && <p className={errorCls}>{errors.type}</p>}
      </div>

      <div>
        <label className={labelCls}>Narration</label>
        <textarea rows={2} value={form.narration} onChange={e => set('narration', e.target.value)} className={inputCls} />
      </div>

      <div>
        <label className={labelCls}>Remark</label>
        <textarea rows={2} value={form.remark} onChange={e => set('remark', e.target.value)} className={inputCls} />
      </div>
    </div>
  );
}
