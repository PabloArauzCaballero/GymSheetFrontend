'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck, ShieldBan } from 'lucide-react';
import Link from 'next/link';
import { socialService } from '@/features/social/services/social-service';
import { directoryKeys } from '@/features/social/services/directory-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { notify } from '@/shared/notifications';

export function BlockedUsersClient() {
  const queryClient = useQueryClient();
  const blocked = useQuery({ queryKey: ['gym-directory', 'blocked-users'], queryFn: socialService.listBlockedUsers });
  const unblock = useMutation({
    mutationFn: (userId: string) => socialService.unblockUser(userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['gym-directory', 'blocked-users'] }),
        queryClient.invalidateQueries({ queryKey: directoryKeys.all }),
      ]);
      notify.success('Persona desbloqueada.');
    },
    onError: (error: Error) => notify.error(error),
  });

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <Link className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]" href="/comunidad">
        <ArrowLeft aria-hidden className="size-4" /> Comunidad
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Personas bloqueadas</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Puedes desbloquear a alguien en cualquier momento.</p>
      </div>
      {blocked.isLoading ? <SkeletonList rows={3} variant="stacked" /> : blocked.isError ? (
        <ErrorPanel message={blocked.error.message} onRetry={() => void blocked.refetch()} />
      ) : blocked.data?.length ? (
        <ul className="grid gap-3">
          {blocked.data.map((person) => (
            <li key={person.userId}>
              <Card className="flex items-center justify-between gap-4 p-4">
                <span className="font-medium">{person.displayName}</span>
                <Button loading={unblock.isPending && unblock.variables === person.userId} onClick={() => unblock.mutate(person.userId)} variant="secondary">
                  <ShieldCheck aria-hidden className="size-4" /> Desbloquear
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      ) : <EmptyState description="Las personas que bloquees aparecerán aquí." icon={<ShieldBan aria-hidden className="size-6" />} title="No hay personas bloqueadas" />}
    </div>
  );
}
