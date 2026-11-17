'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  HANDLE_CHECK_DEBOUNCE_MS,
  handleCheckFrom,
  handleCopy,
  precheckHandle,
  type HandleCheck,
} from '@gymsheet/domain';
import { queryKeys } from '@/shared/api/query-keys';
import { businessService } from '../services/business-client';

/**
 * Live `@handle` availability. Format problems are answered locally; a
 * well-formed handle is asked to the server once the person stops typing
 * (debounce), and each answer is cached so going back to a checked handle
 * does not ask again. A failed check never blocks: the claim decides.
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
