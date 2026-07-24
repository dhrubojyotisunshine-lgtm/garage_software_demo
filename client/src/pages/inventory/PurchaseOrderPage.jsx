import { useState, useEffect, useCallback } from 'react';
import { DateField } from '../../components/ui/DateField';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, ChevronDown, FileText, Wallet, IndianRupee, Download } from 'lucide-react';
import { purchaseOrdersApi } from '../../api/purchaseOrders';
import Pagination from '../../components/ui/Pagination';
import { listItems, listTotal, listPages } from '../../utils/list';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../utils/format';

const STATUS_COLORS = {
  Open:     'bg-blue-100 text-blue-700',
  Placed:   'bg-amber-100 text-amber-700',
  Received: 'bg-purple-100 text-purple-700',
  Closed:   'bg-green-100 text-green-700'
};

function StatBlock({ icon: Icon, label, value, iconBg }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
        <div className="text-xl font-bold text-gray-800">{value}</div>
      </div>
    </div>
  );
}

export default function PurchaseOrderPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats]         = useState({ total: 0, amount: 0, pending: 0 });
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [dateRange, setDateRange] = useState('');
  const [reportType, setReportType] = useState('');
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(20);
  const [total, setTotal]         = useState(0);
  const [pages, setPages]         = useState(1);

  const loadStats = async () => {
    try { const { data } = await purchaseOrdersApi.stats(); setStats(data); } catch {}
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await purchaseOrdersApi.list({
        search: search || undefined,
        reportType: reportType || undefined,
        page, limit
      });
      setOrders(listItems(data));
      setTotal(listTotal(data));
      setPages(listPages(data));
    } catch { toast({ title: 'Failed to load', variant: 'error' }); }
    finally { setLoading(false); }
  }, [search, reportType, page, limit]);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, reportType, limit]);

  const csvCell = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const exportCSV = async () => {
    let all = orders;
    try {
      const { data } = await purchaseOrdersApi.list({
        search: search || undefined,
        reportType: reportType || undefined,
        all: 1
      });
      all = listItems(data);
    } catch { /* fall back to current page */ }
    if (!all.length) return toast({ title: 'Nothing to export', variant: 'error' });
    const cols = ['Order Date', 'Order No.', 'Supplier Name', 'Contact Details', 'Received Date', 'Paid Amount', 'Pending Amount', 'Status'];
    const rowOf = (po) => [
      formatDate(po.createdAt),
      po.billNumber || po.poNumber || '',
      po.supplierName || '',
      po.supplierPhone || '',
      po.receivedDate ? formatDate(po.receivedDate) : '',
      po.paidAmount || 0,
      po.pendingAmount || 0,
      po.status || '',
    ];
    const lines = [cols.join(','), ...all.map(po => rowOf(po).map(csvCell).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this purchase order?')) return;
    try {
      await purchaseOrdersApi.delete(id);
      toast({ title: 'Deleted', variant: 'success' });
      load(); loadStats();
    } catch { toast({ title: 'Delete failed', variant: 'error' }); }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-heading font-bold text-gray-800 text-2xl">Purchase Order</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/inventory/purchase-order/add-stock')}
            className="px-4 py-2 border border-red-500 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
            Add Stock With PO
          </button>
          <button onClick={() => navigate('/inventory/purchase-order/new')}
            className="px-4 py-2 border border-red-500 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
            Create PO
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatBlock icon={FileText}    label="Total Purchase Order" value={stats.total}                         iconBg="bg-blue-400" />
        <StatBlock icon={Wallet}      label="Total Amount"         value={`₹ ${(stats.amount || 0).toLocaleString('en-IN')}`}  iconBg="bg-orange-400" />
        <StatBlock icon={IndianRupee} label="Pending Balance"      value={`₹ ${(stats.pending || 0).toLocaleString('en-IN')}`} iconBg="bg-green-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-lg">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search PO By Supplier Name, Bill Number"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <DateField value={dateRange} onChange={e => setDateRange(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <div className="relative">
          <select value={reportType} onChange={e => setReportType(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none text-gray-600">
            <option value="">Select report type</option>
            <option value="Open">Open</option>
            <option value="Placed">Placed</option>
            <option value="Received">Received</option>
            <option value="Closed">Closed</option>
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 border border-green-300 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 bg-white whitespace-nowrap"
          title="Download purchase orders as CSV"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['Sr No', 'Order Date', 'Order No.', 'Supplier Name', 'Contact Details', 'Received Date', 'Paid Amount', 'Pending Amount', 'Status', 'Action'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-gray-400">No purchase orders found</td></tr>
            ) : orders.map((po, idx) => (
              <tr key={po._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-500 text-xs">{(page - 1) * limit + idx + 1}</td>
                <td className="py-3 px-4 text-gray-600 text-xs">{formatDate(po.createdAt)}</td>
                <td className="py-3 px-4">
                  <button onClick={() => navigate(`/inventory/purchase-order/${po._id}`)}
                    className="font-medium text-gray-800 underline underline-offset-2 hover:text-red-500 text-xs">
                    {po.billNumber || po.poNumber}
                  </button>
                </td>
                <td className="py-3 px-4 text-gray-700">{po.supplierName || '-'}</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{po.supplierPhone || '-'}</td>
                <td className="py-3 px-4 text-gray-500 text-xs">{po.receivedDate ? formatDate(po.receivedDate) : '-'}</td>
                <td className="py-3 px-4 font-medium text-gray-800">₹{(po.paidAmount || 0).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 font-medium text-red-500">₹{(po.pendingAmount || 0).toLocaleString('en-IN')}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[po.status] || 'bg-gray-100 text-gray-600'}`}>
                    {po.status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button onClick={() => handleDelete(po._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
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
