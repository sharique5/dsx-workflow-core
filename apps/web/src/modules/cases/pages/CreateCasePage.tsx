import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { usePageTitle } from '../../../shared/hooks/usePageTitle';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateMatter } from '../hooks/useMatters';
import { useAllClients, useCreateClient } from '../../clients/hooks/useClients';
import { useStaff } from '../../staff/hooks/useStaff';
import { useAuthStore } from '../../../store/auth.store';
import { useVocabulary } from '../../../shared/hooks/useVocabulary';
import type { CreateMatterDto, CreateClientDto } from '@dsx/shared';
import { parseCnr } from '../utils/cnr';
import { useStates, useDistricts, useComplexes } from '../hooks/useCourts';
import { isAxiosError } from 'axios';
import { useEcourtsLookup, useLinkEcourtsCase, useQueueEcourtsRefresh, useEcourtsCaseTypes } from '../hooks/useEcourts';
import { EcourtsSearchModal } from '../components/EcourtsSearchModal';
import type { EcourtsCaseData, EcourtsSearchItem } from '../api/ecourts.api';
import { SearchableSelect } from '../../../shared/components/SearchableSelect';

const createMatterSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  internalRef: z
    .string()
    .min(1, 'Internal ref is required')
    .max(50, 'Ref too long')
    .regex(/^[A-Za-z0-9\-/]+$/, 'Only letters, numbers, hyphens and slashes allowed'),
  externalRef: z.string().min(1, 'Court case no. is required').max(50, 'Ref too long'),
  participantId: z.string().min(1, 'Please select a client'),
  statusKey: z.string().min(1, 'Status is required'),
});

const createClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Enter a valid email').min(1, 'Email is required'),
  phone: z.string().max(20).optional(),
});

type CreateMatterForm = z.infer<typeof createMatterSchema>;
type CreateClientForm = z.infer<typeof createClientSchema>;

interface CourtDetails {
  cnr: string;
  caseType: string;
  state: string;
  district: string;
  courtComplex: string;
  judge: string;
  stage: string;
}

const EMPTY_COURT: CourtDetails = { cnr: '', caseType: '', state: '', district: '', courtComplex: '', judge: '', stage: '' };

/** Fallback case types when the eCourts enum isn't available (non-legal tenants / offline). */
const FALLBACK_CASE_TYPES = ['Civil', 'Criminal', 'FIR', 'Writ', 'Execution', 'Misc'].map(
  (x) => ({ id: x, name: x }),
);

/** Build a meaningful case title, handling masked/protected party names. */
function buildCaseTitle(c: EcourtsCaseData): string {
  const clean = (s?: string) => (s ?? '').trim();
  const isPlaceholder = (s: string) =>
    !s || /^[-–—.\s]*$/.test(s) || /^(n\.?\/?a\.?|nil|none)$/i.test(s);
  const isMasked = (s: string) => !s || /^x+$/i.test(s.replace(/[\s.]/g, ''));
  const pet = clean(c.petitioners?.[0]);
  const resp = clean(c.respondents?.[0]);
  const advRaw = clean(c.petitionerAdvocates?.[0]) || clean(c.respondentAdvocates?.[0]);
  const adv = isPlaceholder(advRaw) ? '' : advRaw;
  const caseNo = clean(c.caseNumber) || clean(c.registrationNumber) || clean(c.filingNumber);

  if (pet && resp && !isMasked(pet) && !isMasked(resp)) {
    return adv ? `${pet} vs ${resp} (Adv. ${adv})` : `${pet} vs ${resp}`;
  }
  // Protected/masked parties — build a distinguishable label instead of "XXXX vs XXXX".
  const label = clean(c.caseTypeRaw) || clean(c.caseType) || 'Case';
  const bits = [label, caseNo].filter(Boolean).join(' ');
  if (adv) return bits ? `${bits} — Adv. ${adv}` : `Adv. ${adv}`;
  return bits || `${pet || 'Petitioner'} vs ${resp || 'Respondent'}`;
}

