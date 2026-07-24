import { useState, useEffect, useCallback } from 'react';
import { DateField } from '../../components/ui/DateField';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, X, Calendar, ChevronDown, Info, Plus, User, Car, AlertTriangle } from 'lucide-react';
import { counterSalesApi } from '../../api/counterSales';
import { customersApi } from '../../api/customers';
import { mastersApi } from '../../api/masters';
import { inventoryApi } from '../../api/inventory';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { getInitials } from '../../utils/format';

const today = () => new Date().toISOString().slice(0, 10);

/* ─── Quick Add Item Modal ──────────────────────────────────── */
const UNIT_OPTS  = { Spare: ['units','pcs','set','pair','nos'], Lube: ['ltr','ml','kg','gm'] };
const SUBCAT_OPTS = { Spare: ['Frequent Items','Regular','Rare'], Lube: ['Frequent Items','Regular'] };

function QuickAddItemModal({ onClose, onAdded }) {
  const [type, setType] = useState('Spare');
  const [form, setForm] = useState({ name:'', partNumber:'', company:'', unit:'units', subCategory:'Frequent Items', allVehicles:true, currentStock:1, lowerLimit:0, rackNumber:'', purchasePrice:0, sellingPrice:0 });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const iCls = 'w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white';
  const lCls = 'block text-sm font-medium text-gray-700 mb-1';
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
      } else {
        const { data } = await inventoryApi.createLube({ ...form });
        created = { ...data, _type: 'Lube' };
      }
      toast({ title: `${type} created`, variant: 'success' });
      onAdded(created);
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-gray-100 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-red-500 rounded-full" />
            <span className="font-semibold text-gray-800">Add</span>
            <select value={type} onChange={e => setType(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none bg-white">
              <option>Spare</option><option>Lube</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">Total Amount</div>
              <div className="font-bold text-gray-800">Rs. {((form.currentStock || 1) * (form.sellingPrice || 0)).toFixed(0)}</div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <p className={secCls}>Part Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className={lCls}>Part Number</label>
                <div className="relative">
                  <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.partNumber} onChange={e => set('partNumber', e.target.value)}
                    className={`${iCls} pl-7`} placeholder="Enter a Part Number" />
                </div>
              </div>
              <div>
                <label className={lCls}>Part Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => set('name', e.target.value)} className={iCls} />
                {!form.name?.trim() && <p className="text-red-500 text-xs mt-0.5">Part Name is required.</p>}
              </div>
            </div>
            <div className="mb-3">
              <label className={lCls}>Part Make</label>
              <div className="relative">
                <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={form.company} onChange={e => set('company', e.target.value)}
                  className={`${iCls} pl-7`} placeholder="Search Company" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div>
            <p className={secCls}>Stock Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className={lCls}>Quantity</label><input type="number" min="0" value={form.currentStock} onChange={e => set('currentStock', Number(e.target.value))} className={iCls} /></div>
              <div><label className={lCls}>Lower Limit</label><input type="number" min="0" value={form.lowerLimit} onChange={e => set('lowerLimit', Number(e.target.value))} className={iCls} /></div>
              <div><label className={lCls}>Rack Number</label><input value={form.rackNumber} onChange={e => set('rackNumber', e.target.value)} className={iCls} /></div>
            </div>
          </div>
          <div>
            <p className={secCls}>Pricing Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={lCls}>Purchase Price</label><input type="number" min="0" value={form.purchasePrice} onChange={e => set('purchasePrice', Number(e.target.value))} className={iCls} /></div>
              <div>
                <label className={lCls}>Selling Price <span className="text-red-500">*</span></label>
                <input type="number" min="0" value={form.sellingPrice} onChange={e => set('sellingPrice', Number(e.target.value))} className={iCls} />
              </div>
            </div>
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

const EMPTY = {
  customerName: '', customerMobile: '', customerEmail: '',
  customerAddress: '', vehicleNumber: '', customerId: '',
  items: [], note: '',
  paymentAmount: 0, paymentType: 'Cash', transactionNumber: '',
  transactionDate: today()
};

