import { useEffect } from 'react';
import { useBrand } from '../../app/brand.context';

export function usePageTitle(title: string): void {
  const { firmName } = useBrand();
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} – ${firmName}` : firmName;
    return () => {
      document.title = prev;
    };
  }, [title, firmName]);
}
