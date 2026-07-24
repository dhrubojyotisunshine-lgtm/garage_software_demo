import { Pencil, Trash2 } from 'lucide-react';

const COLUMNS = ['Sr No', 'Party Name', 'Phone', 'Amount', 'Type', 'Action'];

const fmtDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtAmount = (n) => (n === undefined || n === null || n === '' ? '-' : Number(n).toLocaleString('en-IN'));

export default function LedgerTable({ rows = [], loading, onEdit, onDelete, onParty }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {COLUMNS.map(h => (
              <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={COLUMNS.length} className="text-center py-12 text-gray-400">Loading…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={COLUMNS.length} className="text-center py-12 text-gray-400">No ledger entries found</td></tr>
          ) : rows.map((r, idx) => (
            <tr key={r._id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <td className="py-3 px-4 text-gray-500">{idx + 1}</td>
              <td className="py-3 px-4">
                <button onClick={() => onParty?.(r)}
                  className="font-medium text-gray-800 hover:text-primary underline underline-offset-2 text-left">
                  {r.partyName}
                </button>
              </td>
              <td className="py-3 px-4 text-gray-500">{r.partyPhone || '-'}</td>
              <td className="py-3 px-4 text-gray-700">{fmtAmount(r.amount)}</td>
              <td className="py-3 px-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.type === 'Credit' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>{r.type || '-'}</span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <button onClick={() => onEdit(r)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => onDelete(r._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
