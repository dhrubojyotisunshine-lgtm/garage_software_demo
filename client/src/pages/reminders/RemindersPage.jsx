import { useState, useEffect, useMemo } from 'react';
import { BellRing, RefreshCw, MessageCircle, Phone, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { reportsApi } from '../../api/reports';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import useAuthStore from '../../store/authStore';
import { buildReminderWhatsappUrl } from '../../utils/whatsapp';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Overdue', label: 'Overdue' },
  { key: 'Upcoming', label: 'Upcoming' },
];

export default function RemindersPage() {
  const { toast } = useToast();
  const { garage } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, overdue: 0, upcoming: 0 });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const load = async () => {
    setLoading(true);
    try {
      // services-due ignores the date range server-side, but the endpoint requires both.
      const { data } = await reportsApi.fetch({ type: 'services-due', startDate: '2000-01-01', endDate: '2100-01-01' });
      setRows(data.data || []);
      setSummary(data.summary || { total: 0, overdue: 0, upcoming: 0 });
    } catch {
      toast({ title: 'Failed to load reminders', variant: 'error' });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (filter !== 'all') r = r.filter(x => x.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x =>
        (x.customerName || '').toLowerCase().includes(q) ||
        (x.customerMobile || '').toLowerCase().includes(q) ||
        (x.vehicleNo || '').toLowerCase().includes(q)
      );
    }
    // Overdue first, then by soonest due date
    return [...r].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Overdue' ? -1 : 1;
      return new Date(a.nextDue || 0) - new Date(b.nextDue || 0);
    });
  }, [rows, filter, search]);

  const totalRows  = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));
  const paged      = filtered.slice((page - 1) * limit, page * limit);
  useEffect(() => { setPage(1); }, [filter, search, limit]);

  const statusBadge = (status) => {
    if (status === 'Overdue') return 'bg-red-100 text-red-700';
    if (status === 'Upcoming') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-500';
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading font-bold text-gray-800 text-2xl flex items-center gap-2">
            <BellRing size={22} className="text-primary" /> Service Reminders
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Vehicles due for service by KM or time elapsed</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-600 border border-border px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center"><Clock size={18} className="text-white" /></div>
          <div><p className="text-xs text-gray-500 font-medium">Total Due</p><p className="font-heading font-bold text-xl text-gray-800">{summary.total || 0}</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center"><AlertTriangle size={18} className="text-white" /></div>
          <div><p className="text-xs text-gray-500 font-medium">Overdue</p><p className="font-heading font-bold text-xl text-red-600">{summary.overdue || 0}</p></div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center"><CheckCircle size={18} className="text-white" /></div>
          <div><p className="text-xs text-gray-500 font-medium">Upcoming</p><p className="font-heading font-bold text-xl text-amber-600">{summary.upcoming || 0}</p></div>
        </div>
      </div>

      {/* Filters + search */}
      <div className="card mb-4 flex gap-3 flex-wrap items-center">
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customer, mobile, vehicle no..."
          className="flex-1 min-w-48 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-border">
                {['Sr No', 'Status', 'Customer', 'Vehicle', 'Last Visit', 'Reminder', 'Next Due', 'Actions'].map((h, i) => (
                  <th key={h} className={`py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide ${i === 7 ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <BellRing size={40} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No reminders found</p>
                  <p className="text-gray-300 text-xs mt-1">Set Reminder KM / Period on a jobcard to see vehicles here</p>
                </td></tr>
              ) : paged.map((r, idx) => (
                <tr key={(page - 1) * limit + idx} className="border-b border-border hover:bg-gray-50 last:border-0">
                  <td className="py-3 px-4 text-gray-500 text-xs">{(page - 1) * limit + idx + 1}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(r.status)}`}>{r.status}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-800">{r.customerName || '—'}</div>
                    <div className="text-xs text-gray-400">{r.customerMobile || ''}</div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-xs">
                    {r.vehicleNo && <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-1">{r.vehicleNo}</span>}
                    {r.vehicleDesc}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{fmtDate(r.lastVisit)}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {[r.reminderKm && r.reminderKm !== 'No KM Reminder' ? r.reminderKm : null, r.reminderPeriod].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-700 text-xs font-medium">{fmtDate(r.nextDue)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => window.open(buildReminderWhatsappUrl(r, garage), '_blank')}
                        className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600" title="Send WhatsApp reminder">
                        <MessageCircle size={15} />
                      </button>
                      {r.customerMobile && (
                        <a href={`tel:${r.customerMobile}`}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500" title="Call customer">
                          <Phone size={15} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} pages={totalPages} total={totalRows} limit={limit} onPage={setPage} onLimit={setLimit} />
    </div>
  );
}
