'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { onboardingService } from '../services/onboarding-service';
import { OnboardingForm } from './onboarding-form';

export function OnboardingFlow() {
  const state = useQuery({ queryKey: queryKeys.onboarding, queryFn: onboardingService.get });
  if (state.isLoading) return <LoadingPanel rows={5} />;
  if (state.isError)
    return <ErrorPanel message={state.error.message} onRetry={() => state.refetch()} />;
  if (!state.data) return <LoadingPanel rows={5} />;
  return <OnboardingForm initial={state.data} />;
}
