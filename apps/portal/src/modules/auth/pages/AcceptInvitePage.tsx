import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { usePortalAuthStore } from '../../../store/auth.store';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setUser = usePortalAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) return;

    const run = async () => {
      try {
        const { data } = await authApi.acceptInvite(token);
        setUser(data.user);
        navigate('/cases', { replace: true });
      } catch {
        setError(
          'This invite link is invalid or has already been used. Please contact your lawyer.',
        );
      }
    };

    void run();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-red-500">Invalid invite link. No token found.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm space-y-4">
          <p className="text-red-600 text-sm">{error}</p>
          <a
            href="/login"
            className="inline-block text-sm text-blue-600 hover:underline"
          >
            Go to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-400">Setting up your portal…</p>
    </div>
  );
}
