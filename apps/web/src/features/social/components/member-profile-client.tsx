'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { profileViewsService } from '@/features/interactions/services/profile-views-service';
import { socialService } from '@/features/social/services/social-service';
import { directoryKeys } from '@/features/social/services/directory-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { ConnectionActionButton, useConnectionActions } from './connection-actions';
import { MemberProfileBody } from './member-profile-body';

/**
 * El perfil de otro socio, como página.
 *
 * Registra la visita —es de donde sale el «quién te visitó hoy» del dueño del
 * perfil— y muestra lo que el gimnasio deja ver de esa persona: su ficha del
 * directorio, su rango con sus puntos y las insignias que ya ganó.
 *
 * Conectar y escribir se hacen desde aquí, con la misma lógica de estados que
 * la tarjeta del directorio: llegar al perfil de alguien y tener que volver
 * atrás para poder conectar es el camino largo a la única acción que la página
 * invita a hacer.
 *
 * La guarda de la visita es una referencia al `userId` y no un booleano: en
 * Next, navegar de un perfil a otro reutiliza esta pantalla y sólo cambia el
 * parámetro. Con un booleano, la segunda visita no se registraría nunca.
 */
export function MemberProfileClient({ userId }: Readonly<{ userId: string }>) {
  const recordedRef = useRef<string | null>(null);
  const actions = useConnectionActions();

  const profile = useQuery({
    queryKey: directoryKeys.member(userId),
    queryFn: () => socialService.memberProfile(userId),
  });

  const recordView = useMutation({
    mutationFn: (viewedUserId: string) => profileViewsService.record(viewedUserId),
    onError: () => undefined,
  });

  useEffect(() => {
    if (recordedRef.current === userId) return;
    recordedRef.current = userId;
    recordView.mutate(userId);
  }, [recordView, userId]);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <Link
        className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        href="/comunidad"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Comunidad
      </Link>

      {profile.isLoading ? (
        <SkeletonScreen label="Cargando el perfil">
          <Skeleton className="size-28 justify-self-center rounded-full" />
          <Skeleton className="h-44 w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-28 w-full rounded-[var(--radius-lg)]" />
        </SkeletonScreen>
      ) : profile.isError ? (
        <ErrorPanel message={profile.error.message} onRetry={() => profile.refetch()} />
      ) : profile.data ? (
        <>
          <MemberProfileBody member={profile.data} />
          <ConnectionActionButton actions={actions} entry={profile.data} />
        </>
      ) : null}
    </div>
  );
}
