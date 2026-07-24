import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { vehicleSaleApi } from '../../api/vehicleSaleApi';
import { vehicleStockApi } from '../../api/vehicleStockApi';
import { useToast } from '../../components/ui/Toast';
import { DateField } from '../../components/ui/DateField';
import { formatCurrency, formatDate } from '../../utils/format';
import useAuthStore from '../../store/authStore';
import Pagination from '../../components/ui/Pagination';
import { listItems } from '../../utils/list';

const selectCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary';
const labelCls = 'block text-sm font-medium text-gray-600 mb-1';

const REPORT_TYPES = [
  { value: 'sales', label: 'Sales Report' },
  { value: 'payment', label: 'Payment Report' },
  { value: 'stock', label: 'Stock Report' },
  { value: 'customer', label: 'Customer Report' }
];

const num = (v) => (isNaN(Number(v)) ? 0 : Number(v));
const day = (d) => (d ? String(d).slice(0, 10) : '');
const inRange = (d, from, to) => {
  const x = day(d);
  if (!x) return !from && !to;
  if (from && x < from) return false;
  if (to && x > to) return false;
  return true;
};
const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

const EMPTY = { reportType: 'sales', dateFrom: '', dateTo: '', customer: '', vehicleModel: '', variant: '', paymentStatus: '', dealer: '' };

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-bold text-gray-800">{value}</div>
    </div>
  );
}

