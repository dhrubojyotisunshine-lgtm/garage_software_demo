import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { partyApi } from '../api/partyApi';
import { listItems } from '../utils/list';

const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white';

// Searchable picker of existing parties. Selecting one emits the full party
// object so the caller can store partyId / partyName / partyPhone.
export default function PartySelect({ selectedName, selectedPhone, onSelect }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [parties, setParties] = useState([]);
  const ref = useRef(null);

  // Refetch each time the dropdown opens so newly added parties show up.
  useEffect(() => {
    if (!open) return;
    partyApi.list({ all: 1 }).then(({ data }) => setParties(listItems(data))).catch(() => {});
  }, [open]);

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const filtered = parties.filter(p =>
    p.partyName.toLowerCase().includes(q.toLowerCase()) || (p.phone || '').includes(q)
  );

  const pick = (p) => { onSelect(p); setOpen(false); setQ(''); };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`${inputCls} flex items-center justify-between text-left`}>
        <span className={selectedName ? 'text-gray-800' : 'text-gray-400'}>
          {selectedName ? `${selectedName}${selectedPhone ? ` · ${selectedPhone}` : ''}` : 'Select a party'}
        </span>
        <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-hidden">
          <div className="relative p-2 border-b border-gray-100">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search party by name or phone"
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-400">
                No parties found. Use “Add Party” to create one.
              </div>
            ) : filtered.map(p => (
              <button key={p._id} type="button" onClick={() => pick(p)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between">
                <span className="font-medium text-gray-800">{p.partyName}</span>
                <span className="text-xs text-gray-400">{p.phone}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
