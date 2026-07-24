import { ChevronLeft, ChevronRight } from 'lucide-react';

// Build a compact page list: 1 … 4 5 [6] 7 8 … 20
function pageList(page, pages) {
  const out = [];
  const push = (v) => out.push(v);
  const window = 1; // pages on each side of current
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || (p >= page - window && p <= page + window)) {
      push(p);
    } else if (out[out.length - 1] !== '…') {
      push('…');
    }
  }
  return out;
}

/**
 * Reusable pagination bar.
 * Props: page, pages, total, limit, onPage(n), onLimit(n), pageSizes.
 */
export default function Pagination({ page, pages, total, limit, onPage, onLimit, pageSizes = [10, 20, 50, 100] }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const nums = pageList(page, pages);

  const btn = 'min-w-[34px] h-8 px-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      {/* Count + page size */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>Showing <b className="text-gray-700">{from}–{to}</b> of <b className="text-gray-700">{total}</b></span>
        {onLimit && (
          <label className="flex items-center gap-1.5">
            <span className="hidden sm:inline">Rows:</span>
            <select value={limit} onChange={e => onLimit(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30">
              {pageSizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        )}
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        <button className={`${btn} border-gray-300 text-gray-600 hover:bg-gray-50`} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={16} className="inline" />
        </button>
        {nums.map((n, i) => n === '…' ? (
          <span key={`e${i}`} className="px-1 text-gray-400 select-none">…</span>
        ) : (
          <button key={n} onClick={() => onPage(n)}
            className={`${btn} ${n === page ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {n}
          </button>
        ))}
        <button className={`${btn} border-gray-300 text-gray-600 hover:bg-gray-50`} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight size={16} className="inline" />
        </button>
      </div>
    </div>
  );
}
