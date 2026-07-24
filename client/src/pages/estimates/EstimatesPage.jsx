import { useState, useEffect } from 'react';
import { DateField } from '../../components/ui/DateField';
import { useNavigate } from 'react-router-dom';
import { Search, Pencil, X, Plus } from 'lucide-react';
import { estimatesApi } from '../../api/estimates';
import Pagination from '../../components/ui/Pagination';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../utils/format';

export default function EstimatesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [estimates, setEstimates] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const loadEstimates = async () => {
    setLoading(true);
    try {
      const { data } = await estimatesApi.list({ search, date, page, limit });
      setEstimates(data.estimates);
      setTotal(data.total);
      setPages(data.pages || 1);
    } catch {
      toast({ title: 'Failed to load estimates', variant: 'error' });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadEstimates(); }, [search, date, page, limit]);
  useEffect(() => { setPage(1); }, [search, date, limit]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this estimate?')) return;
    try {
      await estimatesApi.delete(id);
      toast({ title: 'Estimate deleted', variant: 'success' });
      loadEstimates();
    } catch {
      toast({ title: 'Delete failed', variant: 'error' });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-heading font-bold text-gray-800 text-2xl">Estimates</h1>
        <Button variant="outline" onClick={() => navigate('/estimate/new')}>
          <Plus size={14} /> Create Estimate
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search Customer by Name, Mobile, Estimate No., Vehicle No."
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          />
        </div>
        <div className="relative">
          <DateField
            value={date}
            onChange={e => { setDate(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          />
          {date && (
            <button onClick={() => setDate('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50">
              {['Sr No', 'Date', 'Estimate Number', 'Customer Name', 'Vehicle Number', 'Total Amount', 'Estimate Status', 'Action'].map(h => (
                <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : estimates.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No estimates found</td></tr>
            ) : estimates.map((est, idx) => (
              <tr key={est._id} className="border-b border-border last:border-0 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-500">{(page - 1) * limit + idx + 1}</td>
                <td className="py-3 px-4 text-gray-600">{formatDate(est.estimateDate)}</td>
                <td className="py-3 px-4">
                  <button onClick={() => navigate(`/estimate/${est._id}`)} className="font-mono font-medium text-gray-800 underline underline-offset-2 hover:text-primary">
                    {est.estimateNumber}
                  </button>
                </td>
                <td className="py-3 px-4 text-gray-700">{est.customerName || '-'}</td>
                <td className="py-3 px-4 font-mono text-gray-500 text-xs">{est.vehicleNo || '-'}</td>
                <td className="py-3 px-4 font-semibold text-green-600">₹ {(est.total || 0).toFixed(1)}</td>
                <td className="py-3 px-4">
                  <Badge variant={est.status === 'Converted' ? 'closed' : 'open'}>{est.status}</Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/estimate/${est._id}`)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(est._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Delete">
                      <X size={14} />
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
