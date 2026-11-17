'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import type { SignupProtectionFields } from '@/shared/api/schemas';
import { fetchRegisterTicket } from '@/features/auth/services/auth-client';

export const registerTicketQueryKey = ['auth', 'register-ticket'] as const;
const ticketQuery = {
  queryKey: registerTicketQueryKey,
  queryFn: fetchRegisterTicket,
  staleTime: Infinity,
} as const;

/**
 * Form ticket and Turnstile token of one signup attempt.
 *
 * The ticket is fetched when the form opens (the server measures the fill time
 * from it) and is single-use, so `renew` asks for another one, and a fresh
 * Turnstile token, after a refused attempt.
 */
export function useSignupProtection() {
  const queryClient = useQueryClient();
  useQuery({ ...ticketQuery, gcTime: 0, refetchOnWindowFocus: false });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  /** Evidence for the request being sent now; waits for a ticket still on its way. */
  const evidence = useCallback(
    async (website: string): Promise<Omit<SignupProtectionFields, 'attestation'>> => {
      const ticket = await queryClient.fetchQuery(ticketQuery).catch(() => undefined);
      return {
        ...(ticket ? { ticket: ticket.ticket } : {}),
        ...(turnstileToken ? { turnstileToken } : {}),
        // Only a bot fills it; an empty honeypot is simply not sent.
        ...(website ? { website } : {}),
      };
    },
    [queryClient, turnstileToken],
  );

  const renew = useCallback(async () => {
    setTurnstileToken(null);
    setTurnstileKey((current) => current + 1);
    // Reset, not refetch: an attempt sent meanwhile must wait for the new ticket, not reuse the spent one.
    await queryClient.resetQueries({ queryKey: registerTicketQueryKey });
  }, [queryClient]);

  return { evidence, renew, turnstileKey, onTurnstileToken: setTurnstileToken };
}
