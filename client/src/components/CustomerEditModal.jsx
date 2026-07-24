import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { customersApi } from '../api/customers';
import { mastersApi } from '../api/masters';
import { useToast } from './ui/Toast';
import { DateField } from './ui/DateField';
import VehicleModelPicker from './ui/VehicleModelPicker';

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white';
const labelCls = 'text-xs font-medium text-gray-500 mb-1 block';
const STATUS_OPTIONS = ['Lead', 'Active', 'VIP', 'Inactive'];

// Full edit of a customer's fields + their primary (first) vehicle.
// Any additional vehicles are preserved untouched on save.
export default function CustomerEditModal({ customer, onClose, onSaved }) {
  const { toast } = useToast();
  const [makes, setMakes]   = useState([]);
  const [models, setModels] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');

  const v0 = customer.vehicles?.[0] || {};
  const [form, setForm] = useState({
    name: customer.name || '',
    mobile: customer.mobile || '',
    customerType: customer.customerType || '',
    email: customer.email || '',
    gstNo: customer.gstNo || '',
    address: customer.address || '',
    status: customer.status || 'Active',
    tags: [...(customer.tags || [])],
    followUpDate: customer.followUpDate ? customer.followUpDate.slice(0, 10) : '',
    followUpNote: customer.followUpNote || '',
    // primary vehicle
    vehicleNo: v0.vehicleNo || '',
    makeId: v0.make || '', makeName: v0.makeName || '',
    modelId: v0.model || '', modelName: v0.modelName || '',
    engineNo: v0.engineNo || '', chassisNo: v0.chassisNo || '', color: v0.color || '',
  });

  useEffect(() => {
    Promise.all([mastersApi.list('vehicle-makes'), mastersApi.list('vehicle-models')])
      .then(([mk, md]) => { setMakes(mk.data || []); setModels(md.data || []); })
      .catch(() => {});
  }, []);

  const set = (k, val) => setForm(f => ({ ...f, [k]: val }));
  const addTag = () => { const t = newTag.trim(); if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]); setNewTag(''); };
  const removeTag = (t) => set('tags', form.tags.filter(x => x !== t));

  const handleSave = async () => {
    if (!form.name.trim()) return toast({ title: 'Name is required', variant: 'error' });
    if (!/^[6-9]\d{9}$/.test(String(form.mobile).trim())) return toast({ title: 'Enter a valid 10-digit mobile number', variant: 'error' });
    setSaving(true);
    try {
      const editedVehicle = {
        vehicleNo: form.vehicleNo,
        make: form.makeId || undefined, model: form.modelId || undefined,
        makeName: form.makeName, modelName: form.modelName,
        engineNo: form.engineNo, chassisNo: form.chassisNo, color: form.color,
      };
      const hasVehData = form.vehicleNo?.trim() || form.modelId || form.engineNo?.trim() || form.chassisNo?.trim() || form.color?.trim();

      // Preserve any other vehicles; only the primary (index 0) is edited here.
      const vehicles = [...(customer.vehicles || [])];
      if (vehicles.length > 0) vehicles[0] = editedVehicle;
      else if (hasVehData)     vehicles.push(editedVehicle);

      const payload = {
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        customerType: form.customerType,
        email: form.email,
        gstNo: form.gstNo,
        address: form.address,
        status: form.status,
        tags: form.tags,
        followUpDate: form.followUpDate || null,
        followUpNote: form.followUpNote,
        vehicles,
      };
      await customersApi.update(customer._id, payload);
      toast({ title: 'Customer updated', variant: 'success' });
      onSaved?.();
    } catch (e) {
      toast({ title: 'Update failed', description: e.response?.data?.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-800">Edit Customer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Core fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Customer name" /></div>
            <div><label className={labelCls}>Mobile <span className="text-red-500">*</span></label>
              <input value={form.mobile} onChange={e => set('mobile', e.target.value)} className={inputCls} placeholder="10-digit mobile" /></div>
            <div><label className={labelCls}>Customer Type</label>
              <input value={form.customerType} onChange={e => set('customerType', e.target.value)} className={inputCls} placeholder="e.g. VIP, Fleet, Walk-in" /></div>
            <div><label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputCls}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><label className={labelCls}>Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="Email" /></div>
            <div><label className={labelCls}>GST No.</label>
              <input value={form.gstNo} onChange={e => set('gstNo', e.target.value.toUpperCase())} className={inputCls} placeholder="GSTIN" /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Address</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} placeholder="Address" /></div>
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>Tags</label>
            <div className="flex flex-wrap items-center gap-2">
              {form.tags.map(t => (
                <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                  {t}<button onClick={() => removeTag(t)} className="hover:text-red-500"><X size={11} /></button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tag…" className="text-xs border border-gray-200 rounded-full px-2 py-1 w-24 focus:outline-none focus:border-primary" />
                <button onClick={addTag} className="text-primary"><Plus size={14} /></button>
              </div>
            </div>
          </div>

          {/* Follow-up */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Follow-up Date</label>
              <DateField value={form.followUpDate} onChange={e => set('followUpDate', e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Follow-up Note</label>
              <input value={form.followUpNote} onChange={e => set('followUpNote', e.target.value)} className={inputCls} placeholder="Follow-up note" /></div>
          </div>

          {/* Primary vehicle */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-sm font-semibold text-gray-700 mb-2">Vehicle</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Registration No.</label>
                <input value={form.vehicleNo} onChange={e => set('vehicleNo', e.target.value.toUpperCase())} className={inputCls} placeholder="e.g. MH50AB1234" /></div>
              <div><label className={labelCls}>Brand &amp; Model</label>
                <VehicleModelPicker makes={makes} models={models}
                  makeId={form.makeId} makeName={form.makeName} modelId={form.modelId} modelName={form.modelName}
                  onChange={val => setForm(f => ({ ...f, makeId: val.makeId, makeName: val.makeName, modelId: val.modelId, modelName: val.modelName }))} /></div>
              <div><label className={labelCls}>Vehicle Colour</label>
                <input value={form.color} onChange={e => set('color', e.target.value)} className={inputCls} placeholder="e.g. White, Black, Red" /></div>
              <div><label className={labelCls}>Engine No.</label>
                <input value={form.engineNo} onChange={e => set('engineNo', e.target.value.toUpperCase())} className={inputCls} placeholder="Engine number" /></div>
              <div><label className={labelCls}>Chassis No.</label>
                <input value={form.chassisNo} onChange={e => set('chassisNo', e.target.value.toUpperCase())} className={inputCls} placeholder="Chassis number" /></div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-600 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