const inputCls = 'w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white';
const modalInputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';
const modalSelectCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';

export default function CounterSaleForm() {
  const { id }   = useParams();
  const isEdit   = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm]         = useState(EMPTY);
  const [tab, setTab]           = useState('billing');
  const [saving, setSaving]     = useState(false);
  const [counterNumber, setCN]  = useState('');
  const [saleDate, setSaleDate] = useState(today());
  const [showPartNum, setShowPN] = useState(false);

  /* ── Customer (jobcard-style) ── */
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVehicle, setSelectedVehicle]   = useState(null);
  const [customerSearch, setCustomerSearch]     = useState('');
  const [customerResults, setCustomerResults]   = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCust, setNewCust] = useState({ name:'', mobile:'', email:'', address:'', vehicleNo:'', makeId:'', makeName:'', modelId:'', modelName:'', engineNo:'', chassisNo:'' });
  const [newCustSaving, setNewCustSaving] = useState(false);
  const [vehicleMakes, setVehicleMakes]   = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);

  /* item search */
  const [itemSearch, setItemSearch]     = useState('');
  const [itemResults, setItemResults]   = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setNC = (k, v) => setNewCust(prev => ({ ...prev, [k]: v }));

  /* ── Load vehicle makes/models ── */
  useEffect(() => {
    Promise.all([mastersApi.list('vehicle-makes'), mastersApi.list('vehicle-models')])
      .then(([makes, models]) => { setVehicleMakes(makes.data); setVehicleModels(models.data); })
      .catch(() => {});
  }, []);

  /* ── Load existing sale ── */
  useEffect(() => {
    if (isEdit) {
      counterSalesApi.get(id).then(({ data }) => {
        setForm({
          customerName:    data.customerName || '',
          customerMobile:  data.customerMobile || '',
          customerEmail:   data.customerEmail || '',
          customerAddress: data.customerAddress || '',
          vehicleNumber:   data.vehicleNumber || '',
          customerId:      data.customerId || '',
          items:           data.items || [],
          note:            data.note || '',
          paymentAmount: 0, paymentType: 'Cash',
          transactionNumber: '', transactionDate: today()
        });
        setCN(data.counterNumber || '');
        setSaleDate(data.date ? data.date.slice(0, 10) : today());
        if (data.customerName) {
          setSelectedCustomer({ _id: data.customerId, name: data.customerName, mobile: data.customerMobile, vehicles: [] });
        }
        if (data.vehicleNumber) {
          setSelectedVehicle({ vehicleNo: data.vehicleNumber });
        }
      }).catch(() => {});
    }
  }, [id]);

  /* ── Customer search (debounced) ── */
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await customersApi.search(customerSearch);
        setCustomerResults(data);
        setShowCustomerDropdown(true);
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    const firstVehicle = c.vehicles?.[0] || null;
    setSelectedVehicle(firstVehicle);
    setForm(f => ({
      ...f,
      customerId:      c._id,
      customerName:    c.name,
      customerMobile:  c.mobile,
      customerEmail:   c.email || f.customerEmail,
      customerAddress: c.address || f.customerAddress,
      vehicleNumber:   firstVehicle?.vehicleNo || ''
    }));
    setCustomerSearch('');
    setCustomerResults([]);
    setShowCustomerDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setSelectedVehicle(null);
    setForm(f => ({ ...f, customerId: '', customerName: '', customerMobile: '', customerEmail: '', customerAddress: '', vehicleNumber: '' }));
  };

  /* ── Create new customer ── */
  const handleSaveNewCustomer = async () => {
    if (!newCust.name.trim() || !newCust.mobile.trim()) {
      toast({ title: 'Name and mobile are required', variant: 'error' }); return;
    }
    setNewCustSaving(true);
    try {
      const { data } = await customersApi.create({
        name: newCust.name,
        mobile: newCust.mobile,
        email: newCust.email,
        address: newCust.address,
        vehicles: newCust.vehicleNo ? [{
          vehicleNo: newCust.vehicleNo,
          make: newCust.makeId,
          model: newCust.modelId,
          makeName: newCust.makeName,
          modelName: newCust.modelName,
          engineNo: newCust.engineNo,
          chassisNo: newCust.chassisNo
        }] : []
      });
      selectCustomer(data);
      setShowNewCustomerModal(false);
      setNewCust({ name:'', mobile:'', email:'', address:'', vehicleNo:'', makeId:'', makeName:'', modelId:'', modelName:'', engineNo:'', chassisNo:'' });
      toast({ title: 'Customer added', variant: 'success' });
    } catch (e) {
      toast({ title: 'Failed to add customer', description: e.response?.data?.message, variant: 'error' });
    } finally { setNewCustSaving(false); }
  };

  /* ── Item search ── */
  const searchItems = useCallback(async (q) => {
    setItemSearch(q);
    if (!q.trim()) { setItemResults([]); return; }
    try {
      const [sp, lb] = await Promise.all([inventoryApi.listSpares(), inventoryApi.listLubes()]);
      const all = [
        ...sp.data.map(i => ({ ...i, _type: 'Spare' })),
        ...lb.data.map(i => ({ ...i, _type: 'Lube' }))
      ];
      setItemResults(all.filter(i => i.name?.toLowerCase().includes(q.toLowerCase())).slice(0, 8));
    } catch {}
  }, []);

  const addItem = (item) => {
    const price = item.sellingPrice || item.purchasePrice || 0;
    setForm(f => ({
      ...f,
      items: [...f.items, {
        itemId: item._id, itemType: item._type,
        name: item.name, partNumber: item.partNumber || '',
        qty: 1, unitPrice: price,
        discount: 0, discountType: 'amount',
        amount: price,
        currentStock: item.currentStock ?? 0
      }]
    }));
    setItemSearch(''); setItemResults([]);
  };

  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const updateItem = (idx, key, val) => {
    setForm(f => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        const updated = { ...it, [key]: val };
        const base = updated.qty * updated.unitPrice;
        const disc = updated.discountType === 'percent' ? base * (updated.discount / 100) : updated.discount;
        updated.amount = Math.max(0, base - disc);
        return updated;
      });
      return { ...f, items };
    });
  };

  /* ── Derived totals ── */
  const total   = form.items.reduce((s, it) => s + (it.amount || 0), 0);
  const paidAmt = isEdit ? 0 : Math.max(0, Number(form.paymentAmount) || 0);
  const balance = Math.max(0, total - paidAmt);

  /* ── Save ── */
  const handleSave = async (andPrint = false) => {
    if (!form.customerName.trim())   return toast({ title: 'Customer name required', variant: 'error' });
    if (!form.customerMobile.trim()) return toast({ title: 'Contact number required', variant: 'error' });
    if (form.items.length === 0)     return toast({ title: 'Add at least one item', variant: 'error' });

    setSaving(true);
    try {
      const transactions = [];
      if (!isEdit && paidAmt > 0) {
        transactions.push({ amount: paidAmt, paymentType: form.paymentType, transactionNumber: form.transactionNumber, date: form.transactionDate });
      }
      const payload = {
        customerName: form.customerName, customerMobile: form.customerMobile,
        customerEmail: form.customerEmail, customerAddress: form.customerAddress,
        vehicleNumber: form.vehicleNumber, customerId: form.customerId || undefined,
        items: form.items.map(({ currentStock, ...it }) => it),
        note: form.note, total,
        paidAmount: isEdit ? undefined : paidAmt,
        balanceDue: isEdit ? undefined : balance,
        transactions, date: saleDate
      };
      let saved;
      if (isEdit) {
        const { data } = await counterSalesApi.update(id, payload);
        saved = data;
        toast({ title: 'Updated', variant: 'success' });
      } else {
        const { data } = await counterSalesApi.create(payload);
        saved = data;
        toast({ title: 'Counter sale created', variant: 'success' });
      }
      if (andPrint) window.open(counterSalesApi.pdfUrl(saved._id), '_blank');
      navigate('/counter-sale');
    } catch (e) {
      toast({ title: 'Save failed', description: e.response?.data?.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  /* ── Add payment on edit ── */
  const handleAddPayment = async () => {
    if (!form.paymentAmount || Number(form.paymentAmount) <= 0)
      return toast({ title: 'Enter a valid amount', variant: 'error' });
    setSaving(true);
    try {
      const { data: current } = await counterSalesApi.get(id);
      const newTx = { amount: Number(form.paymentAmount), paymentType: form.paymentType, transactionNumber: form.transactionNumber, date: form.transactionDate };
      const transactions = [...(current.transactions || []), newTx];
      const paid = transactions.reduce((s, t) => s + (t.amount || 0), 0);
      const bal  = Math.max(0, (current.total || 0) - paid);
      await counterSalesApi.update(id, { transactions, paidAmount: paid, balanceDue: bal });
      toast({ title: 'Payment added', variant: 'success' });
      set('paymentAmount', 0); set('transactionNumber', '');
    } catch {
      toast({ title: 'Payment failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  const fmtDate = (d) => {
    const dt = new Date(d || Date.now());
    return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`;
  };

  const filteredModels = vehicleModels.filter(m => !newCust.makeId || m.makeId === newCust.makeId);

  return (
    <div className="min-h-screen bg-white">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-800">
          {isEdit ? 'Edit Counter Sale' : 'Create Counter Sale'}
        </h1>
        <div className="flex items-center gap-3">
          <input readOnly value={counterNumber || '—'}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-gray-50 w-36 text-center" />
          <div className="flex items-center gap-1.5 border border-gray-300 rounded px-3 py-1.5 text-sm bg-gray-50">
            <span>{fmtDate(saleDate)}</span>
            <Calendar size={14} className="text-gray-400" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* ── Customer section (jobcard-style) ── */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <User size={15} className="text-primary" /> Customer Details
          </h3>

          {!selectedCustomer ? (
            /* Search state */
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    onFocus={() => customerSearch.length >= 2 && setShowCustomerDropdown(true)}
                    placeholder="Search by vehicle no, mobile, name..."
                    className="pl-8 pr-3 py-2 border border-border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <button
                  onClick={() => setShowNewCustomerModal(true)}
                  className="btn-primary text-xs px-3 py-1.5 rounded-lg whitespace-nowrap"
                >
                  + New
                </button>
              </div>
              {showCustomerDropdown && customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                  {customerResults.map(c => (
                    <button
                      key={c._id}
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-border last:border-0"
                    >
                      <div className="font-medium text-sm text-gray-800">{c.name}</div>
                      <div className="text-xs text-gray-400">
                        {c.mobile} · {c.vehicles?.map(v => v.vehicleNo).filter(Boolean).join(', ') || 'No vehicle'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Selected state */
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {getInitials(selectedCustomer.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{selectedCustomer.name}</div>
                    <div className="text-xs text-gray-400">{selectedCustomer.mobile}</div>
                  </div>
                </div>
                <button
                  onClick={clearCustomer}
                  className="text-xs text-gray-400 hover:text-red-500 border border-border px-2 py-1 rounded-lg"
                >
                  Change
                </button>
              </div>

              {/* Vehicle selection buttons */}
              {selectedCustomer.vehicles?.length > 0 && (
                <div className="mt-3">
                  <label className="text-xs text-gray-500 font-medium mb-1.5 block">Select Vehicle</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.vehicles.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedVehicle(v); set('vehicleNumber', v.vehicleNo || ''); }}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                          selectedVehicle?.vehicleNo === v.vehicleNo
                            ? 'bg-primary text-white border-primary'
                            : 'border-border text-gray-600 hover:border-primary'
                        }`}
                      >
                        <Car size={11} className="inline mr-1" />
                        {v.vehicleNo || `Vehicle ${i + 1}`}
                        {v.makeName && ` · ${v.makeName}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected vehicle chip */}
              {selectedVehicle && (
                <div className="mt-3 text-xs text-gray-500 bg-white rounded-lg p-2 border border-border">
                  <span className="font-medium">{selectedVehicle.makeName} {selectedVehicle.modelName}</span>
                  {selectedVehicle.vehicleNo && (
                    <span className="ml-2 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{selectedVehicle.vehicleNo}</span>
                  )}
                </div>
              )}

              {/* Optional email / address */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Email</label>
                  <input value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} className={inputCls} placeholder="Optional" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Address</label>
                  <input value={form.customerAddress} onChange={e => set('customerAddress', e.target.value)} className={inputCls} placeholder="Optional" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Spare & Lube table ── */}
        <div className="border border-gray-200 rounded-xl">
          <div className="bg-gray-700 px-4 py-2 flex items-center gap-3 rounded-t-xl">
            <span className="text-white text-sm font-semibold">Spare &amp; Lube Details</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-600 text-white">
                  <th className="py-2 px-3 text-center w-10">#</th>
                  <th className="py-2 px-3 text-left">
                    <div>Particulars</div>
                    <label className="flex items-center gap-1 font-normal text-gray-300 cursor-pointer mt-0.5">
                      <input type="checkbox" checked={showPartNum} onChange={e => setShowPN(e.target.checked)} className="w-3 h-3" />
                      Show Part Number
                    </label>
                  </th>
                  <th className="py-2 px-3 text-center w-20">Qty</th>
                  <th className="py-2 px-3 text-center w-32">Unit price(RS.)</th>
                  <th className="py-2 px-3 text-center w-36">Discount</th>
                  <th className="py-2 px-3 text-center w-28">Amount(RS.)</th>
                  <th className="py-2 px-3 text-center w-12">Action</th>
                </tr>
              </thead>
              <tbody>
                {form.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400 text-xs">
                      Search and add spare or lube items below
                    </td>
                  </tr>
                )}
                {form.items.map((it, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-center text-gray-500">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <div className="font-medium text-gray-700">{it.name}</div>
                      {showPartNum && it.partNumber && <div className="text-gray-400 text-[10px]">{it.partNumber}</div>}
                      <div className="text-gray-400 text-[10px]">(Current Qty. {it.currentStock ?? '—'})</div>
                    </td>
                    <td className="py-2 px-3">
                      <input type="number" min="1" value={it.qty}
                        onChange={e => updateItem(idx, 'qty', Number(e.target.value))}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-primary" />
                    </td>
                    <td className="py-2 px-3">
                      <input type="number" min="0" value={it.unitPrice}
                        onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-primary" />
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <input type="number" min="0" value={it.discount}
                          onChange={e => updateItem(idx, 'discount', Number(e.target.value))}
                          className="w-14 border border-gray-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-primary" />
                        <button
                          onClick={() => updateItem(idx, 'discountType', it.discountType === 'percent' ? 'amount' : 'percent')}
                          className="flex items-center gap-0.5 border border-gray-200 rounded px-1.5 py-1 bg-white hover:bg-gray-50">
                          <span className="text-xs text-gray-600">{it.discountType === 'percent' ? '%' : '₹'}</span>
                          <ChevronDown size={10} className="text-gray-400" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center font-medium text-gray-700">{it.amount.toFixed(1)}</td>
                    <td className="py-2 px-3 text-center">
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 px-3 py-2">
            <div className="relative inline-block">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={itemSearch}
                onChange={e => searchItems(e.target.value)}
                placeholder="Search any spare or lube"
                className="w-64 pl-7 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-primary"
              />
              {(itemResults.length > 0 || itemSearch.trim()) && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[min(480px,90vw)] max-h-56 overflow-auto">
                  {itemResults.map(r => (
                    <button key={r._id}
                      onClick={() => { addItem(r); setItemSearch(''); setItemResults([]); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-0">
                      <div className="text-left">
                        <div className="font-semibold text-gray-800">{r.name}</div>
                        <div className="text-gray-400 text-[11px] mt-0.5">{r.partNumber || ''}&nbsp; Rate: Rs.{r.sellingPrice || r.purchasePrice || 0}</div>
                      </div>
                      <div className="text-gray-500 text-[11px] whitespace-nowrap ml-4">Stock on Hand: {(r.currentStock ?? 0).toFixed(2)}</div>
                    </button>
                  ))}
                  {itemResults.length === 0 && itemSearch.trim() && (
                    <div className="px-3 py-2 text-xs text-gray-400">No items found</div>
                  )}
                  <button
                    onClick={() => { setShowAddModal(true); setItemSearch(''); setItemResults([]); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-600 hover:bg-gray-50 border-t border-gray-100 font-medium">
                    <Plus size={13} /> Add New Item
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom: Note + Billing ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Note to display on Invoice</p>
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={8}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none bg-white" />
          </div>

          <div className="border border-gray-200 rounded-xl">
            <div className="flex border-b border-gray-200">
              {[['billing', 'Billing Details'], ['history', 'Transaction History']].map(([t, label]) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'text-gray-800 border-b-2 border-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'billing' ? (
              <div className="p-4 space-y-3 text-sm">
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-700">Total</span>
                    <span className="font-semibold text-gray-800">₹{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid</span>
                    <span className="font-medium text-green-500">₹{paidAmt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-3">
                    <span className="text-gray-600">Balance</span>
                    <span className="font-medium text-red-500">₹{balance.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2 mb-2">
                  <div className="flex items-center gap-2 border border-gray-200 rounded px-3 py-1.5 flex-1 bg-white">
                    <span className="text-xs text-gray-600">Counter Payment</span>
                    <ChevronDown size={13} className="text-gray-400 ml-auto" />
                  </div>
                  <input type="number" min="0" value={form.paymentAmount} onChange={e => set('paymentAmount', e.target.value)}
                    className="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-primary/40" />
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Transaction Type</label>
                  <select value={form.paymentType} onChange={e => set('paymentType', e.target.value)} className={inputCls}>
                    <option>Cash</option><option>UPI</option><option>Card</option><option>Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Transaction Number</label>
                  <input value={form.transactionNumber} onChange={e => set('transactionNumber', e.target.value)}
                    placeholder="Enter the transaction Number" className={inputCls} />
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-0.5 block">Transaction Date</label>
                  <DateField value={form.transactionDate} onChange={e => set('transactionDate', e.target.value)} className={inputCls} />
                </div>

                <div className="pt-2 border-t border-gray-100 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Previous Balance</span>
                    <span className="text-gray-700">₹0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-red-500">Total Balance</span>
                      <Info size={12} className="text-gray-400" />
                    </div>
                    <span className="text-sm font-bold text-red-500">₹{isEdit ? total : balance}</span>
                  </div>
                </div>

                {isEdit && (
                  <button onClick={handleAddPayment} disabled={saving}
                    className="w-full mt-1 py-2 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 disabled:opacity-50">
                    Add Payment
                  </button>
                )}
              </div>
            ) : (
              <TxHistory saleId={id} />
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 bg-gray-800 border-t border-gray-700">
        <button onClick={() => navigate('/counter-sale')}
          className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded transition-colors">
          Cancel
        </button>
        <div className="flex gap-3">
          <button onClick={() => handleSave(false)} disabled={saving}
            className="px-5 py-2 border border-white/50 text-white text-sm font-medium rounded hover:bg-white/10 disabled:opacity-50 transition-colors">
            {isEdit ? 'Save & Close' : 'Create & Close'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="px-5 py-2 border border-white/50 text-white text-sm font-medium rounded hover:bg-white/10 disabled:opacity-50 transition-colors">
            {isEdit ? 'Save & Print' : 'Create & Print'}
          </button>
        </div>
      </div>

      {showAddModal && (
        <QuickAddItemModal
          onClose={() => setShowAddModal(false)}
          onAdded={(created) => { addItem({ ...created, _type: created._type || 'Spare' }); setShowAddModal(false); }}
        />
      )}

      {/* ── New Customer Modal ── */}
      <Modal isOpen={showNewCustomerModal} onClose={() => setShowNewCustomerModal(false)} title="Add New Customer" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Name <span className="text-red-500">*</span></label>
              <input value={newCust.name} onChange={e => setNC('name', e.target.value)} className={modalInputCls} placeholder="Customer name" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Mobile <span className="text-red-500">*</span></label>
              <input value={newCust.mobile} onChange={e => setNC('mobile', e.target.value)} className={modalInputCls} placeholder="10-digit mobile" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
              <input value={newCust.email} onChange={e => setNC('email', e.target.value)} className={modalInputCls} placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Address</label>
              <input value={newCust.address} onChange={e => setNC('address', e.target.value)} className={modalInputCls} placeholder="Optional" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 mb-1 block">Vehicle Number</label>
              <input value={newCust.vehicleNo} onChange={e => setNC('vehicleNo', e.target.value.toUpperCase())} className={modalInputCls} placeholder="e.g. MH50AB1234" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Brand (Make)</label>
              <select value={newCust.makeId} onChange={e => {
                const m = vehicleMakes.find(x => x._id === e.target.value);
                setNC('makeId', e.target.value); setNC('makeName', m?.name || ''); setNC('modelId', ''); setNC('modelName', '');
              }} className={modalSelectCls}>
                <option value="">Select brand...</option>
                {vehicleMakes.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Model</label>
              <select value={newCust.modelId} onChange={e => {
                const m = filteredModels.find(x => x._id === e.target.value);
                setNC('modelId', e.target.value); setNC('modelName', m?.name || '');
              }} className={modalSelectCls} disabled={!newCust.makeId}>
                <option value="">{newCust.makeId ? 'Select model...' : 'Select brand first'}</option>
                {filteredModels.map(m => <option key={m._id} value={m._id}>{m.name}{m.variant ? ` (${m.variant})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Engine No.</label>
              <input value={newCust.engineNo} onChange={e => setNC('engineNo', e.target.value.toUpperCase())} className={modalInputCls} placeholder="Engine number" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Chassis No.</label>
              <input value={newCust.chassisNo} onChange={e => setNC('chassisNo', e.target.value.toUpperCase())} className={modalInputCls} placeholder="Chassis number" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowNewCustomerModal(false)}>Cancel</Button>
            <Button onClick={handleSaveNewCustomer} disabled={newCustSaving}>
              {newCustSaving ? 'Saving...' : 'Save Customer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TxHistory({ saleId }) {
  const [txns, setTxns] = useState([]);

  useEffect(() => {
    if (!saleId) return;
    counterSalesApi.get(saleId).then(({ data }) => setTxns(data.transactions || [])).catch(() => {});
  }, [saleId]);

  if (!saleId) return (
    <div className="p-4 text-xs text-gray-400 text-center">Save the sale to view history.</div>
  );

  return (
    <div className="p-4">
      {txns.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No transactions yet</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-1.5 text-gray-500 font-medium">Date</th>
              <th className="text-left py-1.5 text-gray-500 font-medium">Type</th>
              <th className="text-right py-1.5 text-gray-500 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-2 text-gray-600">{new Date(t.date).toLocaleDateString('en-IN')}</td>
                <td className="py-2 text-gray-600">{t.paymentType}</td>
                <td className="py-2 text-right font-medium text-green-600">₹{t.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
