import { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { usePortalAuthStore } from '../../../store/auth.store';
import { useBrand } from '../../../app/brand.context';

const DIGIT_COUNT = 6;

interface LocationState { identifier?: string }

export function PortalOTPPage() {
  const { firmName } = useBrand();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const identifier = state?.identifier;
  const { setUser } = usePortalAuthStore();

  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(DIGIT_COUNT).fill(null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!identifier) navigate('/login', { replace: true });
    else inputRefs.current[0]?.focus();
  }, [identifier, navigate]);

  const submit = useCallback(async (code: string) => {
    if (code.length !== DIGIT_COUNT || !identifier) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.verifyOtp(identifier, code);
      setUser(data.user);
      navigate('/cases');
    } catch {
      setError('Invalid or expired code. Please try again.');
      setDigits(Array(DIGIT_COUNT).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }, [identifier, setUser, navigate]);

  const handleChange = (idx: number, raw: string) => {
    const char = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char && idx < DIGIT_COUNT - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
    const code = next.join('');
    if (code.length === DIGIT_COUNT) void submit(code);
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[idx]) {
        const next = [...digits];
        next[idx] = '';
        setDigits(next);
      } else if (idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < DIGIT_COUNT - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT);
    if (!pasted) return;
    const next = Array(DIGIT_COUNT).fill('');
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    const focusIdx = Math.min(pasted.length, DIGIT_COUNT - 1);
    inputRefs.current[focusIdx]?.focus();
    if (pasted.length === DIGIT_COUNT) void submit(pasted);
  };

  if (!identifier) return null;

  const otp = digits.join('');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12">
      {/* Brand mark */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">{firmName}</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Check your messages</h1>
          <p className="mt-1 text-sm text-slate-500">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-slate-700">{identifier}</span>
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); void submit(otp); }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-3">
              6-digit code
            </label>
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={d}
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                  className="w-11 h-14 rounded-xl border border-slate-200 bg-slate-50 text-center text-xl font-bold text-slate-900 transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otp.length !== DIGIT_COUNT}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => navigate('/login')}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            &larr; Try a different address
          </button>
        </div>
      </div>
    </div>
  );
}
