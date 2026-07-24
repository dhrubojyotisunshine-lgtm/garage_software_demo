import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { mastersApi } from '../../api/masters';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';

const MASTER_TABS = [
  { key: 'jobcard-types', label: 'Jobcard Types', fields: [{ name: 'name', label: 'Type Name', required: true }] },
  {
    key: 'jobcard-statuses', label: 'Statuses', fields: [
      { name: 'name', label: 'Status Name', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['Open', 'Completed', 'Closed'], required: true },
      { name: 'allowAddTransaction', label: 'Add Transaction', type: 'checkbox', checkboxLabel: 'Show the Add Transaction section for jobcards in this status' },
      { name: 'allowDiscount', label: 'Discount', type: 'checkbox', checkboxLabel: 'Show the bill Discount control for jobcards in this status' }
    ]
  },
  { key: 'vehicle-makes', label: 'Vehicle Makes', fields: [{ name: 'name', label: 'Make Name', required: true }] },
  {
    key: 'vehicle-models', label: 'Vehicle Models', fields: [
      { name: 'name', label: 'Model Name', required: true },
      { name: 'makeId', label: 'Make', type: 'make-select', required: true },
      { name: 'variant', label: 'Variant' }
    ]
  },
  { key: 'customer-voice', label: 'Customer Voice', fields: [{ name: 'name', label: 'Option Name', required: true }] }
];


const inputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';

function MasterTable({ entity, tab, makes }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await mastersApi.list(entity);
      setItems(data);
    } catch { toast({ title: 'Failed to load', variant: 'error' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [entity]);

  const openAdd = () => { setEditItem(null); setForm({}); setModalOpen(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ ...item }); setModalOpen(true); };

  const handleSave = async () => {
    try {
      if (editItem) {
        await mastersApi.update(entity, editItem._id, form);
        toast({ title: 'Updated', variant: 'success' });
      } else {
        await mastersApi.create(entity, form);
        toast({ title: 'Created', variant: 'success' });
      }
      setModalOpen(false);
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Save failed', variant: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    try {
      await mastersApi.delete(entity, id);
      toast({ title: 'Deleted', variant: 'success' });
      load();
    } catch {
      toast({ title: 'Delete failed', variant: 'error' });
    }
  };

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()));
  const getMakeName = (makeId) => makes.find(m => m._id === makeId)?.name || '-';

  const totalRows  = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));
  const paged      = filtered.slice((page - 1) * limit, page * limit);
  useEffect(() => { setPage(1); }, [search, entity, limit]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-8 pr-3 py-2 border border-border rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <Button onClick={openAdd} size="sm">
          <Plus size={14} /> Add {tab.label.replace(/s$/, '')}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-border">
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sr No</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              {entity === 'vehicle-models' && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Make</th>}
              {entity === 'vehicle-models' && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Variant</th>}
              {entity === 'jobcard-statuses' && <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</th>}
              <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-8 text-gray-400">No items found</td></tr>
            ) : paged.map((item, idx) => (
              <tr key={item._id} className="border-b border-border hover:bg-gray-50 last:border-0">
                <td className="py-3 px-4 text-gray-500">{(page - 1) * limit + idx + 1}</td>
                <td className="py-3 px-4 font-medium text-gray-800">{item.name}</td>
                {entity === 'vehicle-models' && <td className="py-3 px-4 text-gray-500">{getMakeName(item.makeId)}</td>}
                {entity === 'vehicle-models' && <td className="py-3 px-4 text-gray-500">{item.variant || '—'}</td>}
                {entity === 'jobcard-statuses' && (
                  <td className="py-3 px-4">
                    <Badge variant={item.category === 'Open' ? 'open' : item.category === 'Completed' ? 'completed' : 'closed'}>{item.category}</Badge>
                  </td>
                )}
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(item._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={totalPages} total={totalRows} limit={limit} onPage={setPage} onLimit={setLimit} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? `Edit ${tab.label.replace(/s$/, '')}` : `Add ${tab.label.replace(/s$/, '')}`}>
        <div className="space-y-4">
          {tab.fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {field.type === 'select' ? (
                <select value={form[field.name] || ''} onChange={e => setForm(f => ({ ...f, [field.name]: e.target.value }))} className={inputCls}>
                  <option value="">Select...</option>
                  {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : field.type === 'make-select' ? (
                <select value={form[field.name] || ''}
                  onChange={e => setForm(f => ({ ...f, [field.name]: e.target.value, makeName: makes.find(m => m._id === e.target.value)?.name }))}
                  className={inputCls}>
                  <option value="">Select make...</option>
                  {makes.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form[field.name]}
                    onChange={e => setForm(f => ({ ...f, [field.name]: e.target.checked }))} className="w-4 h-4 accent-primary" />
                  <span className="text-sm text-gray-600">{field.checkboxLabel || 'Mark as frequent item'}</span>
                </label>
              ) : (
                <input type={field.type || 'text'} value={form[field.name] || ''}
                  onChange={e => setForm(f => ({ ...f, [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                  className={inputCls} placeholder={field.label} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </Modal>
    </div>
  );
}

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState(MASTER_TABS[0].key);
  const [makes, setMakes] = useState([]);

  useEffect(() => {
    mastersApi.list('vehicle-makes').then(r => setMakes(r.data)).catch(() => {});
  }, []);

  const tab = MASTER_TABS.find(t => t.key === activeTab);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading font-bold text-gray-800 text-2xl">Masters</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage dropdown data sources used across the system</p>
      </div>

      <div className="card">
        <div className="flex gap-1 flex-wrap border-b border-border -mx-5 px-5 mb-5 pb-0">
          {MASTER_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                activeTab === t.key
                  ? 'text-primary border-primary bg-primary/5'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <MasterTable key={activeTab} entity={activeTab} tab={tab} makes={makes} />
      </div>
    </div>
  );
}
