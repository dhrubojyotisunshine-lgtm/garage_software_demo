import { useEffect, useState } from 'react';
import { mastersApi } from '../api/masters';
import { DateField } from './ui/DateField';

const inputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';
const labelCls = 'text-xs font-medium text-gray-500 mb-1 block';

/**
 * "Apply Insurance Claim" checkbox + claim details.
 *   value    – { applied, companyId, companyName, policyNo, accidentDate, idv, claimNo }
 *   onChange – fn(nextValue)
 * The claim section is only rendered while the checkbox is ticked, so normal
 * customers see just the (unchecked) checkbox.
 */
export default function InsuranceClaimFields({ value, onChange }) {
  const [companies, setCompanies] = useState([]);
  const v = value || {};
  const set = (patch) => onChange({ ...v, ...patch });

  useEffect(() => {
    if (!v.applied || companies.length) return;
    mastersApi.list('insurance-companies').then(r => setCompanies(r.data || [])).catch(() => {});
  }, [v.applied]);

  return (
    <div className="col-span-2 sm:col-span-2">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={!!v.applied} onChange={e => set({ applied: e.target.checked })} className="w-4 h-4 accent-primary" />
        <span className="text-sm font-medium text-gray-700">Apply Insurance Claim</span>
      </label>

      {v.applied && (
        <div className="mt-3 border border-border rounded-lg p-3 bg-gray-50/60">
          <p className="text-sm font-semibold text-gray-700 mb-2">Insurance Claim Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Insurance Company <span className="text-red-500">*</span></label>
              <select
                value={v.companyId || ''}
                onChange={e => set({ companyId: e.target.value, companyName: companies.find(c => c._id === e.target.value)?.name || '' })}
                className={inputCls}
              >
                <option value="">Select company...</option>
                {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              {companies.length === 0 && <p className="text-[11px] text-gray-400 mt-1">No companies yet — add one under Masters → Insurance Companies.</p>}
            </div>
            <div>
              <label className={labelCls}>Policy No. <span className="text-red-500">*</span></label>
              <input value={v.policyNo || ''} onChange={e => set({ policyNo: e.target.value })} className={inputCls} placeholder="Policy number" />
            </div>
            <div>
              <label className={labelCls}>Accident Date <span className="text-red-500">*</span></label>
              <DateField value={v.accidentDate || ''} onChange={e => set({ accidentDate: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>IDV Amount (₹) <span className="text-red-500">*</span></label>
              <input type="number" min="0" value={v.idv ?? ''} onChange={e => set({ idv: e.target.value })} className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Claim No. <span className="text-red-500">*</span></label>
              <input value={v.claimNo || ''} onChange={e => set({ claimNo: e.target.value })} className={inputCls} placeholder="Claim number" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
