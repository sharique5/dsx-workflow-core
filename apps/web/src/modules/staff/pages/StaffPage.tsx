import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useStaff, useCreateStaff, useDeactivateStaff, useReactivateStaff } from '../hooks/useStaff';
import { useAuthStore } from '../../../store/auth.store';
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
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{member.name}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{member.email ?? '—'}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{member.phone ?? '—'}</td>
      <td className="px-4 py-3 text-sm">
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
          {ROLE_LABELS[member.role] ?? member.role}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            member.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'
          }`}
        >
          {member.isActive ? 'Active' : 'Inactive'}
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
                className="text-xs text-blue-500 hover:text-blue-700"
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
            Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="font-semibold text-lg">Team</h1>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancel' : '+ Add Member'}
          </button>
        )}
      </header>

      <main className="px-6 py-8 max-w-4xl mx-auto space-y-6">
        {/* Add staff form */}
        {isAdmin && showForm && (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-lg border bg-white p-6 shadow-sm space-y-4"
          >
            <h2 className="font-medium text-gray-900">Add team member</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Full name"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  {...register('name', { required: 'Name is required' })}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="staff@firm.com"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  {...register('email', { required: 'Email is required' })}
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  placeholder="+91 98000 00000"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  {...register('phone')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
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
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isCreating ? 'Adding…' : 'Add Member'}
              </button>
              <button
                type="button"
                onClick={() => { reset(); setShowForm(false); }}
                className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Staff table */}
        {isLoading && (
          <div className="text-center py-12 text-gray-400 text-sm">Loading team…</div>
        )}

        {isError && (
          <div className="text-center py-12 text-red-500 text-sm">
            Failed to load team. Please refresh.
          </div>
        )}

        {staff && staff.length > 0 && (
          <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-gray-50 text-xs font-semibold uppercase text-gray-500 tracking-wider">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  {isAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
      </main>
    </div>
  );
}
