import { Store } from 'lucide-react';
import { SectionCard, Field, inputCls } from './parts';

export default function Step1DealerSale({ form }) {
  const d = form.dealer;
  const roCls = `${inputCls} bg-gray-50 text-gray-600`;
  return (
    <>
      <SectionCard title="Dealer / Showroom Details" icon={Store}>
        <p className="text-xs text-gray-400 -mt-2 mb-3">Auto-filled from your garage profile.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Dealer / Showroom Name">
            <input className={roCls} value={d.name} readOnly />
          </Field>
          <Field label="Address">
            <textarea rows={2} className={`${roCls} resize-none`} value={d.address} readOnly />
          </Field>
          <Field label="Phone">
            <input className={roCls} value={d.phone} readOnly />
          </Field>
          <Field label="Email">
            <input className={roCls} value={d.email} readOnly />
          </Field>
          <Field label="GSTIN">
            <input className={roCls} value={d.gstin} readOnly />
          </Field>
        </div>
      </SectionCard>
    </>
  );
}
