import { FileText } from 'lucide-react';
import { SectionCard, Field, inputCls, readonlyCls } from './parts';
import { computeDerived } from '../../pages/VehicleSale/saleUtils';
import { formatCurrency } from '../../utils/format';

export default function Step6RTO({ form, setNested }) {
  const r = form.rto;
  const total = computeDerived(form).rto.totalRto;
  return (
    <SectionCard title="RTO Charges Details" icon={FileText}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Field label="Registration Charges (₹)">
          <input type="number" className={inputCls} value={r.registrationCharges} onChange={e => setNested('rto', 'registrationCharges', e.target.value)} />
        </Field>
        <Field label="Registration Fee (₹)">
          <input type="number" className={inputCls} value={r.registrationFee} onChange={e => setNested('rto', 'registrationFee', e.target.value)} />
        </Field>
        <Field label="Total RTO Amount (₹)">
          <input readOnly className={readonlyCls} value={formatCurrency(total)} />
        </Field>
      </div>
    </SectionCard>
  );
}
