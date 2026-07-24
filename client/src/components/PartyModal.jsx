import { useState } from 'react';
import { X } from 'lucide-react';
import { partyApi } from '../api/partyApi';
import { useToast } from './ui/Toast';

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const errorCls = 'text-red-500 text-xs mt-0.5';

const EMPTY = { partyName: '', phone: '' };

export default function PartyModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState(item ? { partyName: item.partyName || '', phone: item.phone || '' } : { ...EMPTY });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.partyName.trim()) e.partyName = 'Party Name is required.';
    if (!form.phone.trim()) e.phone = 'Phone Number is required.';
    return e;
  };

  const handleSave = async (addNew = false) => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const { data } = item ? await partyApi.update(item._id, form) : await partyApi.create(form);
      toast({ title: item ? 'Party updated' : 'Party added', variant: 'success' });
      if (addNew && !item) { setForm({ ...EMPTY }); setErrors({}); }
      else onSaved?.(data);
    } catch (e) {
      const fieldErrs = e.response?.data?.errors;
      if (fieldErrs) setErrors(fieldErrs);
      toast({ title: 'Error', description: e.response?.data?.message || 'Save failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-gray-100 rounded-lg shadow-2xl w-full max-w-md">
        <div className="flex items-start justify-between px-8 pt-7 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-red-500 rounded-full flex-shrink-0" />
            <h2 className="text-2xl font-semibold text-gray-800">{item ? 'Edit Party' : 'Add Party'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1">
            <X size={22} />
          </button>
        </div>

        <div className="px-8 pb-6 space-y-4">
          <div>
            <label className={labelCls}>Party Name <span className="text-red-500">*</span></label>
            <input value={form.partyName} onChange={e => set('partyName', e.target.value)} className={inputCls} />
            {errors.partyName && <p className={errorCls}>{errors.partyName}</p>}
          </div>
          <div>
            <label className={labelCls}>Phone Number <span className="text-red-500">*</span></label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="Unique per party" />
            {errors.phone && <p className={errorCls}>{errors.phone}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            {!item && (
              <button onClick={() => handleSave(true)} disabled={saving}
                className="py-3 bg-red-400 hover:bg-red-500 text-white rounded font-medium text-sm disabled:opacity-60 transition-colors">
                Save &amp; New
              </button>
            )}
            <button onClick={() => handleSave(false)} disabled={saving}
              className={`py-3 bg-red-400 hover:bg-red-500 text-white rounded font-medium text-sm disabled:opacity-60 transition-colors ${item ? 'col-span-2' : ''}`}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
