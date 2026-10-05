'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } } }));
  const init = useAuth((s) => s.init);
  useEffect(() => { init(); }, [init]);
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