/** Map an eCourts case status onto the tenant's internal status keys (when present). */
function mapStatusKey(
  caseStatus: string | undefined,
  hasNextHearing: boolean,
  statuses: { key: string }[],
): string | undefined {
  const s = (caseStatus ?? '').toUpperCase();
  const has = (k: string) => statuses.some((x) => x.key === k);
  if (!s) return undefined;
  if (s === 'DISPOSED') return has('closed') ? 'closed' : undefined;
  if (['PENDING', 'LISTED', 'HEARING', 'FIRST_HEARING', 'PART_HEARD'].includes(s)) {
    if (hasNextHearing && has('hearing_scheduled')) return 'hearing_scheduled';
    if (has('in_progress')) return 'in_progress';
    return undefined;
  }
  if (['FILED', 'REGISTERED', 'READY_FOR_REGISTRATION', 'DEFECTIVE', 'UNKNOWN'].includes(s)) {
    return has('filed') ? 'filed' : undefined;
  }
  return undefined;
}

const INPUT_CLS =
  'block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';
const LABEL_CLS = 'block text-sm font-medium text-slate-700 mb-1.5';


export function CreateCasePage() {
  usePageTitle('New Case');
  const vocab = useVocabulary();
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';
  const { mutate: createMatter, isPending, error } = useCreateMatter();
  const { data: clients = [], isLoading: clientsLoading } = useAllClients();
  const { data: staffList = [] } = useStaff();
  const { mutate: createClient, isPending: creatingClient } = useCreateClient();
  const { mutate: lookupCnr, isPending: lookingUp } = useEcourtsLookup();
  const { mutate: linkEcourtsCase } = useLinkEcourtsCase();
  const { mutate: queueRefresh, isPending: queuing } = useQueueEcourtsRefresh();
  const ecourtsEnabled = vocab.features?.ecourts === true;

  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientError, setNewClientError] = useState<string | null>(null);
  const [assignedToId, setAssignedToId] = useState('');
  const [cnrInput, setCnrInput] = useState('');
  const [cnrHint, setCnrHint] = useState<{ ok: boolean; text: string } | null>(null);
  const [showEcourtsSearch, setShowEcourtsSearch] = useState(false);
  const [notFoundCnr, setNotFoundCnr] = useState<string | null>(null);
  const [ecourtsInfo, setEcourtsInfo] = useState<Record<string, string> | null>(null);
  const [pendingMap, setPendingMap] = useState<{ districtCode?: string; complexName?: string } | null>(null);
  const [courtDetails, setCourtDetails] = useState<CourtDetails>(EMPTY_COURT);
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedComplexId, setSelectedComplexId] = useState('');
  const { data: states = [], isLoading: statesLoading } = useStates();
  const { data: districts = [], isLoading: districtsLoading } = useDistricts(selectedStateId);
  const { data: complexes = [], isLoading: complexesLoading } = useComplexes(selectedStateId, selectedDistrictId);
  const { data: caseTypes = [], isLoading: caseTypesLoading } = useEcourtsCaseTypes(ecourtsEnabled);
  const caseTypeOptions = caseTypes.length
    ? caseTypes.map((t) => ({ id: t.code, name: t.description }))
    : FALLBACK_CASE_TYPES;

  const [defaultInternalRef] = useState(
    () => `NA-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateMatterForm>({
    resolver: zodResolver(createMatterSchema),
    defaultValues: {
      statusKey: vocab.statuses[0]?.key ?? 'filed',
      internalRef: defaultInternalRef,
    },
  });

  const selectedParticipantId = useWatch({ control, name: 'participantId' });

  const {
    register: registerClient,
    handleSubmit: handleClientSubmit,
    reset: resetClientForm,
    formState: { errors: clientErrors },
  } = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema),
  });

  // Resolve eCourts district code into the district dropdown once options load.
  useEffect(() => {
    if (!pendingMap?.districtCode || districts.length === 0) return;
    const d = districts.find((x) => x.id === pendingMap.districtCode);
    if (d) {
      setSelectedDistrictId(d.id);
      setCourtDetails((p) => ({ ...p, district: d.name }));
    }
    setPendingMap((m) => (m ? { complexName: m.complexName } : null));
  }, [districts, pendingMap]);

  // Best-effort match of the eCourts court name to a complex once options load.
  useEffect(() => {
    if (!pendingMap || pendingMap.districtCode || !pendingMap.complexName || complexes.length === 0) {
      return;
    }
    const target = pendingMap.complexName.toLowerCase();
    const byName = complexes.find((x) => {
      const n = x.name.toLowerCase().replace(/court complex/g, '').trim();
      return n.length > 3 && target.includes(n);
    });
    const chosen = byName ?? (complexes.length === 1 ? complexes[0] : undefined);
    if (chosen) {
      setSelectedComplexId(chosen.id);
      setCourtDetails((p) => ({ ...p, courtComplex: chosen.name }));
    }
    setPendingMap(null);
  }, [complexes, pendingMap]);

  const applyParsedCnr = (raw: string) => {
    const info = parseCnr(raw);
    if (!info) {
      setCnrHint({ ok: false, text: 'Could not recognise this CNR — please fill court details manually.' });
      return;
    }
    const matchedState = states.find((s) => s.name === info.state);
    if (matchedState) {
      setSelectedStateId(matchedState.id);
      setSelectedDistrictId('');
      setSelectedComplexId('');
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

  const lookupAndFill = (raw: string) => {
    if (!raw) return;
    if (!ecourtsEnabled) {
      applyParsedCnr(raw);
      return;
    }
    lookupCnr(raw, {
      onSuccess: (detail) => {
        const c = detail.courtCaseData;
        setNotFoundCnr(null);
        setValue('title', buildCaseTitle(c), { shouldValidate: true });
        const extRef = c.registrationNumber || c.filingNumber || c.caseNumber || '';
        if (extRef) setValue('externalRef', extRef, { shouldValidate: true });
        const stateOpt = states.find((s) => s.id === (c.stateCode ?? ''));
        if (stateOpt) {
          setSelectedStateId(stateOpt.id);
          setSelectedDistrictId('');
          setSelectedComplexId('');
          setPendingMap({ districtCode: c.districtCode, complexName: c.courtName });
        }
        const histJudge = [...(c.historyOfCaseHearings ?? [])]
          .reverse()
          .find((x) => x.judge?.trim())?.judge?.trim();
        setCourtDetails((prev) => ({
          ...prev,
          cnr: c.cnr || raw,
          caseType: c.caseType || prev.caseType,
          state: stateOpt?.name || c.state || prev.state,
          district: c.district || prev.district,
          courtComplex: c.courtName || prev.courtComplex,
          judge: c.judges?.[0] || histJudge || prev.judge,
          stage: c.caseStatus || c.purpose || prev.stage,
        }));
        const next = detail.entityInfo?.nextDateOfHearing || c.nextHearingDate;
        const nextLabel = next ? ` · next hearing ${new Date(next).toLocaleDateString()}` : '';
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const hasFutureHearing = next ? new Date(next) >= startOfToday : false;
        const statusKey = mapStatusKey(c.caseStatus, hasFutureHearing, vocab.statuses);
        if (statusKey) setValue('statusKey', statusKey, { shouldValidate: true });
        setEcourtsInfo(
          Object.fromEntries(
            Object.entries({
              District: c.district,
              Court: c.courtName,
              'Case type': c.caseTypeRaw || c.caseType,
              Judge: c.judges?.[0],
              Stage: c.caseStatus,
            }).filter(([, v]) => Boolean(v)) as [string, string][],
          ),
        );
        setCnrHint({
          ok: true,
          text: `Found on eCourts: ${c.caseTypeRaw ?? c.caseType ?? 'case'}${nextLabel}. Review the details below.`,
        });
      },
      onError: (err) => {
        setEcourtsInfo(null);
        setPendingMap(null);
        if (isAxiosError(err) && err.response?.status === 404) {
          setNotFoundCnr(raw);
          setCnrHint({ ok: false, text: "This case isn't on eCourts yet." });
        } else {
          // Fall back to offline CNR parsing on other errors.
          applyParsedCnr(raw);
        }
      },
    });
  };

  const handleCnrAutofill = () => lookupAndFill(cnrInput.trim());

  const handleEcourtsSelect = (item: EcourtsSearchItem) => {
    setShowEcourtsSearch(false);
    setCnrInput(item.cnr);
    lookupAndFill(item.cnr);
  };

  const onSubmit = (data: CreateMatterForm) => {
    const metadata: Record<string, string> = {};
    for (const [k, v] of Object.entries(courtDetails)) {
      if (v.trim()) metadata[k] = v.trim();
    }
    const cnr = courtDetails.cnr.trim();
    createMatter(
      {
        ...data,
        ...(assignedToId ? { assignedToId } : {}),
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      } as CreateMatterDto,
      {
        onSuccess: (matter) => {
          // Persist + link the eCourts case so the daily sync tracks its hearings.
          if (ecourtsEnabled && cnr) {
            linkEcourtsCase({ cnr, matterId: matter.id });
          }
        },
      },
    );
  };

  const onCreateClient = (data: CreateClientForm) => {
    setNewClientError(null);
    createClient(data as CreateClientDto, {
      onSuccess: (created) => {
        setValue('participantId', created.id);
        setShowNewClient(false);
        resetClientForm();
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : '';
        if (msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('unique')) {
          setNewClientError('A client with this email already exists. Please select them from the client dropdown above instead.');
        } else {
          setNewClientError('Failed to create client. Check details and try again.');
        }
      },
    });
  };

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">

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
              Paste the CNR and we&apos;ll pull the case straight from eCourts to auto-fill these
              details. No CNR yet?{' '}
              <a
                href="https://services.ecourts.gov.in/ecourtindia_v6/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-indigo-700"
              >
                Search eCourts →
              </a>
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={cnrInput}
                onChange={(e) => {
                  setCnrInput(e.target.value);
                  setCnrHint(null);
                  setNotFoundCnr(null);
                  setEcourtsInfo(null);
                  setPendingMap(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCnrAutofill();
                  }
                }}
                placeholder="Paste 16-digit CNR (e.g. DLND020047882015)"
                className="block flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={handleCnrAutofill}
                disabled={!cnrInput.trim() || lookingUp}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {lookingUp ? 'Looking up…' : 'Auto-fill'}
              </button>
            </div>
            {ecourtsEnabled && (
              <button
                type="button"
                onClick={() => setShowEcourtsSearch(true)}
                className="mt-2 text-xs font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-900"
              >
                Don&apos;t have the CNR? Search by party or advocate →
              </button>
            )}
            {cnrHint && (
              <p className={`mt-1.5 text-xs ${cnrHint.ok ? 'text-indigo-700' : 'text-red-600'}`}>
                {cnrHint.ok ? '✓ ' : ''}{cnrHint.text}
              </p>
            )}
            {notFoundCnr && (
              <button
                type="button"
                onClick={() =>
                  queueRefresh(notFoundCnr, {
                    onSuccess: (res) => {
                      setNotFoundCnr(null);
                      setCnrHint({
                        ok: true,
                        text: `Queued — fetching from court (~${res.data.estimatedTime ?? '5–10 minutes'}). Try Auto-fill again shortly.`,
                      });
                    },
                    onError: () =>
                      setCnrHint({ ok: false, text: 'Could not queue the fetch. Please try again.' }),
                  })
                }
                disabled={queuing}
                className="mt-2 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                {queuing ? 'Queuing…' : 'Fetch from court'}
              </button>
            )}
            {ecourtsInfo && Object.keys(ecourtsInfo).length > 0 && (
              <dl className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1 text-xs text-indigo-800 sm:grid-cols-2">
                {Object.entries(ecourtsInfo).map(([k, v]) => (
                  <div key={k} className="flex gap-1">
                    <dt className="shrink-0 text-indigo-500">{k}:</dt>
                    <dd className="truncate font-medium" title={v}>{v}</dd>
                  </div>
                ))}
              </dl>
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
              <label className={LABEL_CLS}>Court Case No. <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. AC-83-2025"
                className={INPUT_CLS}
                {...register('externalRef')}
              />
              {errors.externalRef ? (
                <p className="mt-1 text-xs text-red-500">{errors.externalRef.message}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">e.g. CS 123/2025, WP 45/2024</p>
              )}
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
                <SearchableSelect
                  options={states}
                  value={selectedStateId}
                  onChange={(id, name) => {
                    setSelectedStateId(id);
                    setSelectedDistrictId('');
                    setSelectedComplexId('');
                    setCourtDetails((p) => ({ ...p, state: name, district: '', courtComplex: '' }));
                  }}
                  placeholder="Select state"
                  disabled={statesLoading}
                  loading={statesLoading}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>District</label>
                <SearchableSelect
                  options={districts}
                  value={selectedDistrictId}
                  onChange={(id, name) => {
                    setSelectedDistrictId(id);
                    setSelectedComplexId('');
                    setCourtDetails((p) => ({ ...p, district: name, courtComplex: '' }));
                  }}
                  placeholder={!selectedStateId ? 'Select state first' : 'Select district'}
                  disabled={!selectedStateId || districtsLoading}
                  loading={districtsLoading}
                />
              </div>
            </div>
            {/* Court Complex */}
            <div>
              <label className={LABEL_CLS}>Court Complex</label>
              <SearchableSelect
                options={complexes}
                value={selectedComplexId}
                onChange={(id, name) => {
                  setSelectedComplexId(id);
                  setCourtDetails((p) => ({ ...p, courtComplex: name }));
                }}
                placeholder={!selectedDistrictId ? 'Select district first' : 'Select court complex'}
                disabled={!selectedDistrictId || complexesLoading}
                loading={complexesLoading}
              />
            </div>
            {/* Case Type + CNR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>Case Type</label>
                <SearchableSelect
                  options={caseTypeOptions}
                  value={courtDetails.caseType}
                  onChange={(id) => setCourtDetails((p) => ({ ...p, caseType: id }))}
                  placeholder="Select case type"
                  disabled={caseTypesLoading}
                  loading={caseTypesLoading}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>CNR Number</label>
                <input
                  type="text"
                  value={courtDetails.cnr}
                  onChange={(e) => setCourtDetails((p) => ({ ...p, cnr: e.target.value }))}
                  placeholder="e.g. DLND020047882015"
                  className={INPUT_CLS}
                />
              </div>
            </div>
            {/* Judge + Stage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Staff Assignment (admin only) */}
          {isAdmin && staffList.length > 0 && (
            <div>
              <label className={LABEL_CLS}>Assign to (optional)</label>
              <select
                className={INPUT_CLS}
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {staffList
                  .filter((m) => m.isActive)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.role === 'admin' ? ' (Admin)' : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      placeholder="client@example.com"
                      className={INPUT_CLS}
                      {...registerClient('email')}
                    />
                    {clientErrors.email && (
                      <p className="mt-1 text-xs text-red-500">{clientErrors.email.message}</p>
                    )}
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

      <EcourtsSearchModal
        open={showEcourtsSearch}
        onClose={() => setShowEcourtsSearch(false)}
        onSelect={handleEcourtsSelect}
      />
    </div>
  );
}
