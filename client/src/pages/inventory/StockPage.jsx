import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Pencil, Trash2, X, ChevronDown, Download, Upload } from 'lucide-react';
import { inventoryApi } from '../../api/inventory';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import useAuthStore from '../../store/authStore';

const UNIT_OPTIONS_SPARE = ['units', 'pcs', 'set', 'pair', 'nos'];
const UNIT_OPTIONS_LUBE  = ['ltr', 'ml', 'kg', 'gm'];
const UNIT_OPTIONS_JOB   = ['units', 'hrs'];
const SUBCATEGORY_SPARE  = ['Frequent Items', 'Regular', 'Rare'];
const SUBCATEGORY_JOB    = ['out_source', 'regular', 'internal'];

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary bg-white';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const sectionTitle = 'text-sm font-semibold text-gray-800 border-b border-red-400 pb-1 mb-3';

/* ── Stat Block ─────────────────────────────────────────────── */
function StatBlock({ label, count, value, color, active, onClick }) {
  const colors = {
    red:    { bg: 'bg-red-500',    ring: 'ring-red-500'    },
    orange: { bg: 'bg-orange-400', ring: 'ring-orange-400' },
    green:  { bg: 'bg-green-500',  ring: 'ring-green-500'  },
    dark:   { bg: 'bg-gray-700',   ring: 'ring-gray-700'   },
  };
  const c = colors[color] || colors.red;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all ${
        active ? `${c.ring} ring-2 bg-white shadow-sm` : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className={`w-9 h-9 rounded-md ${c.bg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
        {count}
      </div>
      <div className="text-left">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-xs font-medium text-gray-700">₹ {value.toLocaleString('en-IN')}</div>
      </div>
    </button>
  );
}

/* ── Compatible For field ───────────────────────────────────── */
function CompatibleForField({ form, setForm, makes, models, onMakeChange }) {
  const list = form.compatibleVehicles || [];

  const addVehicle = () => {
    const makeObj = makes.find(m => m._id === form._selectedMake);
    if (!makeObj) return;
    const modelObj = models.find(m => m._id === form._selectedModel);
    const entry = {
      make: makeObj.name,
      model: modelObj ? `${modelObj.name}${modelObj.variant ? ' ' + modelObj.variant : ''}` : '',
    };
    if (list.some(v => v.make === entry.make && (v.model || '') === entry.model)) return;
    setForm(f => ({ ...f, compatibleVehicles: [...(f.compatibleVehicles || []), entry], _selectedModel: '' }));
  };

  const removeVehicle = (idx) =>
    setForm(f => ({ ...f, compatibleVehicles: (f.compatibleVehicles || []).filter((_, i) => i !== idx) }));

  return (
    <div>
      <div className={sectionTitle}>Compatible For (Which Vehicles)</div>
      <div className="flex items-center gap-2 mb-3">
        <input type="checkbox" id="allVeh" checked={!!form.allVehicles}
          onChange={e => setForm(f => ({ ...f, allVehicles: e.target.checked }))}
          className="w-4 h-4 accent-red-500" />
        <label htmlFor="allVeh" className="text-sm text-gray-700">For All Vehicles</label>
      </div>
      {!form.allVehicles && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-700 text-white text-xs text-center py-2 font-medium">Make, Model &amp; Variants</div>
          <div className="p-2 flex flex-wrap gap-2">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={form._selectedMake || ''}
                onChange={e => { setForm(f => ({ ...f, _selectedMake: e.target.value, _selectedModel: '' })); onMakeChange(e.target.value); }}
                className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none"
              >
                <option value="">Select Make</option>
                {makes.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <select
              value={form._selectedModel || ''}
              onChange={e => setForm(f => ({ ...f, _selectedModel: e.target.value }))}
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none"
            >
              <option value="">Select Model (optional)</option>
              {models.map(m => <option key={m._id} value={m._id}>{m.name} {m.variant || ''}</option>)}
            </select>
            <button type="button" onClick={addVehicle} disabled={!form._selectedMake}
              className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 disabled:opacity-50">
              Add
            </button>
          </div>
          {list.length > 0 && (
            <div className="p-2 flex flex-wrap gap-1.5 border-t border-gray-100">
              {list.map((v, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                  {[v.make, v.model].filter(Boolean).join(' ')}
                  <button type="button" onClick={() => removeVehicle(i)} className="text-gray-400 hover:text-red-500">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Add Spare Modal ────────────────────────────────────────── */
function SpareModal({ item, onClose, onSaved, makes }) {
  const [form, setForm] = useState(item ? { ...item } : { allVehicles: false, unit: 'units', subCategory: 'Frequent Items', currentStock: 1, lowerLimit: 0, purchasePrice: 0, sellingPrice: 0 });
  const [models, setModels] = useState([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const total = (form.currentStock || 0) * (form.sellingPrice || 0);

  const onMakeChange = async (makeId) => {
    if (!makeId) return setModels([]);
    const { data } = await inventoryApi.listVehicleModels(makeId);
    setModels(data);
  };

  const handleSave = async () => {
    if (!form.partNumber?.trim()) return toast({ title: 'Part Number is required', variant: 'error' });
    setSaving(true);
    try {
      if (item) await inventoryApi.updateSpare(item._id, form);
      else       await inventoryApi.createSpare(form);
      toast({ title: item ? 'Updated' : 'Spare created', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Save failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title={item ? 'Edit Spare' : 'Add Spare'} total={total} onClose={onClose}>
      <div className={sectionTitle}>Part Details</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls}>Part Number <span className="text-red-500">*</span></label>
          <input value={form.partNumber || ''} onChange={e => setForm(f => ({ ...f, partNumber: e.target.value }))} className={inputCls} placeholder="Part Number" />
          {!form.partNumber?.trim() && <p className="text-red-500 text-xs mt-0.5">Part Number is required.</p>}
        </div>
        <div>
          <label className={labelCls}>Part Name</label>
          <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Part Name" />
        </div>
      </div>
      <div className="mb-3">
        <label className={labelCls}>Spare Company</label>
        <input value={form.company || ''} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className={inputCls} placeholder="Search Spare Company" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls}>Unit</label>
          <select value={form.unit || 'units'} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={inputCls}>
            {UNIT_OPTIONS_SPARE.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Sub Category</label>
          <select value={form.subCategory || 'Frequent Items'} onChange={e => setForm(f => ({ ...f, subCategory: e.target.value }))} className={inputCls}>
            {SUBCATEGORY_SPARE.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <CompatibleForField form={form} setForm={setForm} makes={makes} models={models} onMakeChange={onMakeChange} />
      </div>

      <div className={sectionTitle}>Stock Details</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className={labelCls}>Quantity</label>
          <input type="number" min="0" value={form.currentStock ?? 1} onChange={e => setForm(f => ({ ...f, currentStock: Number(e.target.value) }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Lower Limit</label>
          <input type="number" min="0" value={form.lowerLimit ?? 0} onChange={e => setForm(f => ({ ...f, lowerLimit: Number(e.target.value) }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Rack Number</label>
          <input value={form.rackNumber || ''} onChange={e => setForm(f => ({ ...f, rackNumber: e.target.value }))} className={inputCls} placeholder="Rack No." />
        </div>
      </div>

      <div className={sectionTitle}>Pricing Details</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div>
          <label className={labelCls}>Purchase Price</label>
          <input type="number" min="0" value={form.purchasePrice ?? 0} onChange={e => setForm(f => ({ ...f, purchasePrice: Number(e.target.value) }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Selling Price <span className="text-red-500">*</span></label>
          <input type="number" min="0" value={form.sellingPrice ?? 0} onChange={e => setForm(f => ({ ...f, sellingPrice: Number(e.target.value) }))} className={inputCls} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-2.5 bg-gradient-to-r from-red-400 to-red-500 text-white rounded font-medium text-sm hover:from-red-500 hover:to-red-600 disabled:opacity-60 transition-all">
        {saving ? 'Saving...' : item ? 'Update Spare' : 'Create Spare'}
      </button>
    </ModalShell>
  );
}

/* ── Add Lube Modal ─────────────────────────────────────────── */
function LubeModal({ item, onClose, onSaved, makes }) {
  const [form, setForm] = useState(item ? { ...item } : { allVehicles: false, unit: 'ltr', currentStock: 1, lowerLimit: 0, purchasePrice: 0, sellingPrice: 0 });
  const [models, setModels] = useState([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const total = (form.currentStock || 0) * (form.sellingPrice || 0);

  const onMakeChange = async (makeId) => {
    if (!makeId) return setModels([]);
    const { data } = await inventoryApi.listVehicleModels(makeId);
    setModels(data);
  };

  const handleSave = async () => {
    if (!form.partNumber?.trim()) return toast({ title: 'Lube Number is required', variant: 'error' });
    setSaving(true);
    try {
      if (item) await inventoryApi.updateLube(item._id, form);
      else       await inventoryApi.createLube(form);
      toast({ title: item ? 'Updated' : 'Lube created', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Save failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title={item ? 'Edit Lubes' : 'Add Lubes'} total={total} onClose={onClose}>
      <div className={sectionTitle}>Part Details</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls}>Lube Number <span className="text-red-500">*</span></label>
          <input value={form.partNumber || ''} onChange={e => setForm(f => ({ ...f, partNumber: e.target.value }))} className={inputCls} placeholder="Lube Number" />
          {!form.partNumber?.trim() && <p className="text-red-500 text-xs mt-0.5">Lube Number is required.</p>}
        </div>
        <div>
          <label className={labelCls}>Lube Name</label>
          <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Lube Name" />
        </div>
      </div>
      <div className="mb-3">
        <label className={labelCls}>Lube Company</label>
        <input value={form.company || ''} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className={inputCls} placeholder="Search Lube Company" />
      </div>
      <div className="mb-4">
        <label className={labelCls}>Unit</label>
        <select value={form.unit || 'ltr'} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={inputCls}>
          {UNIT_OPTIONS_LUBE.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <CompatibleForField form={form} setForm={setForm} makes={makes} models={models} onMakeChange={onMakeChange} />
      </div>

      <div className={sectionTitle}>Stock Details</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className={labelCls}>Quantity</label>
          <input type="number" min="0" value={form.currentStock ?? 1} onChange={e => setForm(f => ({ ...f, currentStock: Number(e.target.value) }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Lower Limit</label>
          <input type="number" min="0" value={form.lowerLimit ?? 0} onChange={e => setForm(f => ({ ...f, lowerLimit: Number(e.target.value) }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Rack Number</label>
          <input value={form.rackNumber || ''} onChange={e => setForm(f => ({ ...f, rackNumber: e.target.value }))} className={inputCls} placeholder="Rack No." />
        </div>
      </div>

      <div className={sectionTitle}>Pricing Details</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div>
          <label className={labelCls}>Purchase Price</label>
          <input type="number" min="0" value={form.purchasePrice ?? 0} onChange={e => setForm(f => ({ ...f, purchasePrice: Number(e.target.value) }))} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Selling Price <span className="text-red-500">*</span></label>
          <input type="number" min="0" value={form.sellingPrice ?? 0} onChange={e => setForm(f => ({ ...f, sellingPrice: Number(e.target.value) }))} className={inputCls} />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-2.5 bg-gradient-to-r from-red-400 to-red-500 text-white rounded font-medium text-sm hover:from-red-500 hover:to-red-600 disabled:opacity-60 transition-all">
        {saving ? 'Saving...' : item ? 'Update Lube' : 'Create Lube'}
      </button>
    </ModalShell>
  );
}

/* ── Add Job Modal ──────────────────────────────────────────── */
function JobModal({ item, onClose, onSaved, makes }) {
  const [form, setForm] = useState(item ? { ...item } : { allVehicles: false, unit: 'units', subCategory: 'out_source', sellingPrice: 0 });
  const [models, setModels] = useState([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const total = form.sellingPrice || 0;

  const onMakeChange = async (makeId) => {
    if (!makeId) return setModels([]);
    const { data } = await inventoryApi.listVehicleModels(makeId);
    setModels(data);
  };

  const handleSave = async () => {
    if (!form.jobCode?.trim()) return toast({ title: 'Job Code is required', variant: 'error' });
    setSaving(true);
    try {
      if (item) await inventoryApi.updateJob(item._id, form);
      else       await inventoryApi.createJob(form);
      toast({ title: item ? 'Updated' : 'Job created', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Save failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <ModalShell title={item ? 'Edit Job' : 'Add Jobs'} total={total} onClose={onClose}>
      <div className={sectionTitle}>Job Details</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls}>Job Code <span className="text-red-500">*</span></label>
          <input value={form.jobCode || ''} onChange={e => setForm(f => ({ ...f, jobCode: e.target.value }))} className={inputCls} placeholder="Job Code" />
          {!form.jobCode?.trim() && <p className="text-red-500 text-xs mt-0.5">Job Code is required.</p>}
        </div>
        <div>
          <label className={labelCls}>Job Name</label>
          <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Job Name" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls}>Unit</label>
          <select value={form.unit || 'units'} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={inputCls}>
            {UNIT_OPTIONS_JOB.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Sub Category</label>
          <select value={form.subCategory || 'out_source'} onChange={e => setForm(f => ({ ...f, subCategory: e.target.value }))} className={inputCls}>
            {SUBCATEGORY_JOB.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <CompatibleForField form={form} setForm={setForm} makes={makes} models={models} onMakeChange={onMakeChange} />
      </div>

      <div className={sectionTitle}>Pricing Details</div>
      <div className="mb-5">
        <label className={labelCls}>Job Price <span className="text-gray-400 font-normal">(optional — labour amount can be entered on each jobcard)</span></label>
        <input type="number" min="0" value={form.sellingPrice ?? 0}
          onChange={e => setForm(f => ({ ...f, sellingPrice: Number(e.target.value) }))}
          className={inputCls} placeholder="0 — set per jobcard" />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-2.5 bg-gradient-to-r from-red-400 to-red-500 text-white rounded font-medium text-sm hover:from-red-500 hover:to-red-600 disabled:opacity-60 transition-all">
        {saving ? 'Saving...' : item ? 'Update Job' : 'Create Job'}
      </button>
    </ModalShell>
  );
}

/* ── Add Group Modal ────────────────────────────────────────── */
function GroupModal({ item, onClose, onSaved, makes }) {
  const [form, setForm] = useState(item ? { ...item } : { allVehicles: false, items: [], totalPrice: 0 });
  const [activeType, setActiveType] = useState('Spare');
  const [models, setModels] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const onMakeChange = async (makeId) => {
    if (!makeId) return setModels([]);
    const { data } = await inventoryApi.listVehicleModels(makeId);
    setModels(data);
  };

  const handleSearch = async (q) => {
    setSearchQ(q);
    if (!q.trim()) return setSearchResults([]);
    try {
      const entity = activeType === 'Spare' ? 'spares' : activeType === 'Lube' ? 'lubes' : 'labour';
      const apiCall = activeType === 'Spare' ? inventoryApi.listSpares : activeType === 'Lube' ? inventoryApi.listLubes : inventoryApi.listJobs;
      const { data } = await apiCall();
      setSearchResults(data.filter(d => d.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6));
    } catch { setSearchResults([]); }
  };

  const addItem = (item) => {
    const exists = form.items.find(i => i.itemId === item._id && i.itemType === activeType);
    if (exists) return toast({ title: 'Item already added', variant: 'error' });
    const price = item.sellingPrice || item.unitPrice || 0;
    const newItem = { itemId: item._id, itemType: activeType, name: item.name, qty: 1, unitPrice: price };
    const newItems = [...form.items, newItem];
    const total = newItems.reduce((acc, i) => acc + (i.qty * i.unitPrice), 0);
    setForm(f => ({ ...f, items: newItems, totalPrice: total }));
    setSearchQ('');
    setSearchResults([]);
  };

  const removeItem = (idx) => {
    const newItems = form.items.filter((_, i) => i !== idx);
    const total = newItems.reduce((acc, i) => acc + (i.qty * i.unitPrice), 0);
    setForm(f => ({ ...f, items: newItems, totalPrice: total }));
  };

  const updateQty = (idx, qty) => {
    const newItems = form.items.map((it, i) => i === idx ? { ...it, qty } : it);
    const total = newItems.reduce((acc, i) => acc + (i.qty * i.unitPrice), 0);
    setForm(f => ({ ...f, items: newItems, totalPrice: total }));
  };

  const handleSave = async () => {
    if (!form.name?.trim()) return toast({ title: 'Group Name is required', variant: 'error' });
    setSaving(true);
    try {
      if (item) await inventoryApi.updateGroup(item._id, form);
      else       await inventoryApi.createGroup(form);
      toast({ title: item ? 'Updated' : 'Group created', variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Save failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  const countByType = (type) => form.items.filter(i => i.itemType === type).length;
  const typeColors = { Job: 'bg-green-600', Spare: 'bg-blue-500', Lube: 'bg-orange-500' };

  return (
    <ModalShell title={item ? 'Edit Group' : 'Add Group'} total={form.totalPrice} onClose={onClose} wide>
      <div className={sectionTitle}>Group Details</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls}>Group Name <span className="text-red-500">*</span></label>
          <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Group Name" />
        </div>
        <div>
          <label className={labelCls}>Group Number <span className="text-red-500">*</span></label>
          <input value={form.groupNumber || ''} onChange={e => setForm(f => ({ ...f, groupNumber: e.target.value }))} className={inputCls} placeholder="Group Number" />
        </div>
      </div>

      <div className="mb-4">
        <CompatibleForField form={form} setForm={setForm} makes={makes} models={models} onMakeChange={onMakeChange} />
      </div>

      {/* Type toggle */}
      <div className="flex gap-2 mb-3">
        {['Job', 'Spare', 'Lube'].map(t => (
          <button key={t} onClick={() => setActiveType(t)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
              activeType === t ? `${typeColors[t]} text-white border-transparent` : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            <span>{t}({countByType(t)})</span>
            <span className="text-[10px] opacity-80">Total: ₹{form.items.filter(i => i.itemType === t).reduce((a, i) => a + i.qty * i.unitPrice, 0)}</span>
          </button>
        ))}
      </div>

      {/* Items table */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto mb-4">
        <div className="grid grid-cols-[1fr_80px_100px_120px_40px] min-w-[420px] bg-blue-600 text-white text-xs font-medium">
          <div className="px-3 py-2">Particulars</div>
          <div className="px-2 py-2 text-center">Quantity</div>
          <div className="px-2 py-2 text-center">Unit Price</div>
          <div className="px-2 py-2 text-center">Total Amount</div>
          <div className="px-2 py-2"></div>
        </div>
        {form.items.filter(i => i.itemType === activeType).map((it, globalIdx) => {
          const idx = form.items.indexOf(it);
          return (
            <div key={idx} className="grid grid-cols-[1fr_80px_100px_120px_40px] min-w-[420px] border-t border-gray-100 hover:bg-gray-50">
              <div className="px-3 py-2 text-sm text-gray-700">{it.name}</div>
              <div className="px-2 py-1 text-center">
                <input type="number" min="1" value={it.qty}
                  onChange={e => updateQty(idx, Number(e.target.value))}
                  className="w-full text-center border border-gray-200 rounded px-1 py-0.5 text-xs" />
              </div>
              <div className="px-2 py-2 text-center text-sm">₹{it.unitPrice}</div>
              <div className="px-2 py-2 text-center text-sm font-medium">₹{(it.qty * it.unitPrice).toFixed(2)}</div>
              <div className="px-2 py-2 flex items-center justify-center">
                <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><X size={13} /></button>
              </div>
            </div>
          );
        })}
        {/* Search row */}
        <div className="border-t border-gray-100 p-2 relative">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={searchQ} onChange={e => handleSearch(e.target.value)}
              placeholder={`To Select ${activeType} Search Here`}
              className="w-full pl-7 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-300" />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute left-2 right-2 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-auto">
              {searchResults.map(r => (
                <button key={r._id} onClick={() => addItem(r)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b border-gray-50 last:border-0">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-gray-400 ml-2">₹{r.sellingPrice || r.unitPrice || 0}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-2.5 bg-gradient-to-r from-red-400 to-red-500 text-white rounded font-medium text-sm hover:from-red-500 hover:to-red-600 disabled:opacity-60 transition-all">
        {saving ? 'Saving...' : item ? 'Update Group' : 'Create'}
      </button>
    </ModalShell>
  );
}

/* ── Modal Shell ────────────────────────────────────────────── */
function ModalShell({ title, total, onClose, wide, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh] ${wide ? 'w-full max-w-3xl' : 'w-full max-w-xl'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-red-500 rounded-full" />
            <h2 className="font-semibold text-gray-800 text-base">{title}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Total Amount</div>
              <div className="font-bold text-gray-800">Rs. {Number(total || 0).toFixed(0)}</div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ── Main StockPage ─────────────────────────────────────────── */
export default function StockPage() {
  const { isStaff, staffUser } = useAuthStore();
  const stockPerm = (key) => !isStaff || !!staffUser?.roleId?.stockPermissions?.[key];
  const [stats, setStats] = useState({ spares: { count: 0, value: 0 }, lubes: { count: 0, value: 0 }, jobs: { count: 0, value: 0 }, groups: { count: 0, value: 0 } });
  const [activeTab, setActiveTab] = useState('spares');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [qtyFilter, setQtyFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [makes, setMakes] = useState([]);
  const [modal, setModal] = useState(null); // null | { type: 'spare'|'lube'|'job'|'group', item? }
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const SAMPLE_CSVS = {
    spares: {
      filename: 'sample_spares.csv',
      content: 'name,partNumber,company,unit,subCategory,purchasePrice,sellingPrice,addStock,lowerLimit,rackNumber\nOil Filter,OIL-001,Bosch,units,Frequent Items,150,250,10,2,A1\nAir Filter,AIR-002,Mann,units,Regular,80,150,5,1,A2'
    },
    lubes: {
      filename: 'sample_lubes.csv',
      content: 'name,partNumber,company,unit,purchasePrice,sellingPrice,addStock,lowerLimit,rackNumber\nEngine Oil 5W30,LUB-001,Castrol,ltr,350,500,20,5,B1\nGear Oil 80W90,LUB-002,Shell,ltr,200,320,10,3,B2'
    },
    jobs: {
      filename: 'sample_jobs.csv',
      content: 'name,jobCode,unit,subCategory,sellingPrice\nOil Change,JC001,units,out_source,500\nBrake Pad Replace,JC002,units,regular,800'
    }
  };

  const downloadSample = () => {
    const cfg = SAMPLE_CSVS[activeTab];
    if (!cfg) return;
    const blob = new Blob([cfg.content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = cfg.filename; a.click();
    URL.revokeObjectURL(url);
  };

  // Export the currently-shown rows of the active tab to CSV.
  const EXPORT_COLS = {
    spares: ['name', 'partNumber', 'company', 'unit', 'subCategory', 'purchasePrice', 'sellingPrice', 'currentStock', 'lowerLimit', 'rackNumber'],
    lubes:  ['name', 'partNumber', 'company', 'unit', 'purchasePrice', 'sellingPrice', 'currentStock', 'lowerLimit', 'rackNumber'],
    jobs:   ['name', 'jobCode', 'unit', 'subCategory', 'sellingPrice'],
  };
  const csvCell = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Header aliases: the CSV column is named `addStock`, but the value still comes
  // from the item's `currentStock` field (matches the sample + import header).
  const HEADER_ALIAS = { currentStock: 'addStock' };
  const exportCSV = () => {
    const cols = EXPORT_COLS[activeTab];
    if (!cols) return;
    if (!filtered.length) return toast({ title: 'Nothing to export', variant: 'error' });
    const lines = [cols.map(c => HEADER_ALIAS[c] || c).join(',')];
    filtered.forEach(it => lines.push(cols.map(c => csvCell(it[c])).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      const importers = { spares: inventoryApi.importSpares, lubes: inventoryApi.importLubes, jobs: inventoryApi.importJobs };
      const { data } = await importers[activeTab](file);
      const title = data.updated != null
        ? `Imported: ${data.inserted} new, ${data.updated} stock-updated (of ${data.total})`
        : `Imported ${data.inserted} of ${data.total} rows`;
      toast({ title, variant: 'success' });
      loadItems(); loadStats();
    } catch (e) {
      toast({ title: 'Import failed', description: e.response?.data?.message || e.message, variant: 'error' });
    } finally { setImporting(false); }
  };

  const loadStats = useCallback(async () => {
    try { const { data } = await inventoryApi.stats(); setStats(data); } catch {}
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const loaders = { spares: inventoryApi.listSpares, lubes: inventoryApi.listLubes, jobs: inventoryApi.listJobs, groups: inventoryApi.listGroups };
      const { data } = await loaders[activeTab]();
      setItems(data);
    } catch { toast({ title: 'Failed to load items', variant: 'error' }); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => {
    inventoryApi.listVehicleMakes().then(r => setMakes(r.data)).catch(() => {});
    loadStats();
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      const deleters = { spares: inventoryApi.deleteSpare, lubes: inventoryApi.deleteLube, jobs: inventoryApi.deleteJob, groups: inventoryApi.deleteGroup };
      await deleters[activeTab](id);
      toast({ title: 'Deleted', variant: 'success' });
      loadItems(); loadStats();
    } catch { toast({ title: 'Delete failed', variant: 'error' }); }
  };

  const onSaved = () => { setModal(null); loadItems(); loadStats(); };

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !q || item.name?.toLowerCase().includes(q) || item.partNumber?.toLowerCase().includes(q) || item.jobCode?.toLowerCase().includes(q);
    if (!matchSearch) return false;
    // Vehicle search: match "all vehicles" items, or those whose compatible list mentions the query
    const vq = vehicleSearch.trim().toLowerCase();
    if (vq) {
      const matchVehicle = item.allVehicles ||
        (item.compatibleVehicles || []).some(v => `${v.make || ''} ${v.model || ''} ${v.variant || ''}`.toLowerCase().includes(vq));
      if (!matchVehicle) return false;
    }
    if (qtyFilter === 'low' && activeTab !== 'jobs' && activeTab !== 'groups') {
      return (item.currentStock || 0) <= (item.lowerLimit || 0);
    }
    if (qtyFilter === 'zero') return (item.currentStock || 0) === 0;
    return true;
  });

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
  const paged = filtered.slice((page - 1) * limit, page * limit);

  useEffect(() => { setPage(1); }, [search, vehicleSearch, qtyFilter, activeTab, limit]);

  const tabConfig = [
    { key: 'spares', label: 'Spare',  color: 'red',    stat: stats.spares,  modalType: 'spare'  },
    { key: 'lubes',  label: 'Lubes',  color: 'orange', stat: stats.lubes,   modalType: 'lube'   },
    { key: 'jobs',   label: 'Jobs',   color: 'green',  stat: stats.jobs,    modalType: 'job'    },
    { key: 'groups', label: 'Groups', color: 'dark',   stat: stats.groups,  modalType: 'group'  },
  ];

  const isStockType = activeTab === 'spares' || activeTab === 'lubes';

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-heading font-bold text-gray-800 text-2xl">Inventory</h1>
      </div>

      {/* Stats + Create buttons */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div className="flex gap-3 flex-wrap">
          {tabConfig.map(tc => (
            <StatBlock key={tc.key} label={tc.label} count={tc.stat.count} value={tc.stat.value}
              color={tc.color} active={activeTab === tc.key} onClick={() => setActiveTab(tc.key)} />
          ))}
        </div>
        {stockPerm('canAdd') && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setModal({ type: 'spare' })}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1">
            Create Spare <span className="bg-gray-100 text-gray-500 px-1 rounded text-[10px]">S</span>
          </button>
          <button onClick={() => setModal({ type: 'lube' })}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1">
            Create Lube <span className="bg-gray-100 text-gray-500 px-1 rounded text-[10px]">L</span>
          </button>
          <button onClick={() => setModal({ type: 'job' })}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1">
            Create Job <span className="bg-gray-100 text-gray-500 px-1 rounded text-[10px]">J</span>
          </button>
          <button onClick={() => setModal({ type: 'group' })}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
            Create Group
          </button>
        </div>
        )}
      </div>

      {/* Search + Filter + Import */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search Inventory by Part Name, Part Number"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        {activeTab !== 'groups' && (
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)}
              placeholder="Search by Vehicle (make / model)"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
        )}
        {isStockType && (
          <div className="relative">
            <select value={qtyFilter} onChange={e => setQtyFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
              <option value="all">Apply Quantity Filter</option>
              <option value="low">Low Stock</option>
              <option value="zero">Zero Stock</option>
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
        {activeTab !== 'groups' && (
          <>
            <button
              onClick={downloadSample}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 bg-white"
              title="Download sample CSV format"
            >
              <Download size={13} /> Sample CSV
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 border border-green-300 rounded-lg text-xs font-medium text-green-700 hover:bg-green-50 bg-white"
              title="Download current list as CSV"
            >
              <Download size={13} /> Export CSV
            </button>
            {stockPerm('canUploadCsv') && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-1.5 px-3 py-2 border border-primary/40 rounded-lg text-xs font-medium text-primary hover:bg-primary/5 bg-white disabled:opacity-50"
                  title="Import from CSV"
                >
                  <Upload size={13} /> {importing ? 'Importing...' : 'Import CSV'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportFile}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sr No</th>
              {activeTab !== 'groups' ? (
                <>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {activeTab === 'jobs' ? 'Job Name' : 'Part Name'}
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {activeTab === 'jobs' ? 'Job Code' : 'Part Number'}
                  </th>
                  {activeTab !== 'jobs' && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>}
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sub Category</th>
                  {isStockType && <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>}
                  {isStockType && <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">To Order</th>}
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Units</th>
                  {isStockType && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rack No</th>}
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Selling Price</th>
                </>
              ) : (
                <>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Group Name</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Group Number</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Price</th>
                </>
              )}
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-10 text-gray-400">No items found</td></tr>
            ) : paged.map((item, idx) => (
              <tr key={item._id} className="border-b border-gray-100 hover:bg-gray-50 last:border-0">
                <td className="py-3 px-4 text-gray-500">{(page - 1) * limit + idx + 1}</td>
                {activeTab !== 'groups' ? (
                  <>
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {item.name}
                      {!item.allVehicles && (item.compatibleVehicles || []).length > 0 && (
                        <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                          Fits: {(item.compatibleVehicles || []).map(v => [v.make, v.model].filter(Boolean).join(' ')).filter(Boolean).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{item.partNumber || item.jobCode || '-'}</td>
                    {activeTab !== 'jobs' && <td className="py-3 px-4 text-gray-500 text-xs">{item.company || '-'}</td>}
                    <td className="py-3 px-4 text-gray-500 text-xs">{item.subCategory || '-'}</td>
                    {isStockType && (
                      <td className="py-3 px-4 text-right text-gray-700">
                        <span className={`font-medium ${(item.currentStock || 0) <= (item.lowerLimit || 0) && (item.currentStock || 0) > 0 ? 'text-orange-500' : (item.currentStock || 0) === 0 ? 'text-red-500' : ''}`}>
                          {item.currentStock ?? '-'}
                        </span>
                      </td>
                    )}
                    {isStockType && (() => {
                      const toOrder = Math.max(0, (item.lowerLimit || 0) - (item.currentStock || 0));
                      return (
                        <td className="py-3 px-4 text-right">
                          {toOrder > 0
                            ? <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">{toOrder}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                      );
                    })()}
                    <td className="py-3 px-4 text-gray-500 text-xs">{item.unit || '-'}</td>
                    {isStockType && <td className="py-3 px-4 text-gray-500 text-xs">{item.rackNumber || '-'}</td>}
                    <td className="py-3 px-4 text-right text-gray-700">₹{item.sellingPrice || item.unitPrice || 0}</td>
                  </>
                ) : (
                  <>
                    <td className="py-3 px-4 font-medium text-gray-800">{item.name}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{item.groupNumber || '-'}</td>
                    <td className="py-3 px-4 text-right text-gray-700">{item.items?.length || 0}</td>
                    <td className="py-3 px-4 text-right text-gray-700">₹{item.totalPrice || 0}</td>
                  </>
                )}
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    {stockPerm('canEdit') && (
                      <button
                        onClick={() => setModal({ type: activeTab === 'groups' ? 'group' : activeTab.slice(0, -1), item })}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                        <Pencil size={14} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(item._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={totalPages} total={totalFiltered} limit={limit} onPage={setPage} onLimit={setLimit} />

      {/* Modals */}
      {modal?.type === 'spare' && <SpareModal item={modal.item} onClose={() => setModal(null)} onSaved={onSaved} makes={makes} />}
      {modal?.type === 'lube'  && <LubeModal  item={modal.item} onClose={() => setModal(null)} onSaved={onSaved} makes={makes} />}
      {modal?.type === 'job'   && <JobModal   item={modal.item} onClose={() => setModal(null)} onSaved={onSaved} makes={makes} />}
      {modal?.type === 'group' && <GroupModal item={modal.item} onClose={() => setModal(null)} onSaved={onSaved} makes={makes} />}
    </div>
  );
}
