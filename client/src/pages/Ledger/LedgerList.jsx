import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Pencil, Trash2 } from 'lucide-react';
import { partyApi } from '../../api/partyApi';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../utils/format';
import PartyModal from '../../components/PartyModal';
import Pagination from '../../components/ui/Pagination';
import { listItems, listTotal, listPages } from '../../utils/list';

const COLUMNS = ['Sr No', 'Party Name', 'Phone', 'Total Debit', 'Total Credit', 'Balance', 'Action'];

export default function LedgerList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | { item? }
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await partyApi.list({ page, limit, search: search || undefined });
      setRows(listItems(data));
      setTotal(listTotal(data));
      setPages(listPages(data));
    } catch { toast({ title: 'Failed to load parties', variant: 'error' }); }
    finally { setLoading(false); }
  }, [page, limit, search]);

  useEffect(() => { setPage(1); }, [search, limit]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Delete this party? Its ledger entries will remain but become unlinked.')) return;
    try {
      await partyApi.delete(id);
      toast({ title: 'Deleted', variant: 'success' });
      load();
    } catch { toast({ title: 'Delete failed', variant: 'error' }); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-heading font-bold text-gray-800 text-2xl">Ledger</h1>
        <button onClick={() => setModal({})}
          className="px-4 py-2 border border-red-500 text-red-500 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
          Add Party
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-lg">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search Party By Name or Phone"
          className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
      </div>

      {/* Party table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {COLUMNS.map((h, i) => (
                <th key={h} className={`py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${i >= 3 && i <= 5 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={COLUMNS.length} className="text-center py-12 text-gray-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={COLUMNS.length} className="text-center py-12 text-gray-400">No parties found. Use “Add Party” to create one.</td></tr>
            ) : rows.map((r, idx) => (
              <tr key={r._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/ledger/party-id/${r._id}`)}>
                <td className="py-3 px-4 text-gray-500">{(page - 1) * limit + idx + 1}</td>
                <td className="py-3 px-4 font-medium text-gray-800 underline underline-offset-2 hover:text-primary">{r.partyName}</td>
                <td className="py-3 px-4 text-gray-500">{r.phone || '-'}</td>
                <td className="py-3 px-4 text-right text-green-700">{formatCurrency(r.totalDebit || 0)}</td>
                <td className="py-3 px-4 text-right text-purple-700">{formatCurrency(r.totalCredit || 0)}</td>
                <td className="py-3 px-4 text-right font-semibold text-gray-800">{formatCurrency(r.balance || 0)}</td>
                <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModal({ item: r })} title="Edit Party" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={(e) => handleDelete(e, r._id)} title="Delete Party" className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600">
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

      {modal && (
        <PartyModal
          item={modal.item}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
