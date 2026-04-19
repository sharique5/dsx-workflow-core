import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth.store';
import { useVocabulary } from '../../../shared/hooks/useVocabulary';

function StatCard({
  icon,
  label,
  to,
  description,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  to: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
    >
      <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${color}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
          {label}
        </h3>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
      <div className="mt-auto flex items-center gap-1 text-xs font-medium text-indigo-600">
        Open
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const vocab = useVocabulary();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here's what you can do today.</p>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          to="/cases"
          icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
            </svg>
          }
          label={vocab.matter_plural}
          description={`View and manage all ${vocab.matter_plural.toLowerCase()}`}
          color="bg-indigo-50"
        />
        <StatCard
          to="/cases/new"
          icon={
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0891b2" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
          label={`New ${vocab.matter_label}`}
          description={`Open a new ${vocab.matter_label.toLowerCase()} file`}
          color="bg-cyan-50"
        />
        {user?.role === 'admin' && (
          <StatCard
            to="/staff"
            icon={
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            label="Team"
            description="Manage staff and admin accounts"
            color="bg-emerald-50"
          />
        )}
      </div>
    </div>
  );
}

