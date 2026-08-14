'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/api-error';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { ConfirmRoot } from '@/shared/notifications';
import { ThemeProvider } from '@/shared/theme/theme-provider';

export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              if (
                error instanceof ApiError &&
                ['unauthorized', 'forbidden', 'not-found', 'validation'].includes(error.kind)
              )
                return false;
              return failureCount < 2;
            },
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <ConfirmRoot />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--surface-low)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
