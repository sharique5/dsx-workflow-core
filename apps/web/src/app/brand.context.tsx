import React, { createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface BrandConfig {
  firmName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  tagline: string;
}

const PRACTIX_DEFAULT: BrandConfig = {
  firmName: 'Practix',
  logoUrl: null,
  primaryColor: '#4f46e5',
  secondaryColor: '#e0e7ff',
  tagline: 'Practix by Disionix — Intelligent Operations for Professional Firms',
};

const BrandContext = createContext<BrandConfig>(PRACTIX_DEFAULT);

async function fetchBrand(): Promise<BrandConfig> {
  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
  const res = await axios.get<BrandConfig>(`${apiBase}/tenant/brand`, {
    headers: { 'X-Tenant-Domain': window.location.hostname },
  });
  return res.data;
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ['tenant-brand'],
    queryFn: fetchBrand,
    staleTime: Infinity,
    retry: false,
    placeholderData: PRACTIX_DEFAULT,
  });

  const brand = data ?? PRACTIX_DEFAULT;

  useEffect(() => {
    document.documentElement.style.setProperty('--brand-primary', brand.primaryColor);
    document.documentElement.style.setProperty('--brand-secondary', brand.secondaryColor);
    // Also override the Tailwind @theme token so bg-brand/text-brand classes update
    document.documentElement.style.setProperty('--color-brand', brand.primaryColor);
  }, [brand.primaryColor, brand.secondaryColor]);

  return (
    <BrandContext.Provider value={brand}>
      {children}
    </BrandContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBrand(): BrandConfig {
  return useContext(BrandContext);
}
