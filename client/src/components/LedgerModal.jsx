import { useState } from 'react';
import { X } from 'lucide-react';
import { ledgerApi } from '../api/ledgerApi';
import { useToast } from './ui/Toast';
import LedgerForm from '../pages/Ledger/LedgerForm';

const EMPTY = { partyId: '', partyPhone: '', partyName: '', amount: '', date: '', type: '', narration: '', remark: '' };

function validate(form) {
  const errors = {};
  if (!form.partyName?.trim()) errors.partyName = 'Party Name is required.';
  if (form.amount === '' || form.amount === null || form.amount === undefined) errors.amount = 'Amount is required.';
  else if (isNaN(Number(form.amount))) errors.amount = 'Amount must be a number.';
  if (!form.date) errors.date = 'Date is required.';
  if (!form.type) errors.type = 'Type is required.';
  return errors;
}

export default function LedgerModal({ item, presetParty, onClose, onSaved }) {
  const [form, setForm] = useState(
    item
      ? { ...EMPTY, ...item, date: item.date ? String(item.date).slice(0, 10) : '' }
      : { ...EMPTY, ...(presetParty || {}) }
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  // Merge several fields at once (used when a party is picked).
  const patch = (partial) => {
    setForm(f => ({ ...f, ...partial }));
    setErrors(e => ({ ...e, partyName: undefined }));
  };

  const handleSave = async (addNew = false) => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (item) await ledgerApi.update(item._id, payload);
      else       await ledgerApi.create(payload);
      toast({ title: item ? 'Updated' : 'Ledger saved', variant: 'success' });
      if (addNew) { setForm({ ...EMPTY }); setErrors({}); }
      else onSaved();
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Save failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-gray-100 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-7 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-red-500 rounded-full flex-shrink-0" />
            <h2 className="text-2xl font-semibold text-gray-800">{item ? 'Edit Ledger' : 'Add Ledger'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1">
            <X size={22} />
          </button>
        </div>

        <div className="px-8 pb-6 space-y-4">
          <LedgerForm form={form} errors={errors} set={set} patch={patch} />

          {/* Buttons */}
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
