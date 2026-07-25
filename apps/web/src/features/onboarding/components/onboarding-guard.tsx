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
  const requiresOnboarding = role === 'CLIENTE' && query.data?.status !== 'COMPLETED';
  useEffect(() => {
    if (!query.isLoading && requiresOnboarding && pathname !== '/onboarding')
      router.replace('/onboarding');
    if (!query.isLoading && !requiresOnboarding && pathname === '/onboarding')
      router.replace('/dashboard');
  }, [pathname, query.isLoading, requiresOnboarding, router]);
  if (role !== 'CLIENTE') return children;
  if (query.isLoading || (requiresOnboarding && pathname !== '/onboarding'))
    return <LoadingPanel rows={5} />;
  if (query.isError)
    return (
      <ErrorPanel
        message="No pudimos verificar tu configuración. Reintenta para continuar de forma segura."
        onRetry={() => query.refetch()}
      />
    );
  return children;
}
