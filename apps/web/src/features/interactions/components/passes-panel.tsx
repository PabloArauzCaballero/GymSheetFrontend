'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { useState } from 'react';
import {
  interactionKeys,
  interactionsService,
} from '@/features/interactions/services/interactions-service';
import { MemberProfileDialog } from '@/features/social/components/member-profile-dialog';
import type { InteractionCounts } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { ListSurface } from './list-surface';
import { PersonCard } from './person-card';
import { Segmented } from './segmented';

type Scope = 'received' | 'sent';

/**
 * Quién me dio next, y a quién se lo di yo.
 *
 * «Devolver a la baraja» sólo existe en la lista propia: deshacer el descarte
 * de otra persona sería decidir por ella. Que se pueda ver quién te descartó
 * es una decisión del producto, no un descuido, así que se explica en la
 * pantalla en vez de dejar que el usuario la descubra y se pregunte qué más
 * se comparte sin avisar.
 */
export function PassesPanel({ counts }: Readonly<{ counts: InteractionCounts | null }>) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<Scope>('received');
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const received = useQuery({
    queryKey: interactionKeys.passesReceived,
    queryFn: () => interactionsService.passesReceived(),
    enabled: scope === 'received',
  });
  const sent = useQuery({
    queryKey: interactionKeys.passesSent,
    queryFn: () => interactionsService.passesSent(),
    enabled: scope === 'sent',
  });
  const active = scope === 'received' ? received : sent;

  const undoPass = useMutation({
    mutationFn: (userId: string) => interactionsService.undoPass(userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: interactionKeys.passesSent }),
        queryClient.invalidateQueries({ queryKey: interactionKeys.counts }),
        queryClient.invalidateQueries({ queryKey: ['discovery', 'deck'] }),
      ]);
      notify.success('Vuelve a tu baraja.');
    },
    onError: (error: Error) => notify.error(error),
  });

  return (
    <div className="grid gap-5">
      <Segmented
        onChange={setScope}
        options={[
          { value: 'received', label: 'Me dieron next', count: counts?.passesReceived },
          { value: 'sent', label: 'Di next', count: counts?.passesSent },
        ]}
        value={scope}
      />
      <p className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-4 text-sm leading-6 text-[var(--text-muted)]">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          Cada descarte queda registrado y por eso puedes ver esta lista. Nadie recibe un aviso
          cuando la abres, y dar next tampoco notifica a la otra persona.
        </span>
      </p>
      <ListSurface
        empty={(active.data ?? []).length === 0}
        emptyDescription={
          scope === 'received'
            ? 'Nadie te descartó todavía. Cuando ocurra, lo verás aquí.'
            : 'Las personas que descartes aparecerán aquí y podrás devolverlas a la baraja.'
        }
        emptyTitle={scope === 'received' ? 'Nadie te dio next' : 'No descartaste a nadie'}
        errorMessage={active.isError ? active.error.message : null}
        loading={active.isLoading}
        onRetry={() => active.refetch()}
      >
        {(active.data ?? []).map((pass) => (
          <PersonCard
            actions={
              scope === 'sent' ? (
                <Button
                  loading={undoPass.isPending && undoPass.variables === pass.userId}
                  onClick={() => undoPass.mutate(pass.userId)}
                  size="sm"
                  variant="secondary"
                >
                  Devolver a la baraja
                </Button>
              ) : undefined
            }
            entry={pass}
            key={pass.userId}
            onSelect={() => setProfileUserId(pass.userId)}
            timestamp={pass.passedAt}
          />
        ))}
      </ListSurface>
      <MemberProfileDialog onClose={() => setProfileUserId(null)} userId={profileUserId} />
    </div>
  );
}
