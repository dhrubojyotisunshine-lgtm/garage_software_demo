import { ShieldCheck } from 'lucide-react';
import { SectionCard, Field, inputCls, readonlyCls } from './parts';
import { computeDerived } from '../../pages/VehicleSale/saleUtils';
import { formatCurrency } from '../../utils/format';

const POLICY_OPTIONS = [
  ['thirdParty', 'Third Party'],
  ['comprehensive', 'Comprehensive'],
  ['zeroDepreciation', 'Zero Depreciation'],
  ['ownDamage', 'Own Damage']
];

export default function Step5Insurance({ form, setNested, setForm }) {
  const ins = form.insurance;
  const total = computeDerived(form).insurance.totalInsurance;

  const togglePolicy = (key) =>
    setForm(f => ({ ...f, insurance: { ...f.insurance, policyTypes: { ...f.insurance.policyTypes, [key]: !f.insurance.policyTypes[key] } } }));

  return (
    <SectionCard title="Insurance Details" icon={ShieldCheck}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Field label="Insurance Company">
          <input className={inputCls} value={ins.company} onChange={e => setNested('insurance', 'company', e.target.value)} />
        </Field>
        <div className="lg:col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Policy Type</label>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1.5">
            {POLICY_OPTIONS.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="accent-primary w-4 h-4" checked={!!ins.policyTypes[key]} onChange={() => togglePolicy(key)} />
                {label}
              </label>
            ))}
          </div>
        </div>
        <Field label="Basic Premium (₹)">
          <input type="number" className={inputCls} value={ins.basicPremium} onChange={e => setNested('insurance', 'basicPremium', e.target.value)} />
        </Field>
        <Field label="GST on Premium (₹)">
          <input type="number" className={inputCls} value={ins.gstOnPremium} onChange={e => setNested('insurance', 'gstOnPremium', e.target.value)} />
        </Field>
        <Field label="Total Insurance Amount (₹)">
          <input readOnly className={readonlyCls} value={formatCurrency(total)} />
        </Field>
      </div>
    </SectionCard>
  );
}
