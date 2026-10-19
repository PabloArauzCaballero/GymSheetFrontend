'use client';

import type { QueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';

/**
 * Al volver a la pestaña relee el historial. Devuelve la validación en curso
 * (o `null`) para que la pantalla no muestre mensajes sin verificar mientras tanto.
 */
export function useResumeValidation(
  conversationId: string,
  queryClient: QueryClient,
): { conversationId: string; sequence: number } | null {
  const [resumeValidation, setResumeValidation] = useState<{
    conversationId: string;
    sequence: number;
  } | null>(null);
  const resumeValidationSequenceRef = useRef(0);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        const sequence = ++resumeValidationSequenceRef.current;
        setResumeValidation({ conversationId, sequence });
        void queryClient
          .invalidateQueries(
            { queryKey: queryKeys.messages(conversationId) },
            { throwOnError: true },
          )
          .catch(() => undefined)
          .finally(() => {
            setResumeValidation((current) => (current?.sequence === sequence ? null : current));
          });
      }
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => document.removeEventListener('visibilitychange', refreshWhenVisible);
  }, [conversationId, queryClient]);

  return resumeValidation;
}
