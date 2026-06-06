import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useStaff, useCreateStaff, useDeactivateStaff, useReactivateStaff } from '../hooks/useStaff';
import { useAuthStore } from '../../../store/auth.store';
import { usePageTitle } from '../../../shared/hooks/usePageTitle';
import { StaffTableSkeleton } from '../../../shared/components/Skeleton';
import type { UserDto, CreateStaffDto } from '@dsx/shared';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  staff: 'Staff',
  client: 'Client',
};

function StaffRow({
  member,
  currentUserId,
  isAdmin,
  onDeactivate,
  onReactivate,
}: {
  member: UserDto;
  currentUserId: string | undefined;
  isAdmin: boolean;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
}) {
  const isSelf = member.id === currentUserId;

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-slate-900">{member.name}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{member.email ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-slate-500">{member.phone ?? '—'}</td>
      <td className="px-4 py-3 text-sm">
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700">
          {ROLE_LABELS[member.role] ?? member.role}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            member.isActive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              : 'bg-red-50 text-red-500 border border-red-100'
          }`}
        >
          {member.isActive ? (
            <><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />Active</>
          ) : 'Inactive'}
        </span>
      </td>
      {isAdmin && (
        <td className="px-4 py-3 text-sm text-right">
          {!isSelf && (
            member.isActive ? (
              <button
                onClick={() => {
                  if (confirm(`Deactivate ${member.name}? They will no longer be able to log in.`)) {
                    onDeactivate(member.id);
                  }
                }}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Deactivate
              </button>
            ) : (
              <button
                onClick={() => onReactivate(member.id)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Reactivate
              </button>
            )
          )}
        </td>
      )}
    </tr>
  );
}

export function StaffPage() {
  usePageTitle('Team');
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [showForm, setShowForm] = useState(false);

  const { data: staff, isLoading, isError } = useStaff();
  const { mutate: createStaff, isPending: isCreating, error: createError } = useCreateStaff();
  const { mutate: deactivate } = useDeactivateStaff();
  const { mutate: reactivate } = useReactivateStaff();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateStaffDto>({
    defaultValues: { role: 'staff' },
  });

  const onSubmit = (data: CreateStaffDto) => {
    createStaff(data, {
      onSuccess: () => {
        reset();
        setShowForm(false);
      },
    });
  };

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your firm's staff members and access levels.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add Member'}
          </button>
        )}
      </div>

      <div className="space-y-5">
        {/* Add staff form */}
        {isAdmin && showForm && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Add team member</h2>
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
                  className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="staff@firm.com"
                  className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  {...register('email', { required: 'Email is required' })}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98000 00000"
                  className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  {...register('phone')}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  {...register('role', { required: true })}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {createError && (
              <p className="text-sm text-red-600">
                Failed to add member. The email may already exist.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isCreating ? 'Adding…' : 'Add Member'}
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

        {/* Staff table */}
        {isLoading && <StaffTableSkeleton />}

        {isError && (
          <div className="text-center py-12 text-red-500 text-sm">
            Failed to load team. Please refresh.
          </div>
        )}

        {!isLoading && !isError && staff && staff.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No team members yet. Invite your first staff member above.
          </div>
        )}

        {staff && staff.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((member) => (
                  <StaffRow
                    key={member.id}
                    member={member}
                    currentUserId={user?.id}
                    isAdmin={isAdmin}
                    onDeactivate={deactivate}
                    onReactivate={reactivate}
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
