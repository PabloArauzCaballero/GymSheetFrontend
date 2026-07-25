'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/shared/api/api-error';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Toaster } from 'sonner';

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
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d0d0d',
            border: '1px solid #262626',
            color: '#f5f5f5',
          },
        }}
      />
    </QueryClientProvider>
  );
}
