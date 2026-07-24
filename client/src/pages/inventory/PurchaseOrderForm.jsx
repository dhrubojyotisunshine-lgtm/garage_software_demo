import { useState, useEffect, useCallback } from 'react';
import { DateField } from '../../components/ui/DateField';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, X, Plus } from 'lucide-react';
import { purchaseOrdersApi } from '../../api/purchaseOrders';
import { suppliersApi } from '../../api/suppliers';
import { inventoryApi } from '../../api/inventory';
import { useToast } from '../../components/ui/Toast';
import QuickAddItemModal from '../../components/QuickAddItemModal';


const today = () => new Date().toISOString().split('T')[0];
const inputCls = 'w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary bg-white disabled:bg-gray-100 disabled:text-gray-500';
const GST_OPTIONS = [5, 12, 18, 28];
const TX_TYPES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card'];

const EMPTY_FORM = {
  supplierId: '', supplierName: '', supplierPhone: '', supplierBalance: 0,
  poNumber: 'PON', poDate: today(), billNumber: '', billDate: today(),
  status: 'Open', mode: 'create',
  items: [],
  transporterName: '', receivedDate: today(), vehicleNumber: '', deliveryPerson: '', ltNumber: '', note: '',
  subtotal: 0, gstAmount: 0, totalPayable: 0,
  paidAmount: 0, pendingAmount: 0,
  transactionType: 'Cash', transactionDate: today(), transactionNumber: ''
};

/* ── Status stepper ── */
function StatusStepper({ status }) {
  const steps = ['Open', 'Placed', 'Received', 'Closed'];
  const idx = steps.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`flex flex-col items-center`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-bold
              ${i <= idx ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300 text-gray-400'}`}>
              {i < idx ? '✓' : ''}
            </div>
            <span className={`text-[10px] mt-0.5 ${i <= idx ? 'text-blue-500 font-medium' : 'text-gray-400'}`}>{s}</span>
          </div>
          {i < steps.length - 1 && <div className={`w-8 h-0.5 mb-3 ${i < idx ? 'bg-blue-500' : 'bg-gray-200'}`} />}
        </div>
      ))}
    </div>
  );
}

