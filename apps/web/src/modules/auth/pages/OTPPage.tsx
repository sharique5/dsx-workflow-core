import { useRef, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useVerifyOtp } from '../hooks/useAuth';
import { usePageTitle } from '../../../shared/hooks/usePageTitle';

const DIGIT_COUNT = 6;

interface LocationState {
  identifier?: string;
}

export function OTPPage() {
  usePageTitle('Verify OTP');
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const identifier = state?.identifier;

  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(DIGIT_COUNT).fill(null));
  const { mutate: verifyOtp, isPending, error } = useVerifyOtp();

  useEffect(() => {
    if (!identifier) navigate('/login', { replace: true });
    else inputRefs.current[0]?.focus();
  }, [identifier, navigate]);

  const submit = useCallback((code: string) => {
    if (code.length !== DIGIT_COUNT || !identifier) return;
    verifyOtp({ identifier, otp: code });
  }, [identifier, verifyOtp]);

  const handleChange = (idx: number, raw: string) => {
    const char = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    if (char && idx < DIGIT_COUNT - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
    const code = next.join('');
    if (code.length === DIGIT_COUNT) submit(code);
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
    if (pasted.length === DIGIT_COUNT) submit(pasted);
  };

  if (!identifier) return null;

  const otp = digits.join('');

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Check your inbox</h2>
          <p className="mt-2 text-sm text-slate-500">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-slate-700">{identifier}</span>
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); submit(otp); }}
          className="space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Login code
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
                  className="w-11 h-14 rounded-xl border border-slate-300 text-center text-xl font-bold text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                  disabled={isPending}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
              </svg>
              <p className="text-sm text-red-600">Invalid or expired code. Please try again.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || otp.length !== 6}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {isPending ? 'Verifying…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            &larr; Use a different address
          </button>
        </p>
      </div>
    </div>
  );
}
