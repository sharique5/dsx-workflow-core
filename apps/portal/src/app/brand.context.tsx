import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface BrandConfig {
  firmName: string;
  logoUrl: string | null;
  primaryColor: string;
  tagline: string;
}

const PRACTIX_DEFAULT: BrandConfig = {
  firmName: 'Practix',
  logoUrl: null,
  primaryColor: '#4f46e5',
  tagline: 'Legal workflow, simplified.',
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

  return (
    <BrandContext.Provider value={data ?? PRACTIX_DEFAULT}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand(): BrandConfig {
  return useContext(BrandContext);
}
