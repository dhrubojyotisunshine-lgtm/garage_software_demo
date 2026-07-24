import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, UserPlus, Car, RefreshCw, ChevronRight,
  Phone, Clock, Pencil
} from 'lucide-react';
import { customersApi } from '../../api/customers';
import { mastersApi } from '../../api/masters';
import { useToast } from '../../components/ui/Toast';
import Pagination from '../../components/ui/Pagination';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { getInitials } from '../../utils/format';
import { customerFlag } from '../../utils/customerFlag';
import VehicleModelPicker from '../../components/ui/VehicleModelPicker';
import CustomerEditModal from '../../components/CustomerEditModal';

function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }

export default function CustomersPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customers, setCustomers]   = useState([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(1);
  const [limit, setLimit]           = useState(30);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [loading, setLoading]       = useState(false);

  // New customer modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', customerType: '', vehicleNo: '', makeId: '', makeName: '', modelId: '', modelName: '', engineNo: '', chassisNo: '', color: '' });
  const [vehicleMakes, setVehicleMakes] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, page, limit };
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await customersApi.list(params);
      setCustomers(data.customers);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch {
      toast({ title: 'Failed to load customers', variant: 'error' });
    } finally { setLoading(false); }
  }, [search, page, statusFilter, limit]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, statusFilter, limit]);

  useEffect(() => {
    Promise.all([mastersApi.list('vehicle-makes'), mastersApi.list('vehicle-models')])
      .then(([makes, models]) => { setVehicleMakes(makes.data); setVehicleModels(models.data); })
      .catch(() => {});
  }, []);

  const handleSearch = () => { setSearch(searchInput); setPage(1); };

  const handleSaveCustomer = async () => {
    if (!newCustomer.name || !newCustomer.mobile) {
      toast({ title: 'Name and mobile are required', variant: 'error' }); return;
    }
    if (!/^[6-9]\d{9}$/.test(newCustomer.mobile)) {
      toast({ title: 'Enter a valid 10-digit mobile number starting with 6-9', variant: 'error' }); return;
    }
    setSaving(true);
    try {
      await customersApi.create({
        name: newCustomer.name,
        mobile: newCustomer.mobile,
        customerType: newCustomer.customerType,
        vehicles: newCustomer.vehicleNo ? [{
          vehicleNo: newCustomer.vehicleNo,
          make: newCustomer.makeId,
          model: newCustomer.modelId,
          makeName: newCustomer.makeName,
          modelName: newCustomer.modelName,
          engineNo: newCustomer.engineNo,
          chassisNo: newCustomer.chassisNo,
          color: newCustomer.color
        }] : []
      });
      toast({ title: 'Customer added', variant: 'success' });
      setShowNewModal(false);
      setNewCustomer({ name: '', mobile: '', customerType: '', vehicleNo: '', makeId: '', makeName: '', modelId: '', modelName: '', engineNo: '', chassisNo: '', color: '' });
      load();
    } catch (e) {
      toast({ title: 'Failed to add customer', description: e.response?.data?.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  const set = (k, v) => setNewCustomer(prev => ({ ...prev, [k]: v }));
  const inputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-gray-800 text-2xl">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} total customers</p>
        </div>
        <Button onClick={() => setShowNewModal(true)}>
          <UserPlus size={15} /> Add Customer
        </Button>
      </div>

      {/* Filters */}
      <div className="card mb-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search by name, mobile or vehicle..."
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none bg-white">
            <option value="all">All Status</option>
            <option value="Lead">Lead</option>
            <option value="Active">Active</option>
            <option value="VIP">VIP</option>
            <option value="Inactive">Inactive</option>
          </select>

          <Button onClick={handleSearch}>Search</Button>
          <button onClick={load} disabled={loading} className="p-2.5 border border-border rounded-lg hover:bg-gray-50 text-gray-500 disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sr No</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer Details</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Model</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reg No.</th>
                <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Visit</th>
                <th className="text-center py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wide">View</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <UserPlus size={22} className="text-gray-300" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium">No customers found</p>
                  </td>
                </tr>
              ) : customers.map((c, idx) => {
                const st = c._stats || {};
                const firstVehicle = c.vehicles?.[0];
                return (
                  <tr
                    key={c._id}
                    className="border-b border-border hover:bg-gray-50 cursor-pointer transition-colors last:border-0"
                    onClick={() => navigate(`/customers/${c._id}`)}
                  >
                    <td className="py-3.5 px-5 text-gray-500">{(page - 1) * limit + idx + 1}</td>
                    {/* Customer Details: Name + Mobile */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {getInitials(c.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                            {(() => { const f = customerFlag(c); return f && <span className={`w-2 h-2 rounded-full ${f.dot}`} title={f.label + (f.lastNote ? ' — ' + f.lastNote : '')} />; })()}
                            {c.name}
                            {(() => { const f = customerFlag(c); return f && <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${f.badge}`}>{f.label}</span>; })()}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Phone size={10} />{c.mobile}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Model */}
                    <td className="py-3.5 px-5 text-gray-600 text-sm">
                      {firstVehicle ? (
                        <span className="flex items-center gap-1.5">
                          <Car size={12} className="text-gray-400" />
                          {[firstVehicle.makeName, firstVehicle.modelName].filter(Boolean).join(' ') || '—'}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Reg No */}
                    <td className="py-3.5 px-5">
                      {firstVehicle?.vehicleNo ? (
                        <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {firstVehicle.vehicleNo}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>

                    {/* Last Visit */}
                    <td className="py-3.5 px-5">
                      {st.lastVisit ? (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={11} className="text-gray-400" />{fmtDate(st.lastVisit)}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>

                    <td className="py-3.5 px-5 text-center">
                      <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setEditCustomer(c)} title="Edit customer"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600">
                          <Pencil size={14} />
                        </button>
                        <ChevronRight size={16} className="text-gray-400 cursor-pointer" onClick={() => navigate(`/customers/${c._id}`)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="px-5 pb-4 border-t border-border">
            <Pagination page={page} pages={totalPages} total={total} limit={limit} onPage={setPage} onLimit={setLimit} />
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={showNewModal} onClose={() => setShowNewModal(false)} title="Add New Customer" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Name <span className="text-red-500">*</span></label>
              <input value={newCustomer.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Customer name" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Mobile <span className="text-red-500">*</span></label>
              <input value={newCustomer.mobile} onChange={e => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" className={inputCls} placeholder="10-digit mobile" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Customer Type</label>
              <input value={newCustomer.customerType} onChange={e => set('customerType', e.target.value)} className={inputCls} placeholder="e.g. VIP, Fleet, Walk-in, Corporate" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Vehicle Number</label>
              <input value={newCustomer.vehicleNo} onChange={e => set('vehicleNo', e.target.value.toUpperCase())} className={inputCls} placeholder="e.g. MH50AB1234" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Brand &amp; Model</label>
              <VehicleModelPicker
                makes={vehicleMakes}
                models={vehicleModels}
                makeId={newCustomer.makeId}
                makeName={newCustomer.makeName}
                modelId={newCustomer.modelId}
                modelName={newCustomer.modelName}
                onChange={v => { set('makeId', v.makeId); set('makeName', v.makeName); set('modelId', v.modelId); set('modelName', v.modelName); }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Vehicle Colour</label>
              <input value={newCustomer.color} onChange={e => set('color', e.target.value)} className={inputCls} placeholder="e.g. White, Black, Red" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Engine No.</label>
              <input value={newCustomer.engineNo} onChange={e => set('engineNo', e.target.value.toUpperCase())} className={inputCls} placeholder="Engine number" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Chassis No.</label>
              <input value={newCustomer.chassisNo} onChange={e => set('chassisNo', e.target.value.toUpperCase())} className={inputCls} placeholder="Chassis number" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowNewModal(false)}>Cancel</Button>
            <Button onClick={handleSaveCustomer} disabled={saving}>{saving ? 'Saving...' : 'Save Customer'}</Button>
          </div>
        </div>
      </Modal>

      {editCustomer && (
        <CustomerEditModal
          customer={editCustomer}
          onClose={() => setEditCustomer(null)}
          onSaved={() => { setEditCustomer(null); load(); }}
        />
      )}
    </div>
  );
}
