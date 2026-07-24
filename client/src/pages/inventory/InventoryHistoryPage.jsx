import { useState, useEffect, useCallback } from 'react';
import { DateField } from '../../components/ui/DateField';
import { Search, RefreshCw, FileText, ShoppingCart } from 'lucide-react';
import { inventoryApi } from '../../api/inventory';
import { formatCurrency, formatDate } from '../../utils/format';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';

const TYPE_TABS = [
  { key: 'all',    label: 'All' },
  { key: 'Labour', label: 'Jobs' },
  { key: 'Spare',  label: 'Spare' },
  { key: 'Lube',   label: 'Lube' },
];

const typeBadge = (t) => {
  if (t === 'Labour') return 'bg-green-100 text-green-700';
  if (t === 'Spare')  return 'bg-blue-100 text-blue-700';
  if (t === 'Lube')   return 'bg-orange-100 text-orange-700';
  return 'bg-gray-100 text-gray-600';
};

export default function InventoryHistoryPage() {
  const { toast } = useToast();
  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [limit, setLimit]       = useState(20);
  const [loading, setLoading]   = useState(false);
  const [type, setType]         = useState('all');
  const [search, setSearch]     = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (type !== 'all') params.type = type;
      if (search) params.search = search;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;
      const { data } = await inventoryApi.history(params);
      setRows(data.data);
      setTotal(data.total);
      setPages(data.pages);
    } catch {
      toast({ title: 'Failed to load history', variant: 'error' });
    } finally { setLoading(false); }
  }, [page, limit, type, search, dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [limit]);

  const handleSearch = () => { setSearch(searchInput); setPage(1); };
  const clearFilters = () => { setSearch(''); setSearchInput(''); setDateFrom(''); setDateTo(''); setPage(1); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-gray-800 text-2xl">Inventory History</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} usage records</p>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TYPE_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setType(t.key); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
              type === t.key
                ? 'bg-gray-800 text-white border-gray-800'
                : 'border-transparent bg-gray-100 text-gray-600 hover:border-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search item name..."
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
            <DateField value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
            <DateField value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white" />
          </div>
          <Button onClick={handleSearch} size="md">Search</Button>
          {(search || dateFrom || dateTo) && (
            <Button variant="ghost" onClick={clearFilters}>Clear</Button>
          )}
          <button onClick={fetch} disabled={loading}
            className="p-2.5 border border-border rounded-lg hover:bg-gray-50 text-gray-500 disabled:opacity-50">
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
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sr No</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit Price</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <p className="text-gray-400 text-sm">No usage records found</p>
                  </td>
                </tr>
              ) : rows.map((r, i) => (
                <tr key={i} className="border-b border-border hover:bg-gray-50 transition-colors last:border-0">
                  <td className="py-3 px-4 text-gray-500 text-xs">{(page - 1) * limit + i + 1}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-800">{r.itemName}</div>
                    {r.partNumber && <div className="text-xs text-gray-400">{r.partNumber}</div>}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeBadge(r.itemType)}`}>
                      {r.itemType === 'Labour' ? 'Jobs' : r.itemType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-gray-700">{r.qty}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(r.unitPrice)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-800">{formatCurrency(r.amount)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      {r.source === 'Jobcard' ? (
                        <FileText size={12} className="text-blue-400 flex-shrink-0" />
                      ) : (
                        <ShoppingCart size={12} className="text-amber-400 flex-shrink-0" />
                      )}
                      <span className="text-xs font-medium text-gray-700">{r.sourceNumber || r.source}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{r.source}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-sm">{r.customerName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} onLimit={setLimit} />
    </div>
  );
}
