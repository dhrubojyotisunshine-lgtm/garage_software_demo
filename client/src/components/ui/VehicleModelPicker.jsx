import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export default function VehicleModelPicker({ makes = [], models = [], makeId, makeName, modelId, modelName, onChange, className = '' }) {
  const display = [makeName, modelName].filter(Boolean).join(' ');
  const [query, setQuery] = useState(display);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Sync display when parent clears the value
  useEffect(() => {
    const d = [makeName, modelName].filter(Boolean).join(' ');
    setQuery(d);
  }, [makeName, modelName]);

  const options = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results = [];
    models.forEach(m => {
      const mName = m.makeName || makes.find(mk => mk._id === m.makeId)?.name || '';
      const full = `${mName} ${m.name}`.toLowerCase();
      if (full.includes(q) || mName.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)) {
        results.push({ makeId: m.makeId, makeName: mName, modelId: m._id, modelName: m.name, label: `${mName} ${m.name}`.trim() });
      }
    });
    return results.slice(0, 12);
  }, [query, makes, models]);

  useEffect(() => {
    const h = e => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const select = (opt) => {
    setQuery(opt.label);
    setOpen(false);
    onChange({ makeId: opt.makeId, makeName: opt.makeName, modelId: opt.modelId, modelName: opt.modelName });
  };

  const clear = () => {
    setQuery('');
    onChange({ makeId: '', makeName: '', modelId: '', modelName: '' });
  };

  const inputCls = `w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white pl-8 pr-8 ${className}`;

  return (
    <div ref={containerRef} className="relative">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange({ makeId: '', makeName: '', modelId: '', modelName: '' }); }}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder="Search brand & model..."
        className={inputCls}
        autoComplete="off"
      />
      {query && (
        <button onClick={clear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
          <X size={13} />
        </button>
      )}
      {open && options.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg z-30 max-h-52 overflow-y-auto">
          {options.map((opt, i) => (
            <button
              key={i}
              onMouseDown={e => { e.preventDefault(); select(opt); }}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-border last:border-0 text-sm"
            >
              <span className="font-medium text-gray-800">{opt.makeName}</span>
              {opt.modelName && <span className="text-gray-500"> {opt.modelName}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
