import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NotificationRoot } from "@/notifications";
import { PushRegistration } from "@/notifications/push-registration";
import { CatalogWarmup } from "@/providers/catalog-warmup";
import { configureCatalogCache } from "@/lib/query-cache";
import { shouldRetryQuery } from "@/lib/query-retry";

/**
 * Global providers: gesture handling, safe-area insets and TanStack Query.
 * Query defaults favour mobile connectivity (retry once, refetch on reconnect).
 *
 * NotificationRoot is mounted last so toasts and confirmations draw above every
 * screen, and inside SafeAreaProvider so toasts clear the notch/status bar.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          // Final answers (and a legal block) are never retried: it only delays the screen.
          retry: shouldRetryQuery,
          staleTime: 30_000,
          refetchOnReconnect: true,
        },
      },
    });
    configureCatalogCache(client);
    return client;
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <NotificationRoot />
          <PushRegistration />
          <CatalogWarmup />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
