import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useClients, useCreateClient, useInviteClient } from '../hooks/useClients';
import { useAuthStore } from '../../../store/auth.store';
import { usePageTitle } from '../../../shared/hooks/usePageTitle';
import { StaffTableSkeleton } from '../../../shared/components/Skeleton';
import type { UserDto, CreateClientDto, PortalInviteStatus } from '@dsx/shared';

const INVITE_LABELS: Record<PortalInviteStatus, string> = {
  not_invited: 'Not Invited',
  invited: 'Invited',
  active: 'Portal Active',
};

const INVITE_CLASSES: Record<PortalInviteStatus, string> = {
  not_invited: 'bg-slate-100 text-slate-600',
  invited: 'bg-amber-50 text-amber-700 border border-amber-100',
  active: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
};

function ClientRow({
  client,
  isAdmin,
  onInvite,
}: {
  client: UserDto;
  isAdmin: boolean;
  onInvite: (id: string) => void;
}) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-slate-900">{client.name}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{client.email ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{client.phone ?? '—'}</td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${INVITE_CLASSES[client.portalInviteStatus]}`}
        >
          {INVITE_LABELS[client.portalInviteStatus]}
        </span>
      </td>
      {isAdmin && (
        <td className="px-4 py-3 text-sm text-right">
          {client.portalInviteStatus === 'not_invited' && (
            <button
              onClick={() => onInvite(client.id)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Send Invite
            </button>
          )}
        </td>
      )}
    </tr>
  );
}

const INPUT_CLS =
  'block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

export function ClientsPage() {
  usePageTitle('Clients');
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [showForm, setShowForm] = useState(false);

  const { data: clients, isLoading, isError } = useClients();
  const { mutate: createClient, isPending: isCreating, error: createError } = useCreateClient();
  const { mutate: inviteClient } = useInviteClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateClientDto>();

  const onSubmit = (data: CreateClientDto) => {
    createClient(data, {
      onSuccess: () => {
        reset();
        setShowForm(false);
      },
    });
  };

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your firm's clients and their portal access.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add Client'}
          </button>
        )}
      </div>

      <div className="space-y-5">
        {isAdmin && showForm && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Add client</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Full name"
                    className={INPUT_CLS}
                    {...register('name', { required: 'Name is required' })}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="client@example.com"
                    className={INPUT_CLS}
                    {...register('email')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    placeholder="+91 98000 00000"
                    className={INPUT_CLS}
                    {...register('phone')}
                  />
                </div>
              </div>

              {createError && (
                <p className="text-sm text-red-600">Failed to add client. The email may already exist.</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isCreating ? 'Adding…' : 'Add Client'}
                </button>
                <button
                  type="button"
                  onClick={() => { reset(); setShowForm(false); }}
                  className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {isLoading && <StaffTableSkeleton />}

        {isError && (
          <div className="text-center py-12 text-red-500 text-sm">Failed to load clients. Please refresh.</div>
        )}

        {clients && clients.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">No clients yet. Add your first client above.</div>
        )}

        {clients && clients.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Portal</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => (
                  <ClientRow
                    key={client.id}
                    client={client}
                    isAdmin={isAdmin}
                    onInvite={inviteClient}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
