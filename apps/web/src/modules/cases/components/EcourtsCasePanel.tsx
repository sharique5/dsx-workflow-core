import { RefreshCw, FileText } from 'lucide-react';
import { useEcourtsCaseForMatter, useRefreshEcourtsCase } from '../hooks/useEcourts';

interface EcourtsCasePanelProps {
  matterId: string;
}

function fmtDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

/** Shows the eCourts-synced case data for a matter. Renders nothing if unlinked. */
export function EcourtsCasePanel({ matterId }: EcourtsCasePanelProps) {
  const { data: courtCase, isLoading } = useEcourtsCaseForMatter(matterId);
  const { mutate: refresh, isPending: refreshing } = useRefreshEcourtsCase(matterId);

  if (isLoading || !courtCase) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">eCourts Case</h3>
          <p className="mt-0.5 font-mono text-xs text-slate-500">{courtCase.cnr}</p>
        </div>
        <button
          type="button"
          onClick={() => refresh(courtCase.id)}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 text-sm sm:grid-cols-3">
        <Field label="Status" value={courtCase.caseStatus ?? '—'} />
        <Field label="Type" value={courtCase.caseType ?? '—'} />
        <Field label="Next hearing" value={fmtDate(courtCase.nextHearingDate)} />
        <Field label="Filing no." value={courtCase.filingNumber ?? '—'} />
        <Field label="Registration no." value={courtCase.registrationNumber ?? '—'} />
        <Field label="Decision date" value={fmtDate(courtCase.decisionDate)} />
      </div>

      {(courtCase.petitioners.length > 0 || courtCase.respondents.length > 0) && (
        <div className="border-t border-slate-100 px-5 py-4 text-sm">
          <p className="text-slate-800">
            <span className="text-slate-500">Petitioner:</span>{' '}
            {courtCase.petitioners[0] ?? '—'}
          </p>
          <p className="mt-1 text-slate-800">
            <span className="text-slate-500">Respondent:</span>{' '}
            {courtCase.respondents[0] ?? '—'}
          </p>
        </div>
      )}

      {courtCase.orders.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Orders ({courtCase.orders.length})
          </p>
          <ul className="space-y-1.5">
            {courtCase.orders.map((o) => (
              <li key={o.id} className="flex items-center gap-2 text-sm text-slate-700">
                <FileText size={14} className="shrink-0 text-slate-400" />
                <span className="truncate">{o.orderType ?? o.filename}</span>
                <span className="ml-auto shrink-0 text-xs text-slate-400">
                  {fmtDate(o.orderDate)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-400">
        Last synced {fmtDate(courtCase.lastSyncedAt)}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 font-medium text-slate-800">{value}</p>
    </div>
  );
}
