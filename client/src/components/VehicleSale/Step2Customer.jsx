import { UserCircle } from 'lucide-react';
import { SectionCard, Field, inputCls } from './parts';

export default function Step2Customer({ form, setNested, errors }) {
  const c = form.customer;
  return (
    <SectionCard title="Customer Details" icon={UserCircle}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Customer Name" required error={errors['customer.name']}>
          <input className={inputCls} value={c.name} onChange={e => setNested('customer', 'name', e.target.value)} />
        </Field>
        <Field label="Mobile Number" required error={errors['customer.mobile']}>
          <input className={inputCls} value={c.mobile} onChange={e => setNested('customer', 'mobile', e.target.value)} />
        </Field>
        <Field label="Address">
          <textarea rows={2} className={`${inputCls} resize-none`} value={c.address} onChange={e => setNested('customer', 'address', e.target.value)} />
        </Field>
        <Field label="Email">
          <input type="email" className={inputCls} value={c.email} onChange={e => setNested('customer', 'email', e.target.value)} />
        </Field>
        <Field label="PAN Number">
          <input className={inputCls} value={c.pan} onChange={e => setNested('customer', 'pan', e.target.value)} />
        </Field>
        <Field label="Aadhar Number">
          <input className={inputCls} value={c.aadhar} onChange={e => setNested('customer', 'aadhar', e.target.value)} />
        </Field>
      </div>
    </SectionCard>
  );
}
