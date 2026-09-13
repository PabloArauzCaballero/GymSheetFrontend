'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { profileViewsService } from '@/features/interactions/services/profile-views-service';
import { socialService } from '@/features/social/services/social-service';
import { directoryKeys } from '@/features/social/services/directory-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { ButtonLink } from '@/shared/components/ui/button';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { ConnectionActionButton, useConnectionActions } from './connection-actions';
import { MemberProfileBody } from './member-profile-body';

/**
 * La ficha de un socio, sin salir de la lista desde la que se abrió.
 *
 * Abrirla registra la visita (`POST /me/profile-views`): es lo que llena la
 * lista de «quién vio mi perfil» de la otra persona. Se hace explícito aquí, y
 * una sola vez por apertura, para que la simetría sea real — si yo puedo ver
 * quién me mira, quien yo miro también.
 *
 * Lleva las acciones de conexión. Antes no: había que cerrar el diálogo, ir a
 * Comunidad y buscar a esa persona para poder escribirle, que es el camino
 * largo a la única cosa que la ficha invita a hacer.
 */
export function MemberProfileDialog({
  onClose,
  userId,
}: Readonly<{ onClose: () => void; userId: string | null }>) {
  const recordedRef = useRef<string | null>(null);
  const actions = useConnectionActions();

  const profile = useQuery({
    queryKey: directoryKeys.member(userId ?? ''),
    queryFn: () => socialService.memberProfile(userId ?? ''),
    enabled: Boolean(userId),
  });

  const recordView = useMutation({
    mutationFn: (viewedUserId: string) => profileViewsService.record(viewedUserId),
    // Registrar la visita es un efecto lateral del producto, no algo que el
    // usuario haya pedido: si falla, no se le interrumpe con un aviso.
    onError: () => undefined,
  });

  useEffect(() => {
    if (!userId || recordedRef.current === userId) return;
    recordedRef.current = userId;
    recordView.mutate(userId);
  }, [recordView, userId]);

  const member = profile.data;

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(userId)}>
      <DialogContent className="max-w-md" title={member?.displayName ?? 'Perfil'}>
        {profile.isLoading ? (
          <SkeletonScreen label="Cargando el perfil">
            <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
            <Skeleton className="h-4 w-2/5 rounded" />
          </SkeletonScreen>
        ) : profile.isError ? (
          <ErrorPanel message={profile.error.message} onRetry={() => profile.refetch()} />
        ) : member ? (
          <div className="grid gap-6">
            <MemberProfileBody compact member={member} />
            <div className="grid gap-2">
              <ConnectionActionButton actions={actions} entry={member} />
              <ButtonLink href={`/perfil/${member.userId}`} variant="ghost">
                Ver el perfil completo
                <ArrowUpRight aria-hidden className="size-4" />
              </ButtonLink>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
