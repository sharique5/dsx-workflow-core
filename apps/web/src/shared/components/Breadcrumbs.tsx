import { Link, useMatches, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { MatterDto } from '@dsx/shared';

export interface BreadcrumbHandle {
  crumb: string | React.FC;
}

// Dynamic crumb for cases/:id — reads from React Query cache
export function CaseCrumb() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const matter = qc.getQueryData<MatterDto>(['matters', id]);
  return <>{matter ? matter.internalRef : '…'}</>;
}

export function Breadcrumbs() {
  const matches = useMatches() as Array<{
    id: string;
    pathname: string;
    handle?: BreadcrumbHandle;
    data: unknown;
  }>;

  const crumbs = matches.filter((m) => m.handle?.crumb);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1.5 text-sm text-slate-500">
      {crumbs.map((m, i) => {
        const isLast = i === crumbs.length - 1;
        const CrumbLabel = m.handle!.crumb;
        const label = typeof CrumbLabel === 'string' ? CrumbLabel : <CrumbLabel />;
        return (
          <span key={m.id} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-slate-300 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {isLast ? (
              <span className="font-medium text-slate-800 truncate max-w-[200px]">{label}</span>
            ) : (
              <Link to={m.pathname} className="hover:text-indigo-600 transition-colors truncate max-w-[200px]">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
