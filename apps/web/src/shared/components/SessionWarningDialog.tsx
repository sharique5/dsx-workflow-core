interface SessionWarningDialogProps {
  secondsLeft: number;
  onStay: () => void;
  onLogout: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SessionWarningDialog({
  secondsLeft,
  onStay,
  onLogout,
}: SessionWarningDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 border border-amber-100 mx-auto mb-4">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M12 7v5l3 3" />
          </svg>
        </div>

        <h2 className="text-base font-semibold text-slate-900 text-center mb-1">
          Still there?
        </h2>
        <p className="text-sm text-slate-500 text-center mb-1">
          Your session will expire due to inactivity.
        </p>
        <p className="text-2xl font-bold text-slate-800 text-center tabular-nums mb-6">
          {formatTime(secondsLeft)}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={onStay}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Stay signed in
          </button>
          <button
            onClick={onLogout}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Sign out now
          </button>
        </div>
      </div>
    </div>
  );
}
