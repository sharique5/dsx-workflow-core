import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { BrandProvider } from './brand.context';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider>
        {children}
        <Toaster position="bottom-center" richColors closeButton />
      </BrandProvider>
    </QueryClientProvider>
  );
}
