import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Pencil, Trash2, X } from 'lucide-react';
import { suppliersApi } from '../../api/suppliers';
import Pagination from '../../components/ui/Pagination';
import { listItems, listTotal, listPages } from '../../utils/list';
import { useToast } from '../../components/ui/Toast';

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
const sectionTitle = 'text-sm font-semibold text-gray-800 border-b-2 border-gray-700 pb-0.5 mb-3 inline-block';
const errorCls = 'text-red-500 text-xs mt-0.5';

const EMPTY = { firmName: '', address: '', gstin: '', firstName: '', contact1: '', contact2: '', email: '' };

function validate(form) {
  const errors = {};
  if (!form.contact1?.trim()) errors.contact1 = 'Contact 1 is required.';
  if (!form.firmName?.trim()) errors.firmName = 'Firm Name is required.';
  if (!form.address?.trim()) errors.address = 'Address is required.';
  if (!form.firstName?.trim()) errors.firstName = 'First Name is required.';
  return errors;
}

function SupplierModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  const handleSave = async (addNew = false) => {
    const errs = validate(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (item) await suppliersApi.update(item._id, form);
      else       await suppliersApi.create(form);
      toast({ title: item ? 'Updated' : 'Supplier saved', variant: 'success' });
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
            <h2 className="text-2xl font-semibold text-gray-800">{item ? 'Edit Supplier' : 'Add Supplier'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1">
            <X size={22} />
          </button>
        </div>

        <div className="px-8 pb-6 space-y-4">
          {/* Mobile No */}
          <div>
            <label className={labelCls}>Enter Mobile No <span className="text-red-500">*</span></label>
            <input value={form.contact1} onChange={e => set('contact1', e.target.value)} className={inputCls} placeholder="" />
            {errors.contact1 && <p className={errorCls}>{errors.contact1}</p>}
          </div>

          {/* Business Info */}
          <div>
            <p className={sectionTitle}>Bussiness Info</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Firm Name <span className="text-red-500">*</span></label>
                <input value={form.firmName} onChange={e => set('firmName', e.target.value)} className={inputCls} />
                {errors.firmName && <p className={errorCls}>{errors.firmName}</p>}
              </div>
              <div>
                <label className={labelCls}>Address <span className="text-red-500">*</span></label>
                <input value={form.address} onChange={e => set('address', e.target.value)} className={inputCls} />
                {errors.address && <p className={errorCls}>{errors.address}</p>}
              </div>
              <div>
                <label className={labelCls}>GSTIN</label>
                <input value={form.gstin} onChange={e => set('gstin', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

          {/* Owner Info */}
          <div>
            <p className={sectionTitle}>Owner Info</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
                <input value={form.firstName} onChange={e => set('firstName', e.target.value)} className={inputCls} />
                {errors.firstName && <p className={errorCls}>{errors.firstName}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Contact 1 <span className="text-red-500">*</span></label>
                  <input value={form.contact1} onChange={e => set('contact1', e.target.value)} className={inputCls} />
                  {errors.contact1 && <p className={errorCls}>{errors.contact1}</p>}
                </div>
                <div>
                  <label className={labelCls}>Contact 2</label>
                  <input value={form.contact2} onChange={e => set('contact2', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>

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

export default function SupplierPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState(null); // null | { item? }
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(20);
  const [total, setTotal]         = useState(0);
  const [pages, setPages]         = useState(1);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await suppliersApi.list({ search: search || undefined, page, limit });
      setSuppliers(listItems(data));
      setTotal(listTotal(data));
      setPages(listPages(data));
    } catch { toast({ title: 'Failed to load suppliers', variant: 'error' }); }
    finally { setLoading(false); }
  }, [search, page, limit]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, limit]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this supplier?')) return;
    try {
      await suppliersApi.delete(id);
      toast({ title: 'Deleted', variant: 'success' });
      load();
    } catch { toast({ title: 'Delete failed', variant: 'error' }); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-heading font-bold text-gray-800 text-2xl">Supplier</h1>
        <button onClick={() => setModal({})}
          className="px-4 py-2 border border-red-500 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
          Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-lg">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search Supplier By Firm Name and Mobile Number"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['Sr. No', 'Firm Name', 'Supplier Name', 'Contact Details', 'Email', 'Address', 'GSTIN', 'Action'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No suppliers found</td></tr>
            ) : suppliers.map((s, idx) => (
              <tr key={s._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/inventory/supplier/${s._id}`)}>
                <td className="py-3 px-4 text-gray-500">{(page - 1) * limit + idx + 1}</td>
                <td className="py-3 px-4 font-medium text-gray-800 hover:text-primary underline underline-offset-2">{s.firmName}</td>
                <td className="py-3 px-4 text-gray-700">{s.firstName}</td>
                <td className="py-3 px-4 text-gray-700">{s.contact1}{s.contact2 ? `, ${s.contact2}` : ''}</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{s.email || '-'}</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{s.address}</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{s.gstin || '-'}</td>
                <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModal({ item: s })} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(s._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} onLimit={setLimit} />

      {modal && (
        <SupplierModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
