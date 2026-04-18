import { Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/auth.store';
import { useVocabulary } from '../../../shared/hooks/useVocabulary';
import { useLogout } from '../../auth/hooks/useAuth';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const vocab = useVocabulary();
  const { mutate: logout } = useLogout();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <h1 className="font-semibold text-lg">DSX Workflow</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button
            onClick={() => logout()}
            className="text-sm text-gray-500 hover:text-gray-800 underline"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="px-6 py-8 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name}
        </h2>
        <p className="mt-1 text-sm text-gray-500">What would you like to do today?</p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/cases"
            className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow group"
          >
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
              {vocab.matter_plural}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              View and manage all {vocab.matter_plural.toLowerCase()}
            </p>
          </Link>

          {user?.role === 'admin' && (
            <Link
              to="/staff"
              className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow group"
            >
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">Team</h3>
              <p className="mt-1 text-sm text-gray-500">Manage staff and admin accounts</p>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
