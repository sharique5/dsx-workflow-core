import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateMatter } from '../hooks/useMatters';
import { useClients, useCreateClient } from '../../clients/hooks/useClients';
import { useVocabulary } from '../../../shared/hooks/useVocabulary';
import type { CreateMatterDto, CreateClientDto } from '@dsx/shared';
import { parseCnr } from '../utils/cnr';
import { useStates, useDistricts, useComplexes } from '../hooks/useCourts';

const createMatterSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  internalRef: z
    .string()
    .min(1, 'Internal ref is required')
    .max(50, 'Ref too long')
    .regex(/^[A-Za-z0-9\-\/]+$/, 'Only letters, numbers, hyphens and slashes allowed'),
  externalRef: z.string().max(50, 'Ref too long').optional(),
  participantId: z.string().min(1, 'Please select a client'),
  statusKey: z.string().min(1, 'Status is required'),
});

const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().optional(),
  phone: z.string().max(20).optional(),
});

type CreateMatterForm = z.infer<typeof createMatterSchema>;
type CreateClientForm = z.infer<typeof createClientSchema>;

interface CourtDetails {
  cnr: string;
  state: string;
  district: string;
  courtComplex: string;
  judge: string;
  stage: string;
}

const EMPTY_COURT: CourtDetails = { cnr: '', state: '', district: '', courtComplex: '', judge: '', stage: '' };

const INPUT_CLS =
  'block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';
const LABEL_CLS = 'block text-sm font-medium text-slate-700 mb-1.5';

