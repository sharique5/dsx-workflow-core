import { useState, useRef, useEffect } from 'react';

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (id: string, name: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled,
  loading,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === value);

  const filtered = query.trim()
    ? options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(opt: Option) {
    onChange(opt.id, opt.name);
    setOpen(false);
    setQuery('');
  }

  const isDisabled = disabled || loading;
  const displayValue = open ? query : (selected?.name ?? '');

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); setQuery(''); }
          if (e.key === 'Enter' && filtered.length > 0) { e.preventDefault(); handleSelect(filtered[0]); }
        }}
        placeholder={placeholder}
        disabled={isDisabled}
        autoComplete="off"
        className={`block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-8 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white${isDisabled ? ' opacity-50 cursor-not-allowed' : ''}`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
        {loading ? (
          <svg className="animate-spin h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform${open ? ' rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
      {open && !loading && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-sm">
          {filtered.length === 0 ? (
            <li className="px-3.5 py-2.5 text-slate-400">No results</li>
          ) : (
            filtered.map((opt) => (
              <li
                key={opt.id}
                onMouseDown={() => handleSelect(opt)}
                className={`px-3.5 py-2.5 cursor-pointer select-none hover:bg-indigo-50 hover:text-indigo-700${
                  opt.id === value ? ' bg-indigo-50 text-indigo-700 font-medium' : ' text-slate-700'
                }`}
              >
                {opt.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
