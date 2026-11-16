'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { onboardingService } from '../services/onboarding-service';
import { queryKeys } from '@/shared/api/query-keys';
import type { UserRole } from '@/shared/api/contracts';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';

export function OnboardingGuard({
  children,
  role,
}: Readonly<{ children: ReactNode; role: UserRole }>) {
  const pathname = usePathname();
  const router = useRouter();
  const query = useQuery({
    queryKey: queryKeys.onboarding,
    queryFn: onboardingService.get,
    enabled: role === 'CLIENTE',
    retry: 1,
  });
  // Only a loaded state decides a redirect: a failed GET is not "onboarding
  // pending", and sending the member to /onboarding would hide the real error.
  const status = query.data?.status;
  const resolved = role !== 'CLIENTE' || status !== undefined;
  const requiresOnboarding = role === 'CLIENTE' && status !== undefined && status !== 'COMPLETED';
  useEffect(() => {
    if (!resolved) return;
    if (requiresOnboarding && pathname !== '/onboarding') router.replace('/onboarding');
    if (!requiresOnboarding && pathname === '/onboarding') router.replace('/comunidad');
  }, [pathname, requiresOnboarding, resolved, router]);
  if (role !== 'CLIENTE') return children;
  if (status === undefined)
    return query.isError ? (
      <ErrorPanel
        message="No pudimos verificar tu configuración. Reintenta para continuar de forma segura."
        onRetry={() => query.refetch()}
      />
    ) : (
      <LoadingPanel rows={5} />
    );
  if (requiresOnboarding && pathname !== '/onboarding') return <LoadingPanel rows={5} />;
  return children;
}