export default function PurchaseOrderForm({ isAddStock = false }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { toast } = useToast();

  const [form, setForm] = useState({ ...EMPTY_FORM, mode: isAddStock ? 'addstock' : 'create' });
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemResults, setItemResults] = useState([]);
  const [showPartNumber, setShowPartNumber] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  /* ── Load existing PO ── */
  useEffect(() => {
    if (isEdit) {
      purchaseOrdersApi.get(id).then(({ data }) => setForm({ ...EMPTY_FORM, ...data })).catch(() => {});
    }
  }, [id]);

  /* ── Load suppliers ── */
  useEffect(() => {
    suppliersApi.list({ search: supplierSearch || undefined, all: 1 })
      .then(({ data }) => setSuppliers(data.items || [])).catch(() => {});
  }, [supplierSearch]);

  /* ── Item search ── */
  const searchItems = useCallback(async (q) => {
    setItemSearch(q);
    if (!q.trim()) return setItemResults([]);
    const [sp, lb] = await Promise.all([
      inventoryApi.listSpares(),
      inventoryApi.listLubes()
    ]);
    const all = [
      ...sp.data.map(i => ({ ...i, _type: 'Spare' })),
      ...lb.data.map(i => ({ ...i, _type: 'Lube' }))
    ];
    setItemResults(all.filter(i => i.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8));
  }, []);

  const selectSupplier = (s) => {
    setField('supplierId', s._id);
    setField('supplierName', s.firmName);
    setField('supplierPhone', s.contact1);
    setSupplierSearch(s.firmName);
    setShowSupplierDrop(false);
  };

  const addItem = (item) => {
    const price = item.purchasePrice || item.unitPrice || 0;
    const sell  = item.sellingPrice  || item.unitPrice || 0;
    const newItem = {
      itemId: item._id, itemType: item._type, name: item.name,
      partNumber: item.partNumber || '', hsn: '',
      qty: 1, unitPrice: price, sellingPrice: sell,
      gstPercent: 18, gstType: 'Incl', discount: 0,
      amount: price
    };
    const items = [...form.items, newItem];
    setForm(f => ({ ...f, items, ...calcTotals(items, f) }));
    setItemSearch(''); setItemResults([]);
  };

  const removeItem = (idx) => {
    const items = form.items.filter((_, i) => i !== idx);
    setForm(f => ({ ...f, items, ...calcTotals(items, f) }));
  };

  const updateItem = (idx, key, val) => {
    const items = form.items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [key]: val };
      updated.amount = updated.qty * updated.unitPrice;
      return updated;
    });
    setForm(f => ({ ...f, items, ...calcTotals(items, f) }));
  };

  const calcTotals = (items, f) => {
    const subtotal    = items.reduce((a, it) => a + (it.qty * it.unitPrice), 0);
    const gstAmount   = items.reduce((a, it) => {
      const base = it.gstType === 'Incl'
        ? it.amount - (it.amount / (1 + it.gstPercent / 100))
        : it.amount * (it.gstPercent / 100);
      return a + base;
    }, 0);
    const totalPayable  = subtotal + (items.some(i => i.gstType === 'Excl') ? gstAmount : 0);
    const paidAmount    = f.paidAmount || 0;
    const pendingAmount = Math.max(0, totalPayable - paidAmount);
    return { subtotal, gstAmount, totalPayable, pendingAmount };
  };

  const handleSave = async (newStatus) => {
    if (!form.supplierName) return toast({ title: 'Please select a supplier', variant: 'error' });
    setSaving(true);
    try {
      const payload = { ...form, status: newStatus || form.status };
      if (isEdit) await purchaseOrdersApi.update(id, payload);
      else        await purchaseOrdersApi.create(payload);

      // If Add Stock and status is Received, update inventory
      if (isAddStock && newStatus === 'Received' && !isEdit) {
        // will be handled via add-stock endpoint after create
      }
      toast({ title: isEdit ? 'Updated' : 'Saved', variant: 'success' });
      navigate('/inventory/purchase-order');
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Save failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleAddStock = async () => {
    if (!form.supplierName) return toast({ title: 'Please select a supplier', variant: 'error' });
    setSaving(true);
    try {
      const { data: po } = await purchaseOrdersApi.create({ ...form, status: 'Received', mode: 'addstock' });
      await purchaseOrdersApi.addStock(po._id);
      toast({ title: 'Stock added successfully', variant: 'success' });
      navigate('/inventory/purchase-order');
    } catch (e) {
      toast({ title: 'Error', description: e.response?.data?.message || 'Failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  const totalAmount = form.items.reduce((a, it) => a + (it.qty * it.unitPrice), 0);

  return (
    <div className="min-h-screen bg-white">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-800">
          {isAddStock ? 'Add Stock with PO' : isEdit ? 'Purchase Order' : 'Purchase Order'}
        </h1>
        <button onClick={() => navigate('/inventory/purchase-order')} className="text-gray-400 hover:text-gray-600">
          <X size={22} />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Top section: Supplier + PO Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left — Supplier */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={supplierSearch}
                  onChange={e => { setSupplierSearch(e.target.value); setShowSupplierDrop(true); }}
                  onFocus={() => setShowSupplierDrop(true)}
                  placeholder="Search Supplier By Firm Name and Number"
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white" />
                {showSupplierDrop && suppliers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-auto">
                    {suppliers.map(s => (
                      <button key={s._id} onClick={() => selectSupplier(s)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 border-b border-gray-50 last:border-0">
                        <span className="font-medium">{s.firmName}</span>
                        <span className="text-gray-400 ml-2">{s.contact1}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => navigate('/inventory/supplier')}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded font-medium">
                Add New
              </button>
            </div>

            <p className="text-xs font-semibold text-gray-600 mb-2">Supplier Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Supplier Name</label>
                <input value={form.supplierName} readOnly className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Supplier Phone</label>
                <input value={form.supplierPhone} readOnly className={inputCls} />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-0.5 block">Balance</label>
              <input value={form.supplierBalance?.toFixed(2) || '0.00'} readOnly className={inputCls} />
            </div>
            <div className="flex justify-end">
              <button className="px-4 py-1.5 bg-gray-400 text-white text-xs rounded opacity-60">
                {isAddStock ? 'or Edit' : '✏ Edit'}
              </button>
            </div>
          </div>

          {/* Right — PO Info */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            {!isAddStock && (
              <div className="mb-4">
                <StatusStepper status={form.status} />
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">P.O. Number</label>
                <input value={form.poNumber} onChange={e => setField('poNumber', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">P.O. Date</label>
                <DateField value={form.poDate?.split?.('T')?.[0] || form.poDate || ''} onChange={e => setField('poDate', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Bill Number <span className="text-red-500">*</span></label>
                <input value={form.billNumber} onChange={e => setField('billNumber', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Bill Date</label>
                <DateField value={form.billDate?.split?.('T')?.[0] || form.billDate || ''} onChange={e => setField('billDate', e.target.value)} className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* Stock Details */}
        <div className="border border-gray-200 rounded-xl">
          <div className="bg-gray-700 px-4 py-2 flex items-center gap-3 rounded-t-xl">
            <span className="text-white text-sm font-semibold">Stock Details</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-600 text-white">
                  <th className="py-2 px-3 text-left w-8">#</th>
                  <th className="py-2 px-3 text-left">
                    <div>Particulars</div>
                    <label className="flex items-center gap-1 font-normal text-gray-300 cursor-pointer mt-0.5">
                      <input type="checkbox" checked={showPartNumber} onChange={e => setShowPartNumber(e.target.checked)} className="w-3 h-3" />
                      Show Part Number
                    </label>
                  </th>
                  {isAddStock && <th className="py-2 px-3 text-center w-24">HSN</th>}
                  <th className="py-2 px-3 text-center w-16">Qty</th>
                  <th className="py-2 px-3 text-center w-24">Unit Price (RS.)</th>
                  {isAddStock && <th className="py-2 px-3 text-center w-24">Selling Price (RS.)</th>}
                  {isAddStock && <th className="py-2 px-3 text-center w-32">GST (%)</th>}
                  {isAddStock && <th className="py-2 px-3 text-center w-20">Discount</th>}
                  {isAddStock && <th className="py-2 px-3 text-center w-28">Unit Purchase Price (RS.)</th>}
                  <th className="py-2 px-3 text-center w-24">{isAddStock ? 'Amount (RS.)' : 'Total'}</th>
                  <th className="py-2 px-3 text-center w-10">Action</th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <div className="font-medium text-gray-700">{item.name}</div>
                      {showPartNumber && item.partNumber && <div className="text-gray-400 text-[10px]">{item.partNumber}</div>}
                    </td>
                    {isAddStock && (
                      <td className="py-2 px-3">
                        <input value={item.hsn || ''} onChange={e => updateItem(idx, 'hsn', e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-primary" />
                      </td>
                    )}
                    <td className="py-2 px-3">
                      <input type="number" min="1" value={item.qty} onChange={e => updateItem(idx, 'qty', Number(e.target.value))}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-primary" />
                    </td>
                    <td className="py-2 px-3">
                      <input type="number" min="0" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-primary" />
                    </td>
                    {isAddStock && (
                      <td className="py-2 px-3">
                        <input type="number" min="0" value={item.sellingPrice} onChange={e => updateItem(idx, 'sellingPrice', Number(e.target.value))}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-primary" />
                      </td>
                    )}
                    {isAddStock && (
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                          <select value={item.gstPercent} onChange={e => updateItem(idx, 'gstPercent', Number(e.target.value))}
                            className="border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none w-14">
                            {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
                          </select>
                          <select value={item.gstType} onChange={e => updateItem(idx, 'gstType', e.target.value)}
                            className="border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none w-14">
                            <option value="Incl">Incl</option>
                            <option value="Excl">Excl</option>
                          </select>
                        </div>
                      </td>
                    )}
                    {isAddStock && (
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <input type="number" min="0" value={item.discount} onChange={e => updateItem(idx, 'discount', Number(e.target.value))}
                            className="w-12 border border-gray-200 rounded px-1 py-1 text-xs text-center focus:outline-none" />
                          <select className="border border-gray-200 rounded px-1 py-1 text-xs focus:outline-none">
                            <option>₹</option><option>%</option>
                          </select>
                        </div>
                      </td>
                    )}
                    {isAddStock && (
                      <td className="py-2 px-3 text-center text-gray-700">{item.unitPrice.toFixed(1)}</td>
                    )}
                    <td className="py-2 px-3 text-center text-gray-700 font-medium">{(item.qty * item.unitPrice).toFixed(1)}</td>
                    <td className="py-2 px-3 text-center">
                      <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Search — outside overflow-x-auto so dropdown is never clipped */}
          <div className="border-t border-gray-100 px-3 py-2 relative">
            <div className="relative inline-block">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={itemSearch} onChange={e => searchItems(e.target.value)}
                placeholder="Search any spare or lube"
                className="w-64 pl-7 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-primary" />
              {(itemResults.length > 0 || itemSearch.trim()) && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[min(500px,90vw)] max-h-56 overflow-auto">
                  {itemResults.map(r => (
                    <button key={r._id} onClick={() => { addItem(r); setItemSearch(''); setItemResults([]); }}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-xs hover:bg-gray-50 border-b border-gray-100 last:border-0">
                      <div className="text-left">
                        <div className="font-semibold text-gray-800">{r.name}</div>
                        <div className="text-gray-400 text-[11px] mt-0.5">
                          {r.partNumber || r._id} &nbsp; Rate: Rs.{r.purchasePrice || r.unitPrice || 0}
                        </div>
                      </div>
                      <div className="text-gray-500 text-[11px] whitespace-nowrap ml-4">
                        Stock on Hand: {(r.currentStock ?? 0).toFixed(2)}
                      </div>
                    </button>
                  ))}
                  {itemResults.length === 0 && itemSearch.trim() && (
                    <div className="px-3 py-2 text-xs text-gray-400">No items found</div>
                  )}
                  <button onClick={() => { setShowAddItemModal(true); setItemSearch(''); setItemResults([]); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-gray-600 hover:bg-gray-50 border-t border-gray-100 font-medium">
                    <Plus size={13} /> Add New Item
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom section: Transport + Bill */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Transport Details */}
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Transport Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Transporter Name</label>
                <input value={form.transporterName} onChange={e => setField('transporterName', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Received Date</label>
                <DateField value={form.receivedDate?.split?.('T')?.[0] || form.receivedDate || ''} onChange={e => setField('receivedDate', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Vehicle Number</label>
                <input value={form.vehicleNumber} onChange={e => setField('vehicleNumber', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-0.5 block">Delivery Person</label>
                <input value={form.deliveryPerson} onChange={e => setField('deliveryPerson', e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-0.5 block">LT. Number</label>
              <input value={form.ltNumber} onChange={e => setField('ltNumber', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Note</label>
              <textarea value={form.note} onChange={e => setField('note', e.target.value)} rows={3}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white resize-none" />
            </div>
          </div>

          {/* Bill Details */}
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Bill Details</p>
            {isAddStock ? (
              <>
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total (Incl. GST)</span>
                    <span className="font-semibold text-gray-800">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-500 font-medium">Balance</span>
                    <span className="text-red-500 font-medium">₹{form.pendingAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-500 font-medium">Paid</span>
                    <span className="text-red-500 font-medium">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-2 mb-3">
                  <select className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none">
                    <option>PO Payment</option>
                  </select>
                  <input type="number" value={totalAmount.toFixed(0)} readOnly className="w-20 border border-gray-200 rounded px-2 py-1.5 text-xs bg-gray-50" />
                  <select className="w-10 border border-gray-200 rounded px-1 py-1.5 text-xs focus:outline-none">
                    <option>₹</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Transaction Type</label>
                    <select value={form.transactionType} onChange={e => setField('transactionType', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none">
                      {TX_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Transaction Date</label>
                    <DateField value={form.transactionDate?.split?.('T')?.[0] || form.transactionDate || ''}
                      onChange={e => setField('transactionDate', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-0.5 block">Transaction Number</label>
                    <input value={form.transactionNumber} onChange={e => setField('transactionNumber', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none" />
                  </div>
                </div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Return</span>
                  <span className="text-gray-700">₹0.00</span>
                </div>
                <div className="flex justify-between font-semibold text-sm">
                  <span className="text-gray-700">Total Balance</span>
                  <span className="text-green-600">₹0.00</span>
                </div>
              </>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-700">₹{form.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Taxable Subtotal</span>
                  <span className="text-gray-700">₹{form.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GST</span>
                  <span className="text-gray-700">₹{form.gstAmount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-gray-100 pt-2">
                  <span className="text-green-600">Total Payable</span>
                  <span className="text-green-600">₹{form.totalPayable?.toFixed(2) || totalAmount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 flex items-center justify-between px-6 py-3 bg-gray-800 border-t border-gray-700">
        <button onClick={() => navigate('/inventory/purchase-order')}
          className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded transition-colors">
          Cancel Order
        </button>
        {isAddStock ? (
          <button onClick={handleAddStock} disabled={saving}
            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Add To Stock'}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => handleSave('Open')} disabled={saving}
              className="px-5 py-2 bg-gray-500 hover:bg-gray-400 text-white text-sm font-medium rounded disabled:opacity-60 transition-colors">
              {saving ? '…' : 'Create PO'}
            </button>
            <button onClick={() => handleSave('Placed')} disabled={saving}
              className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded disabled:opacity-60 transition-colors">
              {saving ? '…' : 'Place Order'}
            </button>
          </div>
        )}
      </div>

      {/* Quick Add Item Modal */}
      {showAddItemModal && (
        <QuickAddItemModal
          onClose={() => setShowAddItemModal(false)}
          onAdded={(created) => {
            addItem({ ...created, _type: created._type || 'Spare' });
            setShowAddItemModal(false);
          }}
        />
      )}
    </div>
  );
}
