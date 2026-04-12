/**
 * Format a UTC ISO 8601 date string for display in the UI.
 * Returns "—" for null/undefined values.
 */
export function formatDate(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
  locale = 'en-IN',
): string {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale, options);
}

/**
 * Format an ISO date string to a short readable time.
 */
export function formatDateTime(value: string | null | undefined, locale = 'en-IN'): string {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
