import { useState, useEffect, useRef } from 'react';
import { DateField } from '../../components/ui/DateField';
import { useParams, useNavigate } from 'react-router-dom';
import {
  X, Plus, Pencil, Search, Package, Save, Printer,
  User, Car, ChevronRight
} from 'lucide-react';
import { estimatesApi } from '../../api/estimates';
import { mastersApi } from '../../api/masters';
import { customersApi } from '../../api/customers';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency, formatDateInput, getInitials } from '../../utils/format';
import VehicleModelPicker from '../../components/ui/VehicleModelPicker';

export default function EstimateFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = !!id && id !== 'new';

  // Masters
  const [labourItems, setLabourItems] = useState([]);
  const [spareItems, setSpareItems] = useState([]);
  const [lubeItems, setLubeItems] = useState([]);
  const [packages, setPackages] = useState([]);
  const [vehicleMakes, setVehicleMakes] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);

  // Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', vehicleNo: '', makeId: '', makeName: '', modelId: '', modelName: '', engineNo: '', chassisNo: '', color: '' });

  // Form
  const [form, setForm] = useState({
    estimateNumber: '',
    estimateDate: formatDateInput(new Date()),
    additionalNote: '',
    items: []
  });
  const [editNumMode, setEditNumMode] = useState(false);
  const [editDateMode, setEditDateMode] = useState(false);

  // Items
  const [activeItemTab, setActiveItemTab] = useState('Labour');
  const [itemSearch, setItemSearch] = useState('');
  const [itemSearchResults, setItemSearchResults] = useState([]);
  const [showPartNumber, setShowPartNumber] = useState(false);
  const [packageModalOpen, setPackageModalOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputCls = 'border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white w-full';
  const selectCls = 'border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';

  // Load masters
  useEffect(() => {
    Promise.all([
      mastersApi.list('labour'),
      mastersApi.list('spares'),
      mastersApi.list('lubes'),
      mastersApi.list('packages'),
      mastersApi.list('vehicle-makes'),
      mastersApi.list('vehicle-models')
    ]).then(([labour, spares, lubes, pkgs, makes, models]) => {
      setLabourItems(labour.data);
      setSpareItems(spares.data);
      setLubeItems(lubes.data);
      setPackages(pkgs.data);
      setVehicleMakes(makes.data);
      setVehicleModels(models.data);
    }).catch(console.error);
  }, []);

  // Load existing estimate
  useEffect(() => {
    if (!isEdit) return;
    estimatesApi.getById(id).then(({ data }) => {
      setForm({
        estimateNumber: data.estimateNumber || '',
        estimateDate: formatDateInput(data.estimateDate),
        additionalNote: data.additionalNote || '',
        items: data.items || []
      });
      if (data.customerId) {
        setSelectedCustomer({ _id: data.customerId, name: data.customerName, mobile: data.customerMobile });
        if (data.vehicleId) setSelectedVehicle({ _id: data.vehicleId, vehicleNo: data.vehicleNo, makeName: data.vehicleMake, modelName: data.vehicleModel });
      }
    }).catch(() => toast({ title: 'Failed to load estimate', variant: 'error' }));
  }, [id, isEdit]);

  // Load customer vehicles when customer selected (for complete data)
  const prevCustomerIdRef = useRef(null);
  useEffect(() => {
    if (!selectedCustomer?._id || selectedCustomer._id === prevCustomerIdRef.current) return;
    if (selectedCustomer.vehicles) return; // already full data
    prevCustomerIdRef.current = selectedCustomer._id;
    customersApi.getById(selectedCustomer._id).then(({ data }) => {
      setSelectedCustomer(data);
      if (!selectedVehicle && data.vehicles?.length > 0) setSelectedVehicle(data.vehicles[0]);
    }).catch(console.error);
  }, [selectedCustomer?._id]);

  // Customer search debounce
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await customersApi.search(customerSearch);
      setCustomerResults(data);
      setShowCustomerDropdown(true);
    }, 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  // Item search
  useEffect(() => {
    if (!itemSearch) { setItemSearchResults([]); return; }
    const list = activeItemTab === 'Labour' ? labourItems : activeItemTab === 'Spare' ? spareItems : lubeItems;
    const filtered = list.filter(i =>
      i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (i.jobCode || i.partNumber || '').toLowerCase().includes(itemSearch.toLowerCase())
    );
    setItemSearchResults(filtered.slice(0, 10));
  }, [itemSearch, activeItemTab, labourItems, spareItems, lubeItems]);

  const calcTotals = () => {
    const labourTotal = form.items.filter(i => i.itemType === 'Labour').reduce((s, i) => s + (i.finalAmount || 0), 0);
    const spareTotal  = form.items.filter(i => i.itemType === 'Spare').reduce((s, i) => s + (i.finalAmount || 0), 0);
    const lubeTotal   = form.items.filter(i => i.itemType === 'Lube').reduce((s, i) => s + (i.finalAmount || 0), 0);
    return { labourTotal, spareTotal, lubeTotal, total: labourTotal + spareTotal + lubeTotal };
  };
  const totals = calcTotals();

  const addItem = (masterItem) => {
    setItemSearch('');
    setItemSearchResults([]);
    const existingIdx = form.items.findIndex(i => String(i.itemId) === String(masterItem._id) && i.itemType === activeItemTab);
    if (existingIdx >= 0) {
      const updated = [...form.items];
      updated[existingIdx] = { ...updated[existingIdx], qty: updated[existingIdx].qty + 1, finalAmount: (updated[existingIdx].qty + 1) * updated[existingIdx].unitPrice };
      setField('items', updated);
    } else {
      setField('items', [...form.items, {
        itemId: masterItem._id, itemType: activeItemTab,
        name: masterItem.name, partNumber: masterItem.partNumber || masterItem.jobCode || '',
        qty: 1, unitPrice: masterItem.unitPrice || 0, finalAmount: masterItem.unitPrice || 0
      }]);
    }
  };

  const updateItem = (idx, field, val) => {
    const updated = [...form.items];
    updated[idx] = { ...updated[idx], [field]: val };
    if (field === 'qty' || field === 'unitPrice') updated[idx].finalAmount = Number(updated[idx].qty) * Number(updated[idx].unitPrice);
    setField('items', updated);
  };

  const removeItem = (idx) => setField('items', form.items.filter((_, i) => i !== idx));

  const addPackage = (pkg) => {
    const newItems = pkg.items.map(pi => ({ itemId: pi.itemId, itemType: pi.itemType, name: pi.name, qty: pi.qty || 1, unitPrice: pi.unitPrice || 0, finalAmount: (pi.qty || 1) * (pi.unitPrice || 0) }));
    setField('items', [...form.items, ...newItems]);
    setPackageModalOpen(false);
    toast({ title: `Package "${pkg.name}" added`, variant: 'success' });
  };

  const handleSave = async () => {
    if (!selectedCustomer) { toast({ title: 'Please select a customer', variant: 'error' }); return; }
    setSaving(true);
    try {
      const payload = {
        ...form, ...totals,
        customerId: selectedCustomer._id,
        customerName: selectedCustomer.name,
        customerMobile: selectedCustomer.mobile,
        vehicleId: selectedVehicle?._id,
        vehicleNo: selectedVehicle?.vehicleNo || '',
        vehicleMake: selectedVehicle?.makeName || '',
        vehicleModel: selectedVehicle?.modelName || ''
      };
      if (isEdit) {
        await estimatesApi.update(id, payload);
        toast({ title: 'Estimate updated', variant: 'success' });
      } else {
        const { data } = await estimatesApi.create(payload);
        toast({ title: 'Estimate created', variant: 'success' });
        navigate(`/estimate/${data._id}`);
        return;
      }
    } catch (e) {
      toast({ title: 'Save failed', description: e.response?.data?.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      const { data } = await estimatesApi.convertToJobcard(id);
      toast({ title: 'Converted to jobcard!', variant: 'success' });
      navigate(`/jobcards/${data.jobcard._id}`);
    } catch (e) {
      toast({ title: 'Conversion failed', description: e.response?.data?.message, variant: 'error' });
    } finally { setConverting(false); }
  };

  const itemsByTab = activeItemTab === 'Total' ? form.items : form.items.filter(i => i.itemType === activeItemTab);
  const frequentItems = activeItemTab === 'Total' ? [] :
    (activeItemTab === 'Labour' ? labourItems : activeItemTab === 'Spare' ? spareItems : lubeItems).filter(i => i.isFrequent);

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <h1 className="font-heading font-bold text-gray-800 text-2xl">
          {isEdit ? 'Edit Estimate' : 'Create Estimate'}
        </h1>

        <div className="flex items-center gap-1">
          {editNumMode ? (
            <input value={form.estimateNumber} onChange={e => setField('estimateNumber', e.target.value)} onBlur={() => setEditNumMode(false)} className={`${inputCls} w-32 font-mono`} autoFocus />
          ) : (
            <span className="font-mono text-sm font-medium text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg">
              {form.estimateNumber || 'Auto'}
            </span>
          )}
          <button onClick={() => setEditNumMode(v => !v)} className="p-1 text-gray-400 hover:text-gray-600">
            <Pencil size={13} />
          </button>
        </div>

        <span className="text-xs text-gray-400 ml-auto">
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>

        <button onClick={() => navigate('/estimate')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <X size={18} />
        </button>
      </div>

      {/* ── Top section: Customer + Estimate Info ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Left: Customer Details */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <User size={15} className="text-primary" /> Customer Details
          </h3>

          {!selectedCustomer ? (
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
                <button onClick={() => setShowNewCustomerModal(true)} className="btn-primary text-xs px-3 py-1.5 rounded-lg">
                  + New
                </button>
              </div>
              {showCustomerDropdown && customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-20 max-h-56 overflow-y-auto">
                  {customerResults.map(c => (
                    <button key={c._id} onClick={() => { setSelectedCustomer(c); setSelectedVehicle(c.vehicles?.[0] || null); setShowCustomerDropdown(false); setCustomerSearch(''); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-border last:border-0">
                      <div className="font-medium text-sm text-gray-800">{c.name}</div>
                      <div className="text-xs text-gray-400">{c.mobile} · {c.vehicles?.map(v => v.vehicleNo).filter(Boolean).join(', ') || 'No vehicle'}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {getInitials(selectedCustomer.name)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{selectedCustomer.name}</div>
                    <div className="text-xs text-gray-400">{selectedCustomer.mobile}</div>
                    {selectedCustomer.customerType && <div className="mt-1 text-lg font-extrabold text-primary uppercase tracking-wide">{selectedCustomer.customerType}</div>}
                  </div>
                </div>
                <button onClick={() => { setSelectedCustomer(null); setSelectedVehicle(null); }}
                  className="text-xs text-gray-400 hover:text-red-500 border border-border px-2 py-1 rounded-lg">
                  Change
                </button>
              </div>

              {selectedCustomer.vehicles?.length > 0 && (
                <div className="mt-3">
                  <label className="text-xs text-gray-500 font-medium mb-1.5 block">Select Vehicle</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.vehicles.map((v, i) => (
                      <button key={i} onClick={() => setSelectedVehicle(v)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${selectedVehicle?.vehicleNo === v.vehicleNo ? 'bg-primary text-white border-primary' : 'border-border text-gray-600 hover:border-primary'}`}>
                        <Car size={11} className="inline mr-1" />
                        {v.vehicleNo || `Vehicle ${i + 1}`}{v.makeName && ` · ${v.makeName}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedVehicle && (
                <div className="mt-3 text-xs text-gray-500 bg-white rounded-lg p-2 border border-border">
                  <span className="font-medium">{selectedVehicle.makeName} {selectedVehicle.modelName}</span>
                  {selectedVehicle.vehicleNo && <span className="ml-2 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{selectedVehicle.vehicleNo}</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Estimate Info */}
        <div className="card">
          <h3 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <Pencil size={15} className="text-primary" /> Estimate Info
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                Estimate Date
                <button onClick={() => setEditDateMode(v => !v)} className="text-gray-400 hover:text-primary">
                  <Pencil size={11} />
                </button>
              </label>
              {editDateMode ? (
                <DateField value={form.estimateDate} onChange={e => setField('estimateDate', e.target.value)} onBlur={() => setEditDateMode(false)} className={inputCls} autoFocus />
              ) : (
                <div className="text-sm text-gray-700 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-border">
                  {form.estimateDate ? new Date(form.estimateDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Estimate Total</label>
              <div className="text-sm font-semibold text-gray-800 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-border">
                {formatCurrency(totals.total)}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Additional Note</label>
            <textarea value={form.additionalNote} onChange={e => setField('additionalNote', e.target.value)} rows={4}
              placeholder="Any notes for this estimate..."
              className="border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white w-full resize-none" />
          </div>
        </div>
      </div>

      {/* ── Items section ── */}
      <div className="card mb-5">
        {/* Category tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[
            { type: 'Labour', label: 'Jobs', color: 'border-green-500 bg-green-50 text-green-700', activeColor: 'border-green-500 bg-green-500 text-white' },
            { type: 'Spare',  label: 'Spare', color: 'border-blue-500 bg-blue-50 text-blue-700',   activeColor: 'border-blue-500 bg-blue-500 text-white' },
            { type: 'Lube',   label: 'Lube', color: 'border-orange-400 bg-orange-50 text-orange-700', activeColor: 'border-orange-400 bg-orange-400 text-white' },
            { type: 'Total',  label: 'Total', color: 'border-gray-400 bg-gray-50 text-gray-700',   activeColor: 'border-gray-600 bg-gray-700 text-white' }
          ].map(({ type, label, color, activeColor }) => {
            const isActive = activeItemTab === type;
            const count = type === 'Total' ? form.items.length : form.items.filter(i => i.itemType === type).length;
            const amount = type === 'Labour' ? totals.labourTotal : type === 'Spare' ? totals.spareTotal : type === 'Lube' ? totals.lubeTotal : totals.total;
            return (
              <button key={type} onClick={() => setActiveItemTab(type)} className={`py-3 px-4 rounded-xl border-2 text-left transition-all ${isActive ? activeColor : color}`}>
                <div className="font-heading font-bold text-lg">{count}</div>
                <div className="text-xs font-medium">{label} Items</div>
                <div className="text-sm font-semibold mt-1">{formatCurrency(amount)}</div>
              </button>
            );
          })}
        </div>

        {/* Frequent items */}
        {frequentItems.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs font-medium text-gray-500 self-center">Quick add:</span>
            {frequentItems.map(item => (
              <button key={item._id} onClick={() => addItem(item)} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-primary/10 hover:text-primary transition-colors font-medium">
                + {item.name}
              </button>
            ))}
          </div>
        )}

        {/* Package + AI buttons */}
        <div className="flex gap-2 mb-3">
          <button onClick={() => setPackageModalOpen(true)} className="text-xs px-3 py-1.5 border border-border rounded-lg text-gray-600 hover:border-primary hover:text-primary flex items-center gap-1">
            <Package size={12} /> Load Package
          </button>
          <button onClick={() => toast({ title: 'AI Insights', description: 'Coming soon!', variant: 'default' })} className="text-xs px-3 py-1.5 border border-dashed border-purple-300 rounded-lg text-purple-500 hover:bg-purple-50 flex items-center gap-1">
            ✨ AI Insights
          </button>
        </div>

        {/* Line item table */}
        {itemsByTab.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase">
                    <div className="flex items-center gap-2">
                      Particulars
                      <label className="flex items-center gap-1 font-normal normal-case cursor-pointer text-gray-400">
                        <input type="checkbox" checked={showPartNumber} onChange={e => setShowPartNumber(e.target.checked)} className="w-3 h-3" />
                        <span className="text-[10px]">Show Part No.</span>
                      </label>
                    </div>
                  </th>
                  {activeItemTab === 'Total' && <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-20">Type</th>}
                  <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-20">Qty</th>
                  <th className="text-center py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-28">Unit Price ₹</th>
                  <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase w-28">Amount</th>
                  <th className="w-10 py-2.5 px-3" />
                </tr>
              </thead>
              <tbody>
                {itemsByTab.map((item) => {
                  const actualIdx = form.items.indexOf(item);
                  const typeBadgeColor = item.itemType === 'Labour' ? 'bg-green-100 text-green-700' : item.itemType === 'Spare' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700';
                  return (
                    <tr key={actualIdx} className="border-b border-border last:border-0">
                      <td className="py-2 px-3">
                        <div className="font-medium text-gray-800">{item.name}</div>
                        {showPartNumber && item.partNumber && <div className="text-xs text-gray-400">{item.partNumber}</div>}
                      </td>
                      {activeItemTab === 'Total' && (
                        <td className="py-2 px-3 text-center">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeBadgeColor}`}>{item.itemType === 'Labour' ? 'Jobs' : item.itemType}</span>
                        </td>
                      )}
                      <td className="py-2 px-3">
                        <input type="number" value={item.qty} min={1} onChange={e => updateItem(actualIdx, 'qty', Number(e.target.value))}
                          className="w-16 text-center border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="number" value={item.unitPrice} min={0} onChange={e => updateItem(actualIdx, 'unitPrice', Number(e.target.value))}
                          className="w-24 text-center border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-gray-700">
                        {formatCurrency(item.finalAmount)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button onClick={() => removeItem(actualIdx)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Item search */}
        {activeItemTab !== 'Total' && (
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={itemSearch} onChange={e => setItemSearch(e.target.value)}
              placeholder={`Search ${activeItemTab} items by name or code...`}
              className="pl-8 pr-3 py-2 border border-border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            {itemSearchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                {itemSearchResults.map(item => (
                  <button key={item._id} onClick={() => addItem(item)} className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-border last:border-0">
                    <div className="font-medium text-sm text-gray-800">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.partNumber || item.jobCode || ''} · ₹{item.unitPrice}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex flex-wrap items-center justify-end gap-3 bg-white rounded-2xl border border-border p-4">
        <Button variant="ghost" onClick={() => navigate('/estimate')}>Cancel</Button>
        {isEdit && (
          <Button variant="outline" onClick={() => window.open(`/estimate-print/${id}`, '_blank')}>
            <Printer size={14} /> Print Estimate
          </Button>
        )}
        {isEdit && (
          <Button onClick={handleConvert} disabled={converting} className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 text-sm rounded-lg font-medium inline-flex items-center gap-2">
            <ChevronRight size={14} />
            {converting ? 'Converting…' : 'Create Jobcard'}
          </Button>
        )}
        <Button onClick={handleSave} disabled={saving}>
          <Save size={14} />
          {saving ? 'Saving…' : isEdit ? 'Update Estimate' : 'Create Estimate'}
        </Button>
      </div>

      {/* ── New Customer Modal ── */}
      <Modal isOpen={showNewCustomerModal} onClose={() => setShowNewCustomerModal(false)} title="Add New Customer" size="lg">
        <NewCustomerForm
          value={newCustomer}
          onChange={setNewCustomer}
          makes={vehicleMakes}
          models={vehicleModels}
          onSave={async () => {
            try {
              const { data } = await customersApi.create({
                name: newCustomer.name,
                mobile: newCustomer.mobile,
                vehicles: newCustomer.vehicleNo ? [{ vehicleNo: newCustomer.vehicleNo, make: newCustomer.makeId, model: newCustomer.modelId, makeName: newCustomer.makeName, modelName: newCustomer.modelName, engineNo: newCustomer.engineNo, chassisNo: newCustomer.chassisNo, color: newCustomer.color }] : []
              });
              setSelectedCustomer(data);
              setSelectedVehicle(data.vehicles?.[0] || null);
              setShowNewCustomerModal(false);
              setNewCustomer({ name: '', mobile: '', vehicleNo: '', makeId: '', makeName: '', modelId: '', modelName: '', engineNo: '', chassisNo: '', color: '' });
              toast({ title: 'Customer added', variant: 'success' });
            } catch (e) {
              toast({ title: 'Failed to add customer', description: e.response?.data?.message, variant: 'error' });
            }
          }}
          onClose={() => setShowNewCustomerModal(false)}
        />
      </Modal>

      {/* ── Package Modal ── */}
      <Modal isOpen={packageModalOpen} onClose={() => setPackageModalOpen(false)} title="Load Package">
        {packages.length === 0 ? (
          <p className="text-center text-gray-400 py-6">No packages defined. Add them in Masters.</p>
        ) : (
          <div className="space-y-2">
            {packages.map(pkg => (
              <div key={pkg._id} className="flex items-center justify-between p-3 border border-border rounded-xl hover:border-primary">
                <div>
                  <div className="font-medium text-gray-800">{pkg.name}</div>
                  <div className="text-xs text-gray-400">{pkg.items?.length || 0} items · {formatCurrency(pkg.items?.reduce((s, i) => s + (i.unitPrice || 0), 0))}</div>
                </div>
                <Button size="sm" onClick={() => addPackage(pkg)}>Add</Button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function NewCustomerForm({ value, onChange, makes, models, onSave, onClose }) {
  const set = (k, v) => onChange(prev => ({ ...prev, [k]: v }));
  const inputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Name <span className="text-red-500">*</span></label>
          <input value={value.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Customer name" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Mobile <span className="text-red-500">*</span></label>
          <input value={value.mobile} onChange={e => set('mobile', e.target.value)} className={inputCls} placeholder="10-digit mobile" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Vehicle Number</label>
          <input value={value.vehicleNo} onChange={e => set('vehicleNo', e.target.value.toUpperCase())} className={inputCls} placeholder="e.g. MH50AB1234" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Brand &amp; Model</label>
          <VehicleModelPicker
            makes={makes}
            models={models}
            makeId={value.makeId}
            makeName={value.makeName}
            modelId={value.modelId}
            modelName={value.modelName}
            onChange={v => { set('makeId', v.makeId); set('makeName', v.makeName); set('modelId', v.modelId); set('modelName', v.modelName); }}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Vehicle Colour</label>
          <input value={value.color || ''} onChange={e => set('color', e.target.value)} className={inputCls} placeholder="e.g. White, Black, Red" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Engine No.</label>
          <input value={value.engineNo || ''} onChange={e => set('engineNo', e.target.value.toUpperCase())} className={inputCls} placeholder="Engine number" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Chassis No.</label>
          <input value={value.chassisNo || ''} onChange={e => set('chassisNo', e.target.value.toUpperCase())} className={inputCls} placeholder="Chassis number" />
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={onSave}>Save Customer</Button>
      </div>
    </div>
  );
}
