import { useState, useEffect, useCallback } from 'react';
import { DateField } from '../../components/ui/DateField';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Printer, Download, Trash2, Edit, FileText, RefreshCw, MessageCircle, ClipboardList } from 'lucide-react';
import { jobcardsApi } from '../../api/jobcards';
import { formatCurrency, formatDate } from '../../utils/format';
import { buildInvoiceWhatsappUrl } from '../../utils/whatsapp';
import { useToast } from '../../components/ui/Toast';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import useAuthStore from '../../store/authStore';

const STATUS_FILTERS = [
  { key: 'open', label: 'Open', color: 'bg-red-100 text-red-700' },
  { key: 'completed', label: 'Complete', color: 'bg-amber-100 text-amber-700' },
  { key: 'closed', label: 'Closed', color: 'bg-green-100 text-green-700' },
  { key: 'deleted', label: 'Deleted', color: 'bg-gray-100 text-gray-500' },
  { key: '', label: 'All', color: 'bg-gray-800 text-white' }
];

const statusVariant = (cat) => {
  if (cat === 'Open') return 'open';
  if (cat === 'Completed') return 'completed';
  if (cat === 'Closed') return 'closed';
  return 'default';
};

export default function JobcardListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { isStaff, staffUser, garage } = useAuthStore();
  const perm = (key) => !isStaff || !!staffUser?.roleId?.jobcardPermissions?.[key];
  const [jobcards, setJobcards] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  // Open a jobcard, remembering the current filter so we return to the same tab.
  const openCard = (id) => navigate(`/jobcards/${id}${statusFilter ? `?from=${statusFilter}` : ''}`);
  const selectFilter = (key) => { setStatusFilter(key); setPage(1); setSearchParams(key ? { status: key } : {}); };
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { status: statusFilter, search, page, limit };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const { data } = await jobcardsApi.list(params);
      setJobcards(data.jobcards);
      setCounts(data.counts);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch {
      toast({ title: 'Failed to load jobcards', variant: 'error' });
    } finally { setLoading(false); }
  }, [statusFilter, search, page, limit, dateFrom, dateTo]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { setPage(1); }, [search, limit, dateFrom, dateTo]);

  const handleSearch = () => { setSearch(searchInput); setPage(1); };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this jobcard?')) return;
    try {
      await jobcardsApi.delete(id);
      toast({ title: 'Jobcard deleted', variant: 'success' });
      fetch();
    } catch (err) {
      toast({ title: err.response?.data?.message || 'Delete failed', variant: 'error' });
    }
  };

  const handlePrint = async (id, e) => {
    e.stopPropagation();
    try {
      await jobcardsApi.printPdf(id);
    } catch {
      toast({ title: 'Failed to generate PDF', variant: 'error' });
    }
  };

  const handleWorksheet = (id, e) => {
    e.stopPropagation();
    window.open(`/jobcard-worksheet/${id}`, '_blank');
  };

  const handleWhatsapp = (jc, e) => {
    e.stopPropagation();
    window.open(buildInvoiceWhatsappUrl(jc, garage), '_blank');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-gray-800 text-2xl">Jobcards</h1>
          <p className="text-gray-500 text-sm mt-0.5">{counts.total || 0} total jobcards</p>
        </div>
        <div className="flex gap-2">
          {perm('canCreate') && (
            <Button variant="outline" onClick={() => navigate('/jobcards/new?type=short')}>
              <FileText size={15} /> Short Invoice
            </Button>
          )}
          {perm('canCreate') && (
            <Button onClick={() => navigate('/jobcards/new')}>
              <Plus size={15} /> Create Jobcard
            </Button>
          )}
        </div>
      </div>

      {/* Status filter badges */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => selectFilter(f.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border-2 ${
              statusFilter === f.key
                ? 'border-primary shadow-sm scale-105'
                : 'border-transparent hover:border-gray-200'
            } ${f.color}`}
          >
            {f.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              statusFilter === f.key ? 'bg-white/20' : 'bg-black/10'
            }`}>
              {f.key === '' ? counts.total || 0
               : f.key === 'open' ? counts.open || 0
               : f.key === 'completed' ? counts.completed || 0
               : f.key === 'closed' ? counts.closed || 0
               : counts.deleted || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search by customer name, mobile, invoice no., vehicle no..."
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
            <DateField
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
            <DateField
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            />
          </div>
          <Button onClick={handleSearch} size="md">Search</Button>
          {(search || dateFrom || dateTo) && (
            <Button variant="ghost" onClick={() => { setSearch(''); setSearchInput(''); setDateFrom(''); setDateTo(''); setPage(1); }}>
              Clear
            </Button>
          )}
          <button
            onClick={fetch}
            disabled={loading}
            className="p-2.5 border border-border rounded-lg hover:bg-gray-50 text-gray-500 disabled:opacity-50"
          >
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
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entry Date</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Service Type</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Jobcard No.</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle No.</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bill Amount</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : jobcards.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12">
                    <FileText size={40} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No jobcards found</p>
                    <button
                      onClick={() => navigate('/jobcards/new')}
                      className="mt-3 text-primary text-sm font-medium hover:underline"
                    >
                      Create your first jobcard
                    </button>
                  </td>
                </tr>
              ) : jobcards.map((jc, idx) => (
                <tr
                  key={jc._id}
                  className="border-b border-border hover:bg-gray-50 cursor-pointer transition-colors last:border-0"
                  onClick={() => openCard(jc._id)}
                >
                  <td className="py-3 px-4 text-gray-500">{(page - 1) * limit + idx + 1}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{formatDate(jc.createdAt)}</td>
                  <td className="py-3 px-4">
                    <Badge variant={statusVariant(jc.statusCategory)}>
                      {jc.statusCategory || 'Open'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{jc.typeLabel || '-'}</td>
                  <td className="py-3 px-4 font-medium text-gray-800 font-mono text-xs">{jc.jobcardNumber}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">{jc.vehicleNo || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-800">{jc.customerName || '-'}</div>
                    <div className="text-xs text-gray-400">{jc.customerMobile || ''}</div>
                    {jc.customerType && <div className="text-[11px] font-semibold text-primary uppercase mt-0.5">{jc.customerType}</div>}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {[jc.vehicleMake, jc.vehicleModel].filter(Boolean).join(' ') || '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-800">
                    {formatCurrency(jc.billAmount)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={jc.balanceDue > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                      {formatCurrency(jc.balanceDue)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                      {perm('canEdit') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openCard(jc._id); }}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handlePrint(jc._id, e)}
                        className="p-1.5 rounded-lg hover:bg-green-50 text-green-500" title="Print Invoice"
                      >
                        <Printer size={14} />
                      </button>
                      <button
                        onClick={(e) => handleWorksheet(jc._id, e)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500" title="Mechanic Worksheet"
                      >
                        <ClipboardList size={14} />
                      </button>
                      <button
                        onClick={(e) => handleWhatsapp(jc, e)}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Share invoice on WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </button>
                      {perm('canDelete') && jc.statusCategory !== 'Closed' && (
                        <button
                          onClick={(e) => handleDelete(jc._id, e)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400" title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="px-4 pb-4 border-t border-border">
            <Pagination page={page} pages={totalPages} total={total} limit={limit} onPage={setPage} onLimit={setLimit} />
          </div>
        )}
      </div>
    </div>
  );
}
