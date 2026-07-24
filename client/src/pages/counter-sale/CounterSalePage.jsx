import { useState, useEffect, useCallback } from 'react';
import { DateField } from '../../components/ui/DateField';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Pencil, Trash2, Printer, FileText, IndianRupee, AlertCircle } from 'lucide-react';
import { counterSalesApi } from '../../api/counterSales';
import Pagination from '../../components/ui/Pagination';
import { listItems, listTotal, listPages } from '../../utils/list';
import { useToast } from '../../components/ui/Toast';

export default function CounterSalePage() {
  const navigate = useNavigate();
  const { toast }  = useToast();

  const [sales, setSales]       = useState([]);
  const [stats, setStats]       = useState({ total: 0, revenue: 0, pending: 0 });
  const [search, setSearch]     = useState('');
  const [startDate, setStart]   = useState('');
  const [endDate, setEnd]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [deletingId, setDel]    = useState(null);
  const [page, setPage]         = useState(1);
  const [limit, setLimit]       = useState(20);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (search.trim()) params.search    = search.trim();
      if (startDate)      params.startDate = startDate;
      if (endDate)        params.endDate   = endDate;
      const [listRes, statsRes] = await Promise.all([
        counterSalesApi.list(params),
        counterSalesApi.stats()
      ]);
      setSales(listItems(listRes.data));
      setTotal(listTotal(listRes.data));
      setPages(listPages(listRes.data));
      setStats(statsRes.data);
    } catch {
      toast({ title: 'Failed to load counter sales', variant: 'error' });
    } finally { setLoading(false); }
  }, [search, startDate, endDate, page, limit]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, startDate, endDate, limit]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this counter sale?')) return;
    setDel(id);
    try {
      await counterSalesApi.delete(id);
      toast({ title: 'Deleted', variant: 'success' });
      load();
    } catch {
      toast({ title: 'Delete failed', variant: 'error' });
    } finally { setDel(null); }
  };

  const handlePrint = (id) => {
    window.open(counterSalesApi.pdfUrl(id), '_blank');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-gray-800 text-2xl">Counter Sale</h1>
        <button
          onClick={() => navigate('/counter-sale/new')}
          className="px-4 py-2 border border-red-500 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
        >
          Create Counter Sale
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Total Invoices"
          value={stats.total}
          icon={<FileText size={28} className="text-blue-400" />}
        />
        <StatCard
          label="Revenue Generated"
          value={`₹ ${stats.revenue.toLocaleString('en-IN')}`}
          icon={<img src="https://img.icons8.com/color/48/cash-register.png" alt="" className="w-10 h-10 object-contain" />}
        />
        <StatCard
          label="Pending Balance"
          value={`₹ ${stats.pending.toLocaleString('en-IN')}`}
          icon={<IndianRupee size={28} className="text-green-500" />}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search Counter By Customer Name,number or Counter Number"
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-white">
          <DateField
            value={startDate}
            onChange={e => setStart(e.target.value)}
            className="text-sm focus:outline-none text-gray-500"
          />
          <span className="text-gray-400 text-sm">–</span>
          <DateField
            value={endDate}
            onChange={e => setEnd(e.target.value)}
            className="text-sm focus:outline-none text-gray-500"
          />
          <Calendar size={14} className="text-gray-400" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-5 font-semibold text-gray-700">Sr No</th>
              <th className="text-left py-3 px-5 font-semibold text-gray-700">Counter Number</th>
              <th className="text-left py-3 px-5 font-semibold text-gray-700">Customer Name</th>
              <th className="text-left py-3 px-5 font-semibold text-gray-700">Mobile Number</th>
              <th className="text-left py-3 px-5 font-semibold text-gray-700">Pending Amount</th>
              <th className="text-left py-3 px-5 font-semibold text-gray-700">Total Amount</th>
              <th className="text-left py-3 px-5 font-semibold text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No counter sales found</td></tr>
            ) : sales.map((s, idx) => (
              <tr key={s._id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-5 text-gray-500">{(page - 1) * limit + idx + 1}</td>
                <td className="py-3 px-5 text-gray-700">{s.counterNumber}</td>
                <td className="py-3 px-5 text-gray-700">{s.customerName}</td>
                <td className="py-3 px-5 text-gray-600">{s.customerMobile}</td>
                <td className="py-3 px-5 font-medium text-red-500">
                  {s.balanceDue > 0 ? `₹ ${s.balanceDue.toLocaleString('en-IN')}` : '₹ 0'}
                </td>
                <td className="py-3 px-5 text-gray-700">₹ {(s.total || 0).toLocaleString('en-IN')}</td>
                <td className="py-3 px-5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/counter-sale/${s._id}`)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Edit">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDelete(s._id)} disabled={deletingId === s._id}
                      className="p-1.5 text-red-400 hover:bg-red-50 rounded" title="Delete">
                      <Trash2 size={15} />
                    </button>
                    <button onClick={() => handlePrint(s._id)}
                      className="p-1.5 text-blue-400 hover:bg-blue-50 rounded" title="Print">
                      <Printer size={15} />
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

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
      <div>{icon}</div>
    </div>
  );
}
