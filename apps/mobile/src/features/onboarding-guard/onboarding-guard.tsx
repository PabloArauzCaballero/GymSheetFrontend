import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authDestination } from '@gymsheet/domain';
import { onboardingService } from '@/api/services';
import { ErrorState, Skeleton } from '@/components/feedback';
import { useAuthStore } from '@/state/auth-store';
import { colors, spacing } from '@/theme';
import { ONBOARDING_PATH, decideOnboardingGate, onboardingQueryKey } from './onboarding-gate';

/**
 * Keeps a CLIENTE on `/onboarding` until the API reports it COMPLETED, and sends
 * them off it afterwards. It is the single place that routes into onboarding:
 * signup, login and a cold start all land on Comunidad and this guard decides.
 *
 * It renders an overlay instead of replacing the stack, so the navigator stays
 * mounted while the check runs and the redirect happens underneath it.
 */
export function OnboardingGuard() {
  const principal = useAuthStore((state) => state.principal);
  const authenticated = useAuthStore((state) => state.status === 'authenticated');
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const query = useQuery({
    queryKey: onboardingQueryKey(principal?.id),
    queryFn: () => onboardingService.get(),
    enabled: authenticated && principal?.role === 'CLIENTE',
  });

  const gate = decideOnboardingGate({
    role: principal?.role,
    pathname,
    status: query.data?.status,
    failed: query.isError && query.data === undefined,
  });
  const target =
    gate.kind === 'redirect' ? (gate.to === 'onboarding' ? ONBOARDING_PATH : authDestination.mobile.afterLogin) : null;

  useEffect(() => {
    if (target) router.replace(target);
  }, [router, target]);

  if (gate.kind === 'pass') return null;

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        },
      ]}
    >
      {gate.kind === 'error' ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <Skeleton height={48} />
          <Skeleton height={300} />
        </>
      )}
    </View>
  );
}
