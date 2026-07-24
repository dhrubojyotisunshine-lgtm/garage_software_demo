import { MessageSquare } from 'lucide-react';
import { SectionCard, Field, inputCls } from './parts';

export default function Step8Narration({ form, setTop }) {
  return (
    <SectionCard title="Narration / Remarks" icon={MessageSquare}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Narration">
          <textarea rows={4} className={`${inputCls} resize-none`} value={form.narration} onChange={e => setTop('narration', e.target.value)} />
        </Field>
        <Field label="Remark">
          <textarea rows={4} className={`${inputCls} resize-none`} value={form.remark} onChange={e => setTop('remark', e.target.value)} />
        </Field>
      </div>
    </SectionCard>
  );
}