export function CreateCasePage() {
  const vocab = useVocabulary();
  const { mutate: createMatter, isPending, error } = useCreateMatter();
  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const { mutate: createClient, isPending: creatingClient } = useCreateClient();

  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientError, setNewClientError] = useState<string | null>(null);
  const [cnrInput, setCnrInput] = useState('');
  const [cnrHint, setCnrHint] = useState<{ ok: boolean; text: string } | null>(null);
  const [courtDetails, setCourtDetails] = useState<CourtDetails>(EMPTY_COURT);
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const { data: states = [], isLoading: statesLoading } = useStates();
  const { data: districts = [], isLoading: districtsLoading } = useDistricts(selectedStateId);
  const { data: complexes = [], isLoading: complexesLoading } = useComplexes(selectedStateId, selectedDistrictId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMatterForm>({
    resolver: zodResolver(createMatterSchema),
    defaultValues: { statusKey: vocab.statuses[0]?.key ?? 'filed' },
  });

  const selectedParticipantId = watch('participantId');

  const {
    register: registerClient,
    handleSubmit: handleClientSubmit,
    reset: resetClientForm,
    formState: { errors: clientErrors },
  } = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema),
  });

  const handleCnrAutofill = () => {
    const info = parseCnr(cnrInput);
    if (!info) {
      setCnrHint({ ok: false, text: 'Could not recognise this CNR — please fill court details manually.' });
      return;
    }
    const matchedState = states.find((s) => s.name === info.state);
    if (matchedState) {
      setSelectedStateId(matchedState.id);
      setSelectedDistrictId('');
    }
    setCourtDetails((prev) => ({
      ...prev,
      cnr: info.cnr,
      state: info.state,
      district: matchedState ? '' : prev.district,
      courtComplex: '',
    }));
    const label = info.bench
      ? `${info.state} — ${info.bench} Bench (${info.year})`
      : `${info.state} (${info.year})`;
    setCnrHint({ ok: true, text: `Auto-filled: ${label}. Select district and court complex below.` });
  };

  const onSubmit = (data: CreateMatterForm) => {
    const metadata: Record<string, string> = {};
    for (const [k, v] of Object.entries(courtDetails)) {
      if (v.trim()) metadata[k] = v.trim();
    }
    createMatter({
      ...data,
      ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    } as CreateMatterDto);
  };

  const onCreateClient = (data: CreateClientForm) => {
    setNewClientError(null);
    createClient(data as CreateClientDto, {
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
    <div className="px-6 py-8 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm text-slate-500">
        <Link to="/cases" className="hover:text-indigo-600 transition-colors">
          {vocab.matter_plural}
        </Link>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-800 font-medium">New {vocab.matter_label}</span>
      </div>

      {/* eCourts lookup tip */}
      <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-4">
        <div className="flex items-start gap-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4f46e5"
            strokeWidth={2}
            className="mt-0.5 shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-indigo-900">
              Looking up an existing court case?{' '}
              <a
                href="https://services.ecourts.gov.in/ecourtindia_v6/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-indigo-700"
              >
                Open eCourts →
              </a>
            </p>
            <p className="mt-1 text-xs text-indigo-700">
              Search by CNR, case number, or party name. Then copy the CNR and paste it below to
              auto-fill court details.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={cnrInput}
                onChange={(e) => {
                  setCnrInput(e.target.value);
                  setCnrHint(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCnrAutofill();
                  }
                }}
                placeholder="Paste CNR number (e.g. MPHC020312152025)"
                className="block flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={handleCnrAutofill}
                disabled={!cnrInput.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                Auto-fill
              </button>
            </div>
            {cnrHint && (
              <p className={`mt-1.5 text-xs ${cnrHint.ok ? 'text-indigo-700' : 'text-red-600'}`}>
                {cnrHint.ok ? '✓ ' : ''}{cnrHint.text}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <h1 className="text-lg font-semibold text-slate-900">New {vocab.matter_label}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Fill in the details to open a new {vocab.matter_label.toLowerCase()} file.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-6 space-y-5">
          {/* Title */}
          <div>
            <label className={LABEL_CLS}>
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Smith vs State of MP"
              className={INPUT_CLS}
              {...register('title')}
            />
            {errors.title && <p className="mt-1.5 text-xs text-red-500">{errors.title.message}</p>}
          </div>

          {/* Internal Ref + External Ref (court case number) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>
                Internal Ref <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. NA-2024-001"
                className={INPUT_CLS}
                {...register('internalRef')}
              />
              {errors.internalRef && (
                <p className="mt-1.5 text-xs text-red-500">{errors.internalRef.message}</p>
              )}
            </div>
            <div>
              <label className={LABEL_CLS}>Court Case No.</label>
              <input
                type="text"
                placeholder="e.g. AC-83-2025"
                className={INPUT_CLS}
                {...register('externalRef')}
              />
              <p className="mt-1 text-xs text-slate-400">Case type + number + year</p>
            </div>
          </div>

          {/* Court Details */}
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Court Details
            </p>
            {/* State + District cascade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>State</label>
                <select
                  className={INPUT_CLS}
                  value={selectedStateId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const name = states.find((s) => s.id === id)?.name ?? '';
                    setSelectedStateId(id);
                    setSelectedDistrictId('');
                    setCourtDetails((p) => ({ ...p, state: name, district: '', courtComplex: '' }));
                  }}
                  disabled={statesLoading}
                >
                  <option value="">{statesLoading ? 'Loading…' : 'Select state'}</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>District</label>
                <select
                  className={INPUT_CLS}
                  value={selectedDistrictId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const name = districts.find((d) => d.id === id)?.name ?? '';
                    setSelectedDistrictId(id);
                    setCourtDetails((p) => ({ ...p, district: name, courtComplex: '' }));
                  }}
                  disabled={!selectedStateId || districtsLoading}
                >
                  <option value="">
                    {!selectedStateId ? 'Select state first' : districtsLoading ? 'Loading…' : 'Select district'}
                  </option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {/* Court Complex */}
            <div>
              <label className={LABEL_CLS}>Court Complex</label>
              <select
                className={INPUT_CLS}
                value={courtDetails.courtComplex}
                onChange={(e) => setCourtDetails((p) => ({ ...p, courtComplex: e.target.value }))}
                disabled={!selectedDistrictId || complexesLoading}
              >
                <option value="">
                  {!selectedDistrictId ? 'Select district first' : complexesLoading ? 'Loading…' : 'Select court complex'}
                </option>
                {complexes.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            {/* CNR + Judge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>CNR Number</label>
                <input
                  type="text"
                  value={courtDetails.cnr}
                  onChange={(e) => setCourtDetails((p) => ({ ...p, cnr: e.target.value }))}
                  placeholder="e.g. MPHC020312152025"
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Judge</label>
                <input
                  type="text"
                  value={courtDetails.judge}
                  onChange={(e) => setCourtDetails((p) => ({ ...p, judge: e.target.value }))}
                  placeholder="Hon. Justice ..."
                  className={INPUT_CLS}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Stage</label>
              <input
                type="text"
                value={courtDetails.stage}
                onChange={(e) => setCourtDetails((p) => ({ ...p, stage: e.target.value }))}
                placeholder="e.g. Arguments, Final Hearing, Evidence"
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={LABEL_CLS}>
              Status <span className="text-red-500">*</span>
            </label>
            <select className={INPUT_CLS} {...register('statusKey')}>
              {vocab.statuses.map((s) => (
                <option key={s.key} value={s.key} disabled={s.isTerminal}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Client picker */}
          <div>
            <label className={LABEL_CLS}>
              {vocab.participant_label} <span className="text-red-500">*</span>
            </label>
            <select
              className={INPUT_CLS}
              value={selectedParticipantId ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__new__') {
                  setShowNewClient(true);
                  setValue('participantId', '');
                } else {
                  setShowNewClient(false);
                  setValue('participantId', val);
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
            <input type="hidden" {...register('participantId')} />
            {errors.participantId && (
              <p className="mt-1.5 text-xs text-red-500">{errors.participantId.message}</p>
            )}

            {/* Inline new-client mini-form */}
            {showNewClient && (
              <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-indigo-800">
                  New {vocab.participant_label}
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Full name"
                    className={INPUT_CLS}
                    {...registerClient('name')}
                  />
                  {clientErrors.name && (
                    <p className="mt-1 text-xs text-red-500">{clientErrors.name.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="client@example.com"
                      className={INPUT_CLS}
                      {...registerClient('email')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      className={INPUT_CLS}
                      {...registerClient('phone')}
                    />
                  </div>
                </div>
                {newClientError && <p className="text-xs text-red-600">{newClientError}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={creatingClient}
                    onClick={handleClientSubmit(onCreateClient)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
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
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              <p className="text-sm text-red-600">
                Failed to create {vocab.matter_label.toLowerCase()}. Please try again.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={isPending || showNewClient}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Creating…' : `Create ${vocab.matter_label}`}
            </button>
            <Link
              to="/cases"
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
