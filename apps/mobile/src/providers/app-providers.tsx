import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError, type ApiErrorKind } from '@gymsheet/api-client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NotificationRoot } from '@/notifications';

const NON_RETRYABLE: ReadonlySet<ApiErrorKind> = new Set<ApiErrorKind>([
  'unauthorized',
  'forbidden',
  'not-found',
  'validation',
]);

/**
 * Global providers: gesture handling, safe-area insets and TanStack Query.
 * Query defaults favour mobile connectivity (retry once, refetch on reconnect).
 *
 * NotificationRoot is mounted last so toasts and confirmations draw above every
 * screen, and inside SafeAreaProvider so toasts clear the notch/status bar.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Retrying an expired session, a denied permission or a missing
            // resource can never change the answer — it only delays the screen.
            retry: (failureCount, error) =>
              !(error instanceof ApiError && NON_RETRYABLE.has(error.kind)) && failureCount < 1,
            staleTime: 30_000,
            refetchOnReconnect: true,
          },
        },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <NotificationRoot />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
