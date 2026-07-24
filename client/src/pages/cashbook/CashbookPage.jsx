import { useState, useEffect, useCallback, useRef } from 'react';
import { DateField } from '../../components/ui/DateField';
import { Search, Calendar, Trash2, TrendingUp, TrendingDown, X, ChevronDown, Wallet } from 'lucide-react';
import { cashbookApi } from '../../api/cashbook';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';

// Manual IN entries are limited to "Other Income" — Jobcard/Counter Sale payments
// flow in automatically from their own modules.
const IN_CATEGORIES  = ['Other Income'];
const OUT_CATEGORIES = ['PO Payment', 'Other Expense'];
const PAY_METHODS    = ['Cash', 'UPI', 'Card', 'Cheque'];
// Filter dropdown still lists the source categories so the merged list stays filterable.
const ALL_CATEGORIES = ['Jobcard Payment', 'Counter Sale Payment', 'Other Income', 'PO Payment', 'Other Expense'];
const today = () => new Date().toISOString().slice(0, 10);

function fmtDateTime(d) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}
function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* ─── Entry Modal ─────────────────────────────────────────── */
function EntryModal({ type, onClose, onSaved, currentBalance }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    amount: '', paymentMethod: 'Cash', category: '',
    date: today(), transactionNumber: '', description: ''
  });
  const [refSearch, setRefSearch]   = useState('');
  const [refResults, setRefResults] = useState([]);
  const [linkedRef, setLinkedRef]   = useState(null);
  const [paidInput, setPaidInput]   = useState('');
  const [showRefDrop, setShowRef]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const refDropRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const categories = type === 'IN' ? IN_CATEGORIES : OUT_CATEGORIES;
  // Manual cashbook entries (IN and OUT) are cash-only; online flows come from
  // Jobcard / Counter Sale sources, not manual entries.
  const methods = ['Cash'];
  const hasReference = ['Jobcard Payment', 'Counter Sale Payment', 'PO Payment'].includes(form.category);

  // Close ref dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (refDropRef.current && !refDropRef.current.contains(e.target)) setShowRef(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Search pending refs when category + search changes
  const searchRefs = useCallback(async (q) => {
    setRefSearch(q);
    if (!form.category || !hasReference) return;
    try {
      const { data } = await cashbookApi.pending({ category: form.category, search: q || undefined });
      setRefResults(data);
      setShowRef(true);
    } catch {}
  }, [form.category, hasReference]);

  // Load pending refs when category changes
  useEffect(() => {
    if (hasReference) { searchRefs(''); }
    else { setRefResults([]); setLinkedRef(null); setPaidInput(''); }
  }, [form.category]);

  const selectRef = (item) => {
    setLinkedRef(item);
    setPaidInput(String(item.balance));
    setRefSearch('');
    setRefResults([]);
    setShowRef(false);
  };

  const removeRef = () => { setLinkedRef(null); setPaidInput(''); };

  // Preview balance after this entry
  const entryAmt = parseFloat(form.amount) || 0;
  const previewBalance = type === 'IN'
    ? currentBalance + entryAmt
    : currentBalance - entryAmt;

  const handleSave = async () => {
    if (!form.amount || entryAmt <= 0) return toast({ title: 'Enter a valid amount', variant: 'error' });
    if (!form.paymentMethod)           return toast({ title: 'Select payment method', variant: 'error' });
    if (!form.category)                return toast({ title: 'Select a category', variant: 'error' });

    setSaving(true);
    try {
      const payload = {
        type,
        amount: entryAmt,
        paymentMethod: form.paymentMethod,
        category: form.category,
        transactionNumber: form.transactionNumber,
        date: form.date,
        description: form.description,
        ...(linkedRef ? {
          referenceId:      linkedRef._id,
          referenceType:    linkedRef.type,
          referenceNumber:  linkedRef.number,
          referenceName:    linkedRef.name,
          referenceMobile:  linkedRef.mobile,
          referenceDate:    linkedRef.date,
          linkedPaidAmount: parseFloat(paidInput) || 0
        } : {})
      };
      await cashbookApi.create(payload);
      toast({ title: `Payment ${type} saved`, variant: 'success' });
      onSaved();
    } catch (e) {
      toast({ title: 'Save failed', description: e.response?.data?.message, variant: 'error' });
    } finally { setSaving(false); }
  };

  const iCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 bg-white rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-red-500 rounded-full" />
            <h2 className="text-2xl font-semibold text-gray-700">
              Cashbook Entry {type === 'IN' ? 'IN' : 'Out'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light">
            <X size={22} />
          </button>
        </div>

        <div className="px-7 py-5 space-y-4">
          {/* Row 1: Amount + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Amount <span className="text-red-500">*</span></label>
              <input
                type="number" min="0"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                className={iCls}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Date</label>
              <div className="relative">
                <DateField value={form.date} onChange={e => set('date', e.target.value)} className={iCls} />
                <Calendar size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 2: Payment Method + Transaction Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Select Payment Method <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className={iCls + ' appearance-none pr-9'}>
                  {methods.map(m => <option key={m}>{m}</option>)}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Transaction Number</label>
              <input value={form.transactionNumber} onChange={e => set('transactionNumber', e.target.value)} className={iCls} placeholder="" />
            </div>
          </div>

          {/* Row 3: Category + Reference Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Select Category <span className="text-red-500">*</span></label>
              <div className="relative">
                <select value={form.category} onChange={e => set('category', e.target.value)} className={iCls + ' appearance-none pr-9'}>
                  <option value="">— Select —</option>
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            {hasReference && (
              <div ref={refDropRef}>
                <label className="block text-sm font-medium text-gray-600 mb-1">Reference</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={refSearch}
                    onChange={e => searchRefs(e.target.value)}
                    onFocus={() => refResults.length > 0 && setShowRef(true)}
                    placeholder="Search By Customer Name or Mobile Number"
                    className={iCls + ' pl-9'}
                  />
                  {showRefDrop && refResults.length > 0 && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-full max-h-48 overflow-auto">
                      {refResults.map(r => (
                        <button key={r._id}
                          onClick={() => selectRef(r)}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm text-gray-800">{r.name}</div>
                              <div className="text-xs text-gray-500">{r.number} · {r.mobile}</div>
                            </div>
                            <div className="text-sm font-semibold text-red-500">₹{r.balance}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Balance display */}
          {form.amount && (
            <div>
              <span className="text-sm font-semibold text-red-500">Balance:&nbsp;&nbsp;</span>
              <span className="text-sm font-bold text-red-500">{previewBalance.toFixed(0)}</span>
            </div>
          )}

          {/* Reference table */}
          {hasReference && (
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-200 text-gray-700">
                    <th className="text-left py-2.5 px-4 font-semibold">Job Card / Counter Sell / PO</th>
                    <th className="text-center py-2.5 px-4 font-semibold w-28">Balance</th>
                    <th className="text-center py-2.5 px-4 font-semibold w-28">Paid</th>
                    <th className="text-center py-2.5 px-4 font-semibold w-20">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedRef ? (
                    <tr className="bg-white border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">{linkedRef.number}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>{linkedRef.name}</span>
                          <span className="text-gray-400">{linkedRef.mobile}</span>
                          <span className="ml-auto text-gray-400">{fmtDate(linkedRef.date)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700">{linkedRef.balance.toFixed(1)}</td>
                      <td className="py-3 px-4">
                        <input
                          type="number" min="0"
                          value={paidInput}
                          onChange={e => setPaidInput(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-red-300"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={removeRef}
                          className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center mx-auto hover:bg-red-600">
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-xs text-gray-400 bg-white">
                        Search and select a reference above
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white resize-none"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="px-7 pb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function CashbookPage() {
  const { toast } = useToast();
  const [entries, setEntries]     = useState([]);
  const [stats, setStats]         = useState({ cashReceived: 0, cashReceivedCash: 0, cashReceivedOnline: 0, cashSpend: 0, balance: 0 });
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPayMode, setFilterPayMode] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [loading, setLoading]     = useState(false);
  const [modalType, setModalType] = useState(null); // 'IN' | 'OUT' | null
  const [deletingId, setDelId]    = useState(null);
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim())                params.search   = search.trim();
      if (filterCat !== 'all')          params.category = filterCat;
      if (filterType !== 'all')         params.type     = filterType;
      if (filterPayMode !== 'all')      params.payMode  = filterPayMode;
      if (filterDateFrom)               params.dateFrom = filterDateFrom;
      if (filterDateTo)                 params.dateTo   = filterDateTo;
      const [listRes, statsRes] = await Promise.all([
        cashbookApi.list(params),
        cashbookApi.stats({ ...(filterDateFrom ? { dateFrom: filterDateFrom } : {}), ...(filterDateTo ? { dateTo: filterDateTo } : {}) })
      ]);
      setEntries(listRes.data);
      setStats(statsRes.data);
    } catch {
      toast({ title: 'Failed to load cashbook', variant: 'error' });
    } finally { setLoading(false); }
  }, [search, filterCat, filterType, filterPayMode, filterDateFrom, filterDateTo]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    setDelId(id);
    try {
      await cashbookApi.delete(id);
      toast({ title: 'Deleted', variant: 'success' });
      load();
    } catch {
      toast({ title: 'Delete failed', variant: 'error' });
    } finally { setDelId(null); }
  };

  const todayLabel = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const totalRows  = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));
  const paged      = entries.slice((page - 1) * limit, page * limit);
  useEffect(() => { setPage(1); }, [search, filterCat, filterType, filterPayMode, filterDateFrom, filterDateTo, limit]);

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-heading font-bold text-gray-800 text-2xl">Cash Book</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setModalType('OUT')}
            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Payment OUT
          </button>
          <button
            onClick={() => setModalType('IN')}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Payment IN
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      {(() => {
        const cashBalance = (stats.cashReceivedCash || 0) - (stats.cashSpend || 0);
        return (
      <div className="rounded-2xl overflow-hidden border border-blue-100 mb-6" style={{ background: 'linear-gradient(135deg, #e8f4fd 0%, #dbeafe 100%)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-blue-200">
          <div className="flex items-center gap-4 px-8 py-6">
            <div className="w-14 h-14 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
              <TrendingUp size={26} className="text-green-500" />
            </div>
            <div>
              <div className="text-base text-blue-600 font-semibold mb-0.5">Total Received</div>
              <div className="text-2xl font-bold text-gray-800">₹ {stats.cashReceived.toLocaleString('en-IN')}</div>
              <div className="flex items-center gap-2 mt-1 text-xs font-medium">
                <span className="px-2 py-0.5 rounded-full bg-white/70 text-gray-700 text-sm font-bold">Cash ₹ {(stats.cashReceivedCash || 0).toLocaleString('en-IN')}</span>
                <span className="px-2 py-0.5 rounded-full bg-white/70 text-gray-700">Online ₹ {(stats.cashReceivedOnline || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 px-8 py-6">
            <div className="w-14 h-14 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
              <TrendingDown size={26} className="text-red-500" />
            </div>
            <div>
              <div className="text-xs text-blue-600 font-medium mb-0.5">Cash Spend</div>
              <div className="text-2xl font-bold text-gray-800">₹ {stats.cashSpend.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 px-8 py-6">
            <div className="w-14 h-14 rounded-2xl bg-white/70 flex items-center justify-center shadow-sm">
              <Wallet size={26} className="text-blue-500" />
            </div>
            <div>
              <div className="text-xs text-blue-600 font-medium mb-0.5">Balance (Cash − Cash Spend)</div>
              <div className={`text-2xl font-bold ${cashBalance < 0 ? 'text-red-600' : 'text-gray-800'}`}>₹ {cashBalance.toLocaleString('en-IN')}</div>
              <div className="flex items-center gap-2 mt-1 text-xs font-medium">
                <span className="px-2 py-0.5 rounded-full bg-white/70 text-gray-500">Online ₹ {(stats.cashReceivedOnline || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
        );
      })()}

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search by Customer Name or Mobile Number"
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="relative">
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-8 min-w-[160px]">
            <option value="all">All Categories</option>
            {ALL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-1.5 border border-border rounded-lg px-3 py-2 bg-white">
          <span className="text-xs text-gray-400">From</span>
          <DateField value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
            className="text-sm focus:outline-none text-gray-500" />
          <span className="text-xs text-gray-400">To</span>
          <DateField value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
            className="text-sm focus:outline-none text-gray-500" />
          <Calendar size={14} className="text-gray-400" />
          {(filterDateFrom || filterDateTo) && (
            <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
              className="text-gray-400 hover:text-red-500" title="Clear dates">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="relative">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-8">
            <option value="all">All Types</option>
            <option value="IN">Payment IN</option>
            <option value="OUT">Payment OUT</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select value={filterPayMode} onChange={e => setFilterPayMode(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-8">
            <option value="all">Cash &amp; Online</option>
            <option value="cash">Cash only</option>
            <option value="online">Online (UPI/Card/Cheque)</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              <th className="text-left py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Sr No</th>
              <th className="text-left py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Date &amp; Time</th>
              <th className="text-left py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Name / Description</th>
              <th className="text-left py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Reference Number</th>
              <th className="text-left py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Category</th>
              <th className="text-right py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Amount</th>
              <th className="text-left py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Payment Mode</th>
              <th className="text-center py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">Loading…</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">No cashbook entries found</td></tr>
            ) : paged.map((e, idx) => (
              <tr key={e._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-5 text-gray-500 text-xs">{(page - 1) * limit + idx + 1}</td>
                <td className="py-3 px-5 text-gray-600 text-xs whitespace-nowrap">{fmtDateTime(e.date || e.createdAt)}</td>
                <td className="py-3 px-5">
                  <div className="font-medium text-gray-800">{e.referenceName || e.description || '—'}</div>
                  {e.description && e.referenceName && (
                    <div className="text-xs text-gray-400">{e.description}</div>
                  )}
                </td>
                <td className="py-3 px-5 text-gray-600">{e.referenceNumber || '—'}</td>
                <td className="py-3 px-5">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    e.type === 'IN'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-600'
                  }`}>{e.category}</span>
                </td>
                <td className="py-3 px-5 text-right">
                  <span className={`font-semibold ${e.type === 'IN' ? 'text-green-600' : 'text-red-500'}`}>
                    {e.type === 'OUT' ? '− ' : '+ '}₹ {e.amount.toLocaleString('en-IN')}
                  </span>
                </td>
                <td className="py-3 px-5 text-gray-600">{e.paymentMethod}</td>
                <td className="py-3 px-5 text-center">
                  {e.source === 'manual' ? (
                    <button
                      onClick={() => handleDelete(e._id)}
                      disabled={deletingId === e._id}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    >
                      <X size={15} />
                    </button>
                  ) : (
                    <span className="text-[10px] text-gray-400 uppercase">{e.referenceType}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={totalPages} total={totalRows} limit={limit} onPage={setPage} onLimit={setLimit} />

      {/* ── Entry Modal ── */}
      {modalType && (
        <EntryModal
          type={modalType}
          currentBalance={stats.balance}
          onClose={() => setModalType(null)}
          onSaved={() => { setModalType(null); load(); }}
        />
      )}
    </div>
  );
}
