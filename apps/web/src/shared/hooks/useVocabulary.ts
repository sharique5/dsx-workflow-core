import { useAuthStore } from '../../store/auth.store';
import type { IndustryConfig } from '@dsx/shared';

/**
 * Returns the current tenant's vocabulary config.
 * Components use this instead of hard-coding legal terms.
 *
 * @example
 * const { matter_label, scheduled_event_label } = useVocabulary();
 * // Renders "Case", "Hearing" for legal tenants
 */
export function useVocabulary(): IndustryConfig {
  return useAuthStore((s) => s.vocabulary);
}
