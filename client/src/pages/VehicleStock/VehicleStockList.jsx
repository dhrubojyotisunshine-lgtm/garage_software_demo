import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, Download } from 'lucide-react';
import { vehicleStockApi } from '../../api/vehicleStockApi';
import { useToast } from '../../components/ui/Toast';
import Pagination from '../../components/ui/Pagination';
import { listItems, listTotal, listPages } from '../../utils/list';
import { formatDate } from '../../utils/format';
import { DateField } from '../../components/ui/DateField';

const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export default function VehicleStockList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('available'); // 'available' | 'used' | 'all'
  const [fromDate, setFromDate] = useState('');   // In Date range (inclusive)
  const [toDate, setToDate]     = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await vehicleStockApi.list({
        page, limit, search: search || undefined, stock: stockFilter,
        fromDate: fromDate || undefined, toDate: toDate || undefined,
      });
      setRows(listItems(data));
      setTotal(listTotal(data));
      setPages(listPages(data));
    } catch { toast({ title: 'Failed to load stock', variant: 'error' }); }
    finally { setLoading(false); }
  }, [page, limit, search, stockFilter, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 whenever the search, filters or page size change.
  useEffect(() => { setPage(1); }, [search, stockFilter, limit, fromDate, toDate]);

  const STOCK_TABS = [
    { key: 'available', label: 'Available Stock' },
    { key: 'used',      label: 'Used Stock' },
    { key: 'all',       label: 'All' },
  ];

  const handleDelete = async (id) => {
    if (!confirm('Delete this stock record?')) return;
    try {
      await vehicleStockApi.delete(id);
      toast({ title: 'Deleted', variant: 'success' });
      load();
    } catch { toast({ title: 'Delete failed', variant: 'error' }); }
  };

  // Qty column removed — every stock row is a single vehicle (qty is locked to 1).
  const cols = ['Sr No', 'Vehicle Model', 'Variant', 'Color', 'Chassis Number', 'Engine Number', 'In Date', 'Dealer Name', 'Used', 'Remaining', 'Action'];

  // Export every row matching the current search + stock filter (not just this page).
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const { data } = await vehicleStockApi.list({
        all: 1, search: search || undefined, stock: stockFilter,
        fromDate: fromDate || undefined, toDate: toDate || undefined,
      });
      const all = listItems(data);
      if (!all.length) { toast({ title: 'Nothing to export', variant: 'error' }); return; }

      const header = cols.slice(0, -1);   // drop the "Action" column
      const lines = [
        header.join(','),
        ...all.map((r, i) => [
          i + 1, r.vehicleModel, r.variant, r.color, r.chassisNumber, r.engineNumber,
          r.inDate ? formatDate(r.inDate) : '', r.dealerName,
          r.used ?? 0, r.remaining ?? ((r.qty ?? 0) - (r.used ?? 0)),
        ].map(csvCell).join(','))
      ];

      // UTF-8 BOM so Excel renders ₹ and other non-ASCII correctly.
      const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vehicle-stock-${stockFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Exported ${all.length} record(s)`, variant: 'success' });
    } catch {
      toast({ title: 'Export failed', variant: 'error' });
    } finally { setExporting(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-heading font-bold text-gray-800 text-2xl">Stock Management</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-green-200 text-green-700 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors disabled:opacity-60">
            <Download size={16} /> {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button onClick={() => navigate('/vehicle-stock/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
            <Plus size={16} /> Add Stock
          </button>
        </div>
      </div>

      {/* Search + stock filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-lg">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by Model, Variant, Color, Chassis, Engine No. or Dealer"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        {/* In Date range */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap">In Date</span>
          <DateField value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          <span className="text-xs text-gray-400">to</span>
          <DateField value={toDate} onChange={e => setToDate(e.target.value)}
            className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(''); setToDate(''); }}
              className="text-xs text-gray-500 hover:text-red-600 underline whitespace-nowrap">
              Clear
            </button>
          )}
        </div>

        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {STOCK_TABS.map(t => (
            <button key={t.key} onClick={() => setStockFilter(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                stockFilter === t.key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {cols.map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={cols.length} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={cols.length} className="text-center py-12 text-gray-400">No stock records found</td></tr>
            ) : rows.map((r, idx) => (
              <tr key={r._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-500">{(page - 1) * limit + idx + 1}</td>
                <td className="py-3 px-4 font-medium text-gray-800">{r.vehicleModel}</td>
                <td className="py-3 px-4 text-gray-700">{r.variant || '-'}</td>
                <td className="py-3 px-4 text-gray-700">{r.color || '-'}</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{r.chassisNumber || '-'}</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{r.engineNumber || '-'}</td>
                <td className="py-3 px-4 text-gray-600 text-xs whitespace-nowrap">{r.inDate ? formatDate(r.inDate) : '-'}</td>
                <td className="py-3 px-4 text-gray-700">{r.dealerName || '-'}</td>
                <td className="py-3 px-4 text-gray-600">{r.used ?? 0}</td>
                <td className="py-3 px-4">
                  <span className={`font-semibold ${(r.remaining ?? r.qty) <= 0 ? 'text-red-600' : 'text-green-600'}`}>{r.remaining ?? r.qty}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <button onClick={() => navigate(`/vehicle-stock/${r._id}`)} title="Edit" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(r._id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600">
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
    </div>
  );
}
