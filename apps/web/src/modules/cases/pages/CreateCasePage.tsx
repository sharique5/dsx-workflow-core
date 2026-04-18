import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useCreateMatter } from '../hooks/useMatters';
import { useClients, useCreateClient } from '../../clients/hooks/useClients';
import { useVocabulary } from '../../../shared/hooks/useVocabulary';
import type { CreateMatterDto, CreateClientDto } from '@dsx/shared';

const INPUT_CLS =
  'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black';

export function CreateCasePage() {
  const vocab = useVocabulary();
  const { mutate: createMatter, isPending, error } = useCreateMatter();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { mutate: createClient, isPending: creatingClient } = useCreateClient();

  // Controls inline new-client mini-form
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientError, setNewClientError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMatterDto>({
    defaultValues: { statusKey: vocab.statuses[0]?.key ?? 'filed' },
  });

  const selectedParticipantId = watch('participantId');

  // Separate form state for the inline new-client form
  const {
    register: registerClient,
    handleSubmit: handleClientSubmit,
    reset: resetClientForm,
    formState: { errors: clientErrors },
  } = useForm<CreateClientDto>();

  const onSubmit = (data: CreateMatterDto) => {
    createMatter(data);
  };

  const onCreateClient = (data: CreateClientDto) => {
    setNewClientError(null);
    createClient(data, {
      onSuccess: (created) => {
        setValue('participantId', created.id);
        setShowNewClient(false);
        resetClientForm();
      },
      onError: () => {
        setNewClientError('Failed to create client. Check details and try again.');
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4 flex items-center gap-3">
        <Link to="/cases" className="text-sm text-gray-400 hover:text-gray-600">
          {vocab.matter_plural}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="font-semibold text-lg">New {vocab.matter_label}</h1>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border bg-white p-6 shadow-sm space-y-5">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Smith vs State"
              className={INPUT_CLS}
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          {/* Internal Ref + External Ref */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Internal Ref <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. NA-2024-001"
                className={INPUT_CLS}
                {...register('internalRef', { required: 'Internal ref is required' })}
              />
              {errors.internalRef && (
                <p className="mt-1 text-xs text-red-500">{errors.internalRef.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">External Ref</label>
              <input
                type="text"
                placeholder="Court case number"
                className={INPUT_CLS}
                {...register('externalRef')}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              className={INPUT_CLS}
              {...register('statusKey', { required: 'Status is required' })}
            >
              {vocab.statuses.map((s) => (
                <option key={s.key} value={s.key} disabled={s.isTerminal}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Client picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {vocab.participant_label} <span className="text-red-500">*</span>
            </label>

            <div className="flex gap-2 mt-1">
              <select
                className={`${INPUT_CLS} mt-0 flex-1`}
                value={selectedParticipantId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__new__') {
                    setShowNewClient(true);
                    setValue('participantId', undefined);
                  } else {
                    setShowNewClient(false);
                    setValue('participantId', val || undefined);
                  }
                }}
                disabled={clientsLoading}
              >
                <option value="">
                  {clientsLoading ? 'Loading…' : `Select ${vocab.participant_label}`}
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.email ? ` — ${c.email}` : ''}
                    {c.phone ? ` — ${c.phone}` : ''}
                  </option>
                ))}
                <option value="__new__">+ Add new {vocab.participant_label}</option>
              </select>
            </div>

            {/* Hidden input to register participantId with react-hook-form validation */}
            <input
              type="hidden"
              {...register('participantId', {
                required: `${vocab.participant_label} is required`,
              })}
            />
            {errors.participantId && (
              <p className="mt-1 text-xs text-red-500">{errors.participantId.message}</p>
            )}

            {/* Inline new-client mini-form */}
            {showNewClient && (
              <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-4 space-y-3">
                <p className="text-sm font-medium text-blue-800">
                  New {vocab.participant_label}
                </p>

                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Full name"
                    className={INPUT_CLS}
                    {...registerClient('name', { required: 'Name is required' })}
                  />
                  {clientErrors.name && (
                    <p className="mt-1 text-xs text-red-500">{clientErrors.name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      placeholder="client@example.com"
                      className={INPUT_CLS}
                      {...registerClient('email')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      className={INPUT_CLS}
                      {...registerClient('phone')}
                    />
                  </div>
                </div>

                {newClientError && (
                  <p className="text-xs text-red-600">{newClientError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={creatingClient}
                    onClick={handleClientSubmit(onCreateClient)}
                    className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {creatingClient ? 'Saving…' : 'Save Client'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewClient(false);
                      resetClientForm();
                      setNewClientError(null);
                    }}
                    className="rounded-md border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600">
              Failed to create {vocab.matter_label.toLowerCase()}. Please try again.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending || showNewClient}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creating…' : `Create ${vocab.matter_label}`}
            </button>
            <Link
              to="/cases"
              className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
