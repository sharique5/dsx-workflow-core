import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalCases } from '../hooks/usePortalCases';

function formatStatusKey(key: string) {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function PortalCasesPage() {
  const { data: cases, isLoading } = usePortalCases();
  const navigate = useNavigate();

  // Auto-redirect if client has only one case
  useEffect(() => {
    if (cases && cases.length === 1) {
      navigate(`/cases/${cases[0].id}`, { replace: true });
    }
  }, [cases, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    );
  }

  if (!cases || cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <p className="text-gray-500 text-sm">No cases found.</p>
        <p className="text-gray-400 text-xs mt-1">
          Contact your lawyer if you believe this is an error.
        </p>
      </div>
    );
  }

  return (
    <main className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Your Cases</h1>
      <ul className="space-y-3">
        {cases.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => navigate(`/cases/${c.id}`)}
              className="w-full text-left rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-gray-900 text-sm">{c.title}</span>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    c.statusKey === 'closed'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {formatStatusKey(c.statusKey)}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{c.internalRef}</p>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
