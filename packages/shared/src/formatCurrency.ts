/**
 * Format a numeric amount as Indian Rupees (INR) by default.
 * Returns "—" for null/undefined values.
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency = 'INR',
  locale = 'en-IN',
): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
