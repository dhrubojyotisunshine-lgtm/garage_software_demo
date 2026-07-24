import { useState, useEffect, useCallback, useRef } from 'react';
import { DateField } from '../../components/ui/DateField';
import { Search, Calendar, Pencil, X, Wallet, Edit3, Check } from 'lucide-react';
import { expensesApi } from '../../api/expenses';
import { useToast } from '../../components/ui/Toast';
import api from '../../api/axios';

const today = () => new Date().toISOString().slice(0, 10);

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtINR(n) {
  return '₹ ' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── Expense Modal ──────────────────────────────────────── */
function ExpenseModal({ expense, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    supplierName: expense?.supplierName || '',
    supplierId:   expense?.supplierId   || null,
    billNumber:   expense?.billNumber   || '',
    expenseDate:  expense?.expenseDate  ? expense.expenseDate.slice(0, 10) : today(),
    totalAmount:  expense?.totalAmount  ?? '',
    paidAmount:   expense?.paidAmount   ?? '',
    description:  expense?.description  || ''
  });
  const [saving, setSaving]           = useState(false);
  const [supplierSearch, setSupSearch] = useState(expense?.supplierName || '');
  const [supplierResults, setSupRes]  = useState([]);
  const [showSupDrop, setShowSupDrop] = useState(false);
  const supRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const totalAmt   = parseFloat(form.totalAmount) || 0;
  const paidAmt    = parseFloat(form.paidAmount)  || 0;
  const balanceAmt = Math.max(0, totalAmt - paidAmt);

  useEffect(() => {
    const h = (e) => { if (supRef.current && !supRef.current.contains(e.target)) setShowSupDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const searchSuppliers = useCallback(async (q) => {
    setSupSearch(q);
    set('supplierName', q);
    set('supplierId', null);
    if (!q.trim()) { setSupRes([]); setShowSupDrop(false); return; }
    try {
      const { data } = await api.get('/suppliers', { params: { search: q } });
      setSupRes(data.slice(0, 8));
      setShowSupDrop(true);
    } catch {}
  }, []);

  const selectSupplier = (s) => {
    set('supplierName', s.firmName);
    set('supplierId', s._id);
    setSupSearch(s.firmName);
    setSupRes([]);
    setShowSupDrop(false);
  };

  const handleSave = async () => {
    if (!form.expenseDate) return toast({ title: 'Select expense date', variant: 'error' });
    if (totalAmt <= 0)     return toast({ title: 'Enter valid total amount', variant: 'error' });
    if (paidAmt < 0)       return toast({ title: 'Paid amount cannot be negative', variant: 'error' });

    setSaving(true);
    try {
      const payload = {
        supplierName: form.supplierName,
        supplierId:   form.supplierId,
        billNumber:   form.billNumber,
        expenseDate:  form.expenseDate,
        totalAmount:  totalAmt,
        paidAmount:   paidAmt,
        description:  form.description
      };
      if (expense?._id) {
        await expensesApi.update(expense._id, payload);
      } else {
        await expensesApi.create(payload);
      }
      toast({ title: expense?._id ? 'Expense updated' : 'Expense saved', variant: 'success' });
      onSaved();
    } catch (err) {
      toast({ title: err?.response?.data?.message || 'Save failed', variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-red-500 rounded-full" />
            <h3 className="font-semibold text-gray-800 text-lg">
              {expense?._id ? 'Edit Expense' : 'Add New Expense'}
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-500">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="font-semibold text-gray-700 text-sm">Expense Details</p>

          {/* Supplier Name */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Supplier Name</label>
            <div className="relative" ref={supRef}>
              <div className="flex items-center border border-gray-300 rounded-lg px-3 py-2.5 gap-2 focus-within:ring-2 focus-within:ring-red-400">
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  value={supplierSearch}
                  onChange={(e) => searchSuppliers(e.target.value)}
                  placeholder="Search supplier..."
                  className="flex-1 text-sm outline-none bg-transparent"
                />
              </div>
              {showSupDrop && supplierResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                  {supplierResults.map(s => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => selectSupplier(s)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      <span className="font-medium">{s.firmName}</span>
                      <span className="text-gray-400 text-xs ml-2">{s.contact1}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bill Number + Expense Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Bill Number</label>
              <input
                type="text"
                value={form.billNumber}
                onChange={(e) => set('billNumber', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Expense Date <span className="text-red-500">*</span></label>
              <DateField
                value={form.expenseDate}
                onChange={(e) => set('expenseDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Amount row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Total Amount <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                value={form.totalAmount}
                onChange={(e) => set('totalAmount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Paid Amount</label>
              <input
                type="number"
                min="0"
                value={form.paidAmount}
                onChange={(e) => set('paidAmount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Balance */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Balance Amount</label>
            <input
              type="text"
              value={balanceAmt}
              readOnly
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-4 px-6 pb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
            style={{ background: 'linear-gradient(to right, #ef4444, #b91c1c)' }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-lg text-white text-sm font-medium"
            style={{ background: '#7f1d1d' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Expense List Page ──────────────────────────────────── */
export default function ExpensePage() {
  const { toast } = useToast();
  const [expenses, setExpenses]         = useState([]);
  const [search, setSearch]             = useState('');
  const [dateFilter, setDate]           = useState('');
  const [loading, setLoading]           = useState(false);
  const [modalOpen, setModalOpen]       = useState(false);
  const [editing, setEditing]           = useState(null);
  const [openingBalance, setOpBal]      = useState(0);
  const [obInput, setObInput]           = useState('');
  const [editingOB, setEditingOB]       = useState(false);
  const [savingOB, setSavingOB]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (dateFilter)    params.date   = dateFilter;
      const { data } = await expensesApi.list(params);
      setExpenses(data);
    } catch {
      toast({ title: 'Failed to load expenses', variant: 'error' });
    } finally { setLoading(false); }
  }, [search, dateFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    expensesApi.getOpeningBalance()
      .then(({ data }) => {
        setOpBal(data.openingBalance || 0);
        setObInput(String(data.openingBalance || 0));
      })
      .catch(() => {});
  }, []);

  const saveOpeningBalance = async () => {
    setSavingOB(true);
    try {
      const val = parseFloat(obInput) || 0;
      await expensesApi.setOpeningBalance(val);
      setOpBal(val);
      setEditingOB(false);
      toast({ title: 'Opening balance saved', variant: 'success' });
    } catch {
      toast({ title: 'Save failed', variant: 'error' });
    } finally { setSavingOB(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await expensesApi.remove(id);
      toast({ title: 'Deleted', variant: 'success' });
      load();
    } catch {
      toast({ title: 'Delete failed', variant: 'error' });
    }
  };

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (exp) => { setEditing(exp); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };
  const onSaved = () => { closeModal(); load(); };

  const totalSpent = expenses.reduce((s, e) => s + (e.paidAmount || 0), 0);
  const remaining  = openingBalance - totalSpent;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-heading font-bold text-gray-800 text-2xl">Expenses</h1>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
        >
          Add New Expense
        </button>
      </div>

      {/* Opening Balance + Remaining Balance cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Opening Balance card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Wallet size={18} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Opening Balance</p>
            {editingOB ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={obInput}
                  onChange={e => setObInput(e.target.value)}
                  className="w-full border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') saveOpeningBalance(); if (e.key === 'Escape') setEditingOB(false); }}
                />
                <button onClick={saveOpeningBalance} disabled={savingOB} className="text-green-600 hover:text-green-700 flex-shrink-0">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingOB(false)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800 text-base">{fmtINR(openingBalance)}</span>
                <button onClick={() => { setEditingOB(true); setObInput(String(openingBalance)); }} className="text-gray-400 hover:text-blue-500">
                  <Edit3 size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Total Spent card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <X size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Total Spent</p>
            <p className="font-bold text-gray-800 text-base">{fmtINR(totalSpent)}</p>
          </div>
        </div>

        {/* Remaining Balance card */}
        <div className={`rounded-xl border p-4 flex items-center gap-4 ${remaining >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${remaining >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            <Wallet size={18} className={remaining >= 0 ? 'text-green-600' : 'text-red-600'} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Remaining Balance</p>
            <p className={`font-bold text-base ${remaining >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmtINR(remaining)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="flex items-center gap-2 flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <Search size={16} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by Supplier Name, Bill Number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <DateField
            value={dateFilter}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm outline-none text-gray-500"
          />
          <Calendar size={16} className="text-gray-400" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Supplier Name</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Bill Number</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Total Amount</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Paid Amount</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Balance Amount</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Remaining</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Expense Date</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
            )}
            {!loading && expenses.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No expenses found</td></tr>
            )}
            {(() => {
              let runningBalance = openingBalance;
              return expenses.map((exp) => {
                runningBalance -= (exp.paidAmount || 0);
                const rem = runningBalance;
                return (
                  <tr key={exp._id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{exp.supplierName || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{exp.billNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtINR(exp.totalAmount)}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtINR(exp.paidAmount)}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtINR(exp.balanceAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold text-sm ${rem >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmtINR(rem)}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{fmtDate(exp.expenseDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(exp)} className="text-red-400 hover:text-red-600">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(exp._id)} className="text-red-500 hover:text-red-700">
                          <X size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ExpenseModal
          expense={editing}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