export default function SaleReportsPage() {
  const { toast } = useToast();
  const { garage } = useAuthStore();
  const dealerName = garage?.workshopName || '';

  const [sales, setSales] = useState([]);
  const [stock, setStock] = useState([]);
  const [filters, setFilters] = useState({ ...EMPTY, dealer: dealerName });
  const [applied, setApplied] = useState(null);
  const [repPage, setRepPage] = useState(1);
  const [repLimit, setRepLimit] = useState(20);

  // Reset to page 1 whenever a new report is generated or page size changes.
  useEffect(() => { setRepPage(1); }, [applied, repLimit]);

  const set = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const loadData = useCallback(async () => {
    try {
      const [s, st] = await Promise.all([vehicleSaleApi.list({ all: 1 }), vehicleStockApi.list({ all: 1 })]);
      setSales(listItems(s.data));
      setStock(listItems(st.data));
    } catch { toast({ title: 'Failed to load report data', variant: 'error' }); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (dealerName) setFilters(f => ({ ...f, dealer: f.dealer || dealerName })); }, [dealerName]);

  // Dropdown option sources derived from the data.
  const customerOptions = useMemo(() => uniq(sales.map(s => s.customer?.name)), [sales]);
  const modelOptions = useMemo(() => uniq([
    ...sales.flatMap(s => (s.vehicles || []).map(v => v.vehicleModel)),
    ...stock.map(v => v.vehicleModel)
  ]), [sales, stock]);
  const variantOptions = useMemo(() => uniq([
    ...sales.flatMap(s => (s.vehicles || []).map(v => v.variant)),
    ...stock.map(v => v.variant)
  ]), [sales, stock]);

  const handleApply = () => setApplied({ ...filters });
  const handleReset = () => { setFilters({ ...EMPTY, dealer: dealerName }); setApplied(null); };

  // Compute report rows + summary from the applied filters.
  const report = useMemo(() => {
    if (!applied) return null;
    const f = applied;
    const matchSale = (s) => {
      if (f.customer && s.customer?.name !== f.customer) return false;
      if (f.paymentStatus && (s.payment?.paymentStatus || 'Pending') !== f.paymentStatus) return false;
      if (f.vehicleModel && !(s.vehicles || []).some(v => v.vehicleModel === f.vehicleModel)) return false;
      if (f.variant && !(s.vehicles || []).some(v => v.variant === f.variant)) return false;
      return true;
    };

    if (f.reportType === 'stock') {
      const rows = stock.filter(v =>
        (!f.vehicleModel || v.vehicleModel === f.vehicleModel) &&
        (!f.variant || v.variant === f.variant) &&
        inRange(v.createdAt, f.dateFrom, f.dateTo)
      );
      return {
        type: 'stock',
        cols: ['Vehicle Model', 'Variant', 'Color', 'Chassis Number', 'Engine Number', 'Qty'],
        rows: rows.map(v => [v.vehicleModel, v.variant || '-', v.color || '-', v.chassisNumber || '-', v.engineNumber || '-', v.qty]),
        stats: [['Records', rows.length], ['Total Qty', rows.reduce((a, v) => a + num(v.qty), 0)]]
      };
    }

    const filteredSales = sales.filter(s => matchSale(s) && inRange(s.saleDate, f.dateFrom, f.dateTo));

    if (f.reportType === 'payment') {
      const rows = [];
      filteredSales.forEach(s => {
        const trail = [];
        if (num(s.payment?.advancePaid) > 0) trail.push({ date: s.payment?.paymentDate || s.saleDate, amount: s.payment.advancePaid, mode: s.payment.paymentMode, ref: s.payment.transactionId, note: 'Advance' });
        (s.payments || []).forEach(p => trail.push({ date: p.date, amount: p.amount, mode: p.mode, ref: p.reference, note: p.note }));
        trail.forEach(t => { if (inRange(t.date, f.dateFrom, f.dateTo)) rows.push([formatDate(t.date), s.invoiceNo, s.customer?.name || '-', formatCurrency(t.amount), t.mode || '-', t.ref || '-', t.note || '-']); });
      });
      const collected = filteredSales.reduce((a, s) => a + num(s.payment?.totalPaid || s.payment?.advancePaid), 0);
      const balance = filteredSales.reduce((a, s) => a + num(s.payment?.balanceAmount), 0);
      return {
        type: 'payment',
        cols: ['Date', 'Invoice No.', 'Customer', 'Amount', 'Mode', 'Reference', 'Note'],
        rows,
        stats: [['Payments', rows.length], ['Total Collected', formatCurrency(collected)], ['Outstanding', formatCurrency(balance)]]
      };
    }

    if (f.reportType === 'customer') {
      const map = new Map();
      filteredSales.forEach(s => {
        const key = `${s.customer?.name || '-'}|${s.customer?.mobile || ''}`;
        const cur = map.get(key) || { name: s.customer?.name || '-', mobile: s.customer?.mobile || '-', sales: 0, payable: 0, paid: 0, balance: 0 };
        cur.sales += 1;
        cur.payable += num(s.payment?.netPayable);
        cur.paid += num(s.payment?.totalPaid || s.payment?.advancePaid);
        cur.balance += num(s.payment?.balanceAmount);
        map.set(key, cur);
      });
      const list = [...map.values()];
      return {
        type: 'customer',
        cols: ['Customer', 'Mobile', 'Sales', 'Net Payable', 'Total Paid', 'Balance'],
        rows: list.map(c => [c.name, c.mobile, c.sales, formatCurrency(c.payable), formatCurrency(c.paid), formatCurrency(c.balance)]),
        stats: [['Customers', list.length], ['Total Payable', formatCurrency(list.reduce((a, c) => a + c.payable, 0))], ['Total Paid', formatCurrency(list.reduce((a, c) => a + c.paid, 0))]]
      };
    }

    // Sales report (default)
    return {
      type: 'sales',
      cols: ['Invoice No.', 'Date', 'Customer', 'Vehicles', 'Vehicle Price', 'Net Payable', 'Total Paid', 'Balance', 'Status'],
      rows: filteredSales.map(s => [
        s.invoiceNo, formatDate(s.saleDate), s.customer?.name || '-',
        (s.vehicles || []).map(v => v.vehicleModel).filter(Boolean).join(', ') || '-',
        formatCurrency(s.payment?.showroomPrice ?? s.payment?.grossAmount),
        formatCurrency(s.payment?.netPayable), formatCurrency(s.payment?.totalPaid || s.payment?.advancePaid),
        formatCurrency(s.payment?.balanceAmount), s.payment?.paymentStatus || 'Pending'
      ]),
      stats: [
        ['Sales', filteredSales.length],
        ['Net Payable', formatCurrency(filteredSales.reduce((a, s) => a + num(s.payment?.netPayable), 0))],
        ['Total Paid', formatCurrency(filteredSales.reduce((a, s) => a + num(s.payment?.totalPaid || s.payment?.advancePaid), 0))],
        ['Balance', formatCurrency(filteredSales.reduce((a, s) => a + num(s.payment?.balanceAmount), 0))]
      ]
    };
  }, [applied, sales, stock]);

  const exportCSV = () => {
    if (!report || !report.rows.length) return toast({ title: 'Nothing to export', variant: 'error' });
    const lines = [report.cols.join(','), ...report.rows.map(r => r.map(csvCell).join(','))];
    // Prepend UTF-8 BOM so Excel reads ₹ and other non-ASCII correctly (else "₹" → "â‚¹")
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${report.type}-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h1 className="font-heading font-bold text-gray-800 text-2xl mb-5">Sales Reports</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Report Type</label>
            <select className={selectCls} value={filters.reportType} onChange={e => set('reportType', e.target.value)}>
              {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Customer</label>
            <select className={selectCls} value={filters.customer} onChange={e => set('customer', e.target.value)}>
              <option value="">All Customers</option>
              {customerOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Vehicle Model</label>
            <select className={selectCls} value={filters.vehicleModel} onChange={e => set('vehicleModel', e.target.value)}>
              <option value="">All Models</option>
              {modelOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Variant</label>
            <select className={selectCls} value={filters.variant} onChange={e => set('variant', e.target.value)}>
              <option value="">All Variants</option>
              {variantOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Payment Status</label>
            <select className={selectCls} value={filters.paymentStatus} onChange={e => set('paymentStatus', e.target.value)}>
              <option value="">All</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Dealer / Showroom</label>
            <select className={selectCls} value={filters.dealer} onChange={e => set('dealer', e.target.value)}>
              {dealerName ? <option value={dealerName}>{dealerName}</option> : <option value="">—</option>}
            </select>
          </div>
          <div>
            <label className={labelCls}>From Date</label>
            <DateField value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)} className={`${selectCls} w-full`} />
          </div>
          <div>
            <label className={labelCls}>To Date</label>
            <DateField value={filters.dateTo} onChange={e => set('dateTo', e.target.value)} className={`${selectCls} w-full`} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <RefreshCw size={14} /> Reset
          </button>
          <button onClick={handleApply}
            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600">
            Apply
          </button>
        </div>
      </div>

      {/* Results */}
      {!report ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          Apply filters to see report details
        </div>
      ) : (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 sm:mr-3">
              {report.stats.map(([l, v]) => <StatCard key={l} label={l} value={v} />)}
            </div>
            <button onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-green-300 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 bg-white whitespace-nowrap">
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Sr No</th>
                  {report.cols.map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.length === 0 ? (
                  <tr><td colSpan={report.cols.length + 1} className="text-center py-12 text-gray-400">No records match the filters</td></tr>
                ) : report.rows.slice((repPage - 1) * repLimit, repPage * repLimit).map((r, i) => (
                  <tr key={(repPage - 1) * repLimit + i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500">{(repPage - 1) * repLimit + i + 1}</td>
                    {r.map((c, j) => <td key={j} className="py-3 px-4 text-gray-700 whitespace-nowrap">{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={repPage}
            pages={Math.max(1, Math.ceil(report.rows.length / repLimit))}
            total={report.rows.length}
            limit={repLimit}
            onPage={setRepPage}
            onLimit={setRepLimit}
          />
        </div>
      )}
    </div>
  );
}
