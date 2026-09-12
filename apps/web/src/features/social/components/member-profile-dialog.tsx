'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { MapPin, Target } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { profileViewsService } from '@/features/interactions/services/profile-views-service';
import { withAlpha } from '@/features/progression/components/progression-colors';
import { ProgressionIcon } from '@/features/progression/components/progression-icon';
import { socialService } from '@/features/social/services/social-service';
import type { EarnedBadge } from '@/shared/api/schemas';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { trainingGoalLabels } from './directory-labels';
import { chipHeartbeat } from '@/shared/components/ui/badge';

/**
 * La ficha de un socio, con lo que ha conseguido.
 *
 * Abrirla registra la visita (`POST /me/profile-views`): es lo que llena la
 * lista de «quién vio mi perfil» de la otra persona. Se hace explícito aquí,
 * y una sola vez por apertura, para que la simetría sea real — si yo puedo ver
 * quién me mira, quien yo miro también.
 */
export function MemberProfileDialog({
  onClose,
  userId,
}: Readonly<{ onClose: () => void; userId: string | null }>) {
  const recordedRef = useRef<string | null>(null);

  const profile = useQuery({
    queryKey: ['gym-directory', 'member', userId],
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
  const objetivo = member?.objetivo
    ? (trainingGoalLabels[member.objetivo] ?? member.objetivo)
    : null;

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(userId)}>
      <DialogContent className="max-w-md" title={member?.displayName ?? 'Perfil'}>
        {profile.isLoading ? (
          <SkeletonScreen label="Cargando el perfil">
            <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
            <Skeleton className="h-4 w-2/5 rounded" />
          </SkeletonScreen>
        ) : profile.isError ? (
          <ErrorPanel message={profile.error.message} onRetry={() => profile.refetch()} />
        ) : member ? (
          <div className="grid gap-5">
            {member.photos.length > 0 ? (
              <div className="nav-scroll flex gap-2 overflow-x-auto">
                {member.photos.map((photo) => (
                  <div
                    className="h-56 w-40 shrink-0 overflow-hidden rounded-[var(--radius-lg)]"
                    key={photo.id}
                  >
                    <DomainImage alt={`Foto de ${member.displayName}`} src={photo.url} />
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
              {member.age !== null ? <span>{member.age} años</span> : null}
              {objetivo ? (
                <span className="inline-flex items-center gap-1.5">
                  <Target aria-hidden className="size-3.5" />
                  {objetivo}
                </span>
              ) : null}
              {member.branchName ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin aria-hidden className="size-3.5" />
                  {member.branchName}
                </span>
              ) : null}
            </div>
            {member.badges.length > 0 ? (
              <section className="grid gap-3">
                <h3 className="data-label text-[var(--text-muted)]">Insignias conseguidas</h3>
                <ul className="flex flex-wrap gap-2">
                  {member.badges.map((badge) => (
                    <BadgeChip badge={badge} key={badge.code} />
                  ))}
                </ul>
              </section>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Todavía no consiguió ninguna insignia.
              </p>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/** Sólo las conseguidas: mirar a alguien no puede revelar lo que le falta. */
function BadgeChip({ badge }: Readonly<{ badge: EarnedBadge }>) {
  return (
    <li
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${chipHeartbeat}`}
      style={{
        borderColor: withAlpha(badge.color, 0.35),
        backgroundColor: withAlpha(badge.color, 0.12),
      }}
      title={badge.description}
    >
      <ProgressionIcon className="size-4" name={badge.icon} style={{ color: badge.color }} />
      {badge.name}
    </li>
  );
}
