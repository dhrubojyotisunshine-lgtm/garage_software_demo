import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { inventoryApi } from '../api/inventory';
import { useToast } from './ui/Toast';

const UNIT_OPTS   = { Spare: ['units','pcs','set','pair','nos'], Lube: ['ltr','ml','kg','gm'], Job: ['units','hrs'] };
const SUBCAT_OPTS = { Spare: ['Frequent Items','Regular','Rare'], Lube: ['Frequent Items','Regular'], Job: ['out_source','regular','internal'] };

/**
 * Props:
 *   initialType  – 'Spare' | 'Lube' | 'Job'  (default 'Spare')
 *   onClose      – fn()
 *   onAdded      – fn(createdItem)  createdItem has _type field
 */
export default function QuickAddItemModal({ initialType = 'Spare', onClose, onAdded }) {
  const [type, setType] = useState(initialType);
  const [form, setForm] = useState({
    name: '', partNumber: '', company: '', unit: 'units',
    subCategory: 'Frequent Items', allVehicles: true,
    currentStock: 1, lowerLimit: 0, rackNumber: '',
    purchasePrice: 0, sellingPrice: 0,
    jobCode: '', sellingPriceJob: 0
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const iCls  = 'w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white';
  const lCls  = 'block text-sm font-medium text-gray-700 mb-1';
  const secCls = 'text-sm font-semibold text-gray-800 underline decoration-red-500 underline-offset-2 mb-3';

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name?.trim()) return toast({ title: 'Name is required', variant: 'error' });
    setSaving(true);
    try {
      let created;
      if (type === 'Spare') {
        const { data } = await inventoryApi.createSpare({ ...form });
        created = { ...data, _type: 'Spare' };
      } else if (type === 'Lube') {
        const { data } = await inventoryApi.createLube({ ...form });
        created = { ...data, _type: 'Lube' };
      } else {
        const { data } = await inventoryApi.createJob({
          name: form.name, jobCode: form.jobCode, unit: form.unit,
          subCategory: form.subCategory, sellingPrice: form.sellingPriceJob,
          allVehicles: true
        });
        created = { ...data, _type: 'Job' };
      }
      toast({ title: `${type} created`, variant: 'success' });
      onAdded(created);
    } catch (e) {
      toast({ title: e?.response?.data?.message || 'Failed to create', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-gray-100 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-red-500 rounded-full" />
            <span className="font-semibold text-gray-800">Add</span>
            <select value={type} onChange={e => setType(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none bg-white">
              <option value="Job">Job</option>
              <option value="Spare">Spare</option>
              <option value="Lube">Lube</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Total Amount</div>
              <div className="font-bold text-gray-800">
                Rs. {type === 'Job'
                  ? (form.sellingPriceJob || 0).toFixed(0)
                  : ((form.currentStock || 1) * (form.sellingPrice || 0)).toFixed(0)
                }
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Part / Job Details */}
          <div>
            <p className={secCls}>{type === 'Job' ? 'Job Details' : 'Part Details'}</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={lCls}>{type === 'Job' ? 'Job Code' : 'Part Number'}</label>
                <div className="relative">
                  <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={type === 'Job' ? form.jobCode : form.partNumber}
                    onChange={e => set(type === 'Job' ? 'jobCode' : 'partNumber', e.target.value)}
                    className={`${iCls} pl-7`}
                    placeholder={type === 'Job' ? 'Enter a Job Code' : 'Enter a Part Number'}
                  />
                </div>
              </div>
              <div>
                <label className={lCls}>{type === 'Job' ? 'Job Name' : 'Part Name'} <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => set('name', e.target.value)} className={iCls} />
                {!form.name?.trim() && <p className="text-red-500 text-xs mt-0.5">Part Name is required.</p>}
              </div>
            </div>

            {type !== 'Job' && (
              <div className="mb-3">
                <label className={lCls}>Part Make</label>
                <div className="relative">
                  <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.company} onChange={e => set('company', e.target.value)}
                    className={`${iCls} pl-7`} placeholder="Search Company" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lCls}>Unit</label>
                <select value={form.unit} onChange={e => set('unit', e.target.value)} className={iCls}>
                  {(UNIT_OPTS[type] || ['units']).map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className={lCls}>Sub Category</label>
                <select value={form.subCategory} onChange={e => set('subCategory', e.target.value)} className={iCls}>
                  {(SUBCAT_OPTS[type] || []).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Compatible For */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={secCls.replace(' mb-3','')}>Compatible For</span>
              <input type="checkbox" checked={!!form.allVehicles}
                onChange={e => set('allVehicles', e.target.checked)}
                className="w-3.5 h-3.5 accent-red-500 ml-2" />
              <label className="text-sm text-gray-600">For All Vehicles</label>
            </div>
            {!form.allVehicles && (
              <div className="border border-gray-200 rounded-lg overflow-hidden mt-2">
                <div className="bg-gray-700 text-white text-xs text-center py-1.5">Make, Model &amp; Variants</div>
                <div className="p-2">
                  <div className="relative">
                    <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none"
                      placeholder="Search vehicle..." />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stock Details — not for Job */}
          {type !== 'Job' && (
            <div>
              <p className={secCls}>Stock Details</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={lCls}>Quantity</label>
                  <input type="number" min="0" value={form.currentStock}
                    onChange={e => set('currentStock', Number(e.target.value))} className={iCls} />
                </div>
                <div>
                  <label className={lCls}>Lower Limit</label>
                  <input type="number" min="0" value={form.lowerLimit}
                    onChange={e => set('lowerLimit', Number(e.target.value))} className={iCls} />
                </div>
                <div>
                  <label className={lCls}>Rack Number</label>
                  <input value={form.rackNumber} onChange={e => set('rackNumber', e.target.value)} className={iCls} />
                </div>
              </div>
            </div>
          )}

          {/* Pricing */}
          <div>
            <p className={secCls}>Pricing Details</p>
            {type !== 'Job' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lCls}>Purchase Price</label>
                  <input type="number" min="0" value={form.purchasePrice}
                    onChange={e => set('purchasePrice', Number(e.target.value))} className={iCls} />
                </div>
                <div>
                  <label className={lCls}>Selling Price <span className="text-red-500">*</span></label>
                  <input type="number" min="0" value={form.sellingPrice}
                    onChange={e => set('sellingPrice', Number(e.target.value))} className={iCls} />
                </div>
              </div>
            ) : (
              <div>
                <label className={lCls}>Selling Price <span className="text-red-500">*</span></label>
                <input type="number" min="0" value={form.sellingPriceJob}
                  onChange={e => set('sellingPriceJob', Number(e.target.value))} className={iCls} />
              </div>
            )}
          </div>

          <button onClick={handleCreate} disabled={saving}
            className="w-full py-2.5 bg-gradient-to-r from-red-400 to-red-500 text-white rounded font-medium text-sm hover:from-red-500 hover:to-red-600 disabled:opacity-60 transition-all">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
