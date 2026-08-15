import { useState } from 'react';
import { useEcourtsSearch } from '../hooks/useEcourts';
import { useStates, useDistricts } from '../hooks/useCourts';
import { SearchableSelect } from '../../../shared/components/SearchableSelect';
import type { EcourtsSearchItem, EcourtsSearchParams } from '../api/ecourts.api';

type SearchMode = 'party' | 'advocate';

interface EcourtsSearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: EcourtsSearchItem) => void;
}

const INPUT_CLS =
  'block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

export function EcourtsSearchModal({ open, onClose, onSelect }: EcourtsSearchModalProps) {
  const [mode, setMode] = useState<SearchMode>('party');
  const [text, setText] = useState('');
  const [courtCode, setCourtCode] = useState('');
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [includeDisposed, setIncludeDisposed] = useState(false);
  const [submitted, setSubmitted] = useState<EcourtsSearchParams | null>(null);

  const { data: states = [] } = useStates();
  const { data: districts = [] } = useDistricts(stateId);

  const { data, isFetching, error } = useEcourtsSearch(
    submitted ?? {},
    submitted !== null,
  );

  if (!open) return null;

  const runSearch = (nextPage = 1) => {
    const value = text.trim();
    if (!value) return;
    setSubmitted({
      ...(mode === 'party' ? { query: value } : { advocates: [value] }),
      ...(stateId ? { stateCode: stateId } : {}),
      ...(districtId ? { districtCode: districtId } : {}),
      ...(courtCode.trim() ? { courtCodes: [courtCode.trim()] } : {}),
      ...(includeDisposed ? {} : { caseStatuses: ['PENDING'] }),
      page: nextPage,
      pageSize: 20,
    });
  };

  const results = data?.results ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 py-10">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Search eCourts</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="flex gap-2">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as SearchMode)}
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="party">Party name</option>
              <option value="advocate">Advocate</option>
            </select>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runSearch(1);
                }
              }}
              placeholder={mode === 'party' ? 'e.g. Arun Jaitley' : 'e.g. Sharma'}
              className={INPUT_CLS}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SearchableSelect
              options={states}
              value={stateId}
              onChange={(id) => {
                setStateId(id);
                setDistrictId('');
              }}
              placeholder="State (optional)"
            />
            <SearchableSelect
              options={districts}
              value={districtId}
              onChange={(id) => setDistrictId(id)}
              placeholder={stateId ? 'District (optional)' : 'Select state first'}
              disabled={!stateId}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={courtCode}
              onChange={(e) => setCourtCode(e.target.value)}
              placeholder="Court code (optional, e.g. DLHC01)"
              className={INPUT_CLS}
            />
            <button
              type="button"
              onClick={() => runSearch(1)}
              disabled={!text.trim() || isFetching}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 whitespace-nowrap"
            >
              {isFetching ? 'Searching…' : 'Search'}
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={includeDisposed}
              onChange={(e) => setIncludeDisposed(e.target.checked)}
              className="rounded border-slate-300"
            />
            Include disposed cases
          </label>

          {error != null && (
            <p className="text-xs text-red-600">Search failed. Try a different term.</p>
          )}

          <div className="h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
            {submitted && !isFetching && results.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No cases found.</p>
            )}
            {results.map((item) => (
              <button
                key={item.cnr}
                type="button"
                onClick={() => onSelect(item)}
                className="block w-full px-4 py-3 text-left hover:bg-indigo-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium text-slate-800">
                    {(item.petitioners?.[0] ?? '—')} vs {(item.respondents?.[0] ?? '—')}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{item.caseStatus ?? ''}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono">{item.cnr}</span>
                  {item.caseType && <span>· {item.caseType}</span>}
                  {item.nextHearingDate && (
                    <span>· next {new Date(item.nextHearingDate).toLocaleDateString()}</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {data.page} of {data.totalPages} · {data.totalHits} results
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => runSearch(data.page - 1)}
                  disabled={!data.hasPreviousPage || isFetching}
                  className="rounded-md border border-slate-300 px-2.5 py-1 font-medium text-slate-600 enabled:hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => runSearch(data.page + 1)}
                  disabled={!data.hasNextPage || isFetching}
                  className="rounded-md border border-slate-300 px-2.5 py-1 font-medium text-slate-600 enabled:hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
