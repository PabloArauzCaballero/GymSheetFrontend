import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  HANDLE_CHECK_DEBOUNCE_MS,
  handleCheckFrom,
  handleCopy,
  precheckHandle,
  type HandleCheck,
} from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { businessService } from './business-service';

/**
 * Live `@handle` availability, same rules as the web hook (ADR-008 keeps
 * React hooks per app): format answered locally, the server asked once the
 * person stops typing, a failed check never blocks the claim.
 */
export function useHandleAvailability(input: string): HandleCheck {
  const [settled, setSettled] = useState(input);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(input), HANDLE_CHECK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const verdict = precheckHandle(settled);
  const remote = verdict.state === 'remote' ? verdict.handle : null;
  const query = useQuery({
    queryKey: queryKeys.business.handleAvailability(remote ?? ''),
    queryFn: ({ signal }) => businessService.handleAvailability(remote ?? '', signal),
    enabled: remote !== null,
    staleTime: 30_000,
    retry: false,
  });

  if (input !== settled) return precheckHandle(input).state === 'idle' ? { state: 'idle' } : { state: 'checking' };
  if (verdict.state !== 'remote') return verdict;
  if (query.isError) return { state: 'error', message: handleCopy.checkFailed };
  if (!query.data) return { state: 'checking' };
  return handleCheckFrom(query.data);
}
