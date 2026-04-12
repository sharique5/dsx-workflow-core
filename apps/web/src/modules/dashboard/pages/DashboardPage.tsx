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

      <main className="px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {vocab.matter_plural}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.name}. {vocab.matter_plural} will appear here.
        </p>
      </main>
    </div>
  );
}
