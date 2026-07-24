import { Receipt } from 'lucide-react';
import { SectionCard, Field, inputCls, readonlyCls } from './parts';
import { computeDerived } from '../../pages/VehicleSale/saleUtils';
import { formatCurrency } from '../../utils/format';

export default function Step4Billing({ form, setNested }) {
  const b = form.billing;
  const d = computeDerived(form).billing;
  return (
    <SectionCard title="Billing Breakdown" icon={Receipt}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Field label="Ex-Showroom Price (₹)">
          <input readOnly className={readonlyCls} value={formatCurrency(d.exShowroom)} />
        </Field>
        <Field label="GST (₹)">
          <input type="number" className={inputCls} value={b.gst} onChange={e => setNested('billing', 'gst', e.target.value)} />
        </Field>
        <Field label="TCS (₹)">
          <input type="number" className={inputCls} value={b.tcs} onChange={e => setNested('billing', 'tcs', e.target.value)} />
        </Field>
        <Field label="Accessories (Factory Fitted) (₹)">
          <input type="number" className={inputCls} value={b.accessories} onChange={e => setNested('billing', 'accessories', e.target.value)} />
        </Field>
        <Field label="Subtotal (A)">
          <input readOnly className={readonlyCls} value={formatCurrency(d.subtotal)} />
        </Field>
        <Field label="Net Vehicle Amount (A)">
          <input readOnly className={readonlyCls} value={formatCurrency(d.netVehicleAmount)} />
        </Field>
      </div>
    </SectionCard>
  );
}
