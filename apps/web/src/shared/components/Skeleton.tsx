/** Reusable skeleton shimmer building block */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded bg-slate-200 ${className}`} />
  );
}

/** A full skeleton row for the cases table (6 columns) */
export function CasesTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {['Ref', 'Title', 'Client', 'Status', 'Filed', ''].map((h) => (
              <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td className="px-5 py-3.5"><Skeleton className="h-4 w-20" /></td>
              <td className="px-5 py-3.5"><Skeleton className="h-4 w-48" /></td>
              <td className="px-5 py-3.5"><Skeleton className="h-4 w-32" /></td>
              <td className="px-5 py-3.5"><Skeleton className="h-5 w-24 rounded-full" /></td>
              <td className="px-5 py-3.5"><Skeleton className="h-4 w-24" /></td>
              <td className="px-5 py-3.5 w-10" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A full skeleton row for the staff table (5 columns + optional action) */
export function StaffTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 tracking-wider">
            {['Name', 'Email', 'Phone', 'Role', 'Status', ''].map((h) => (
              <th key={h} className="px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
              <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
              <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
              <td className="px-4 py-3 w-16" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
