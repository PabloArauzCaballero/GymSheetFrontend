import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { registerTicketSchema } from '@gymsheet/schemas';
import { apiClient } from '@/api/client';

const ticketKey = ['auth', 'register-ticket'] as const;

/**
 * The signed, single-use form ticket of `POST /auth/register`. Fetched when the
 * signup screen opens (`gcTime: 0` drops it when the screen closes, so every
 * visit starts with a fresh one) and renewed after a rejection or a 409, which
 * spend it. The server keeps a ticket valid for an hour; the form never lives
 * that long, so there is no periodic refresh.
 */
export function useRegisterTicket() {
  const query = useQuery({
    queryKey: ticketKey,
    queryFn: () => apiClient.request('/auth/register/ticket', registerTicketSchema, { method: 'GET' }),
    gcTime: 0,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  // The ticket the server already consumed: never sent twice, even if the
  // person submits again before the renewal lands.
  const spent = useRef<string | null>(null);

  return {
    /** The ticket to send; fetched on the spot if missing or spent. Never blocks the signup. */
    async current(): Promise<string | undefined> {
      if (query.data && query.data.ticket !== spent.current) return query.data.ticket;
      const retried = await query.refetch();
      const ticket = retried.data?.ticket;
      return ticket && ticket !== spent.current ? ticket : undefined;
    },
    renew() {
      spent.current = query.data?.ticket ?? null;
      void query.refetch();
    },
  };
}
