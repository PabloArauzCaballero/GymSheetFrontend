'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, UserRoundPlus } from 'lucide-react';
import { useId } from 'react';
import { notify } from '@/shared/notifications';
import { socialService } from '@/features/social/services/social-service';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';

/**
 * Independent, versioned consent controls for social, cross-gym and map exposure.
 * The heading lives outside the card (`Section`), like every other profile section.
 */
export function SocialDiscoverySettingsCard() {
  const queryClient = useQueryClient();
  const lockedId = useId();
  const settings = useQuery({
    queryKey: ['social', 'discovery-settings'],
    queryFn: socialService.getDiscoverySettings,
  });
  const update = useMutation({
    mutationFn: socialService.updateDiscoverySettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['social', 'discovery-settings'] });
      notify.success('Permisos de descubrimiento actualizados.');
    },
    onError: (error: Error) => notify.error(error),
  });

  if (settings.isLoading) return <LoadingPanel rows={2} />;
  const current = settings.data;
  if (!current) return null;
  const busy = update.isPending;
  const locked = !current.profileEnabled;
  // Disabled, but still legible (muted ink, not the 2:1 disabled grey): the line below says why.
  const dependent = 'whitespace-normal py-2 text-center disabled:text-[var(--text-muted)]';

  return (
    <Card>
      {/* Side by side only when the card itself is wide: in the profile's narrow column the labels clipped. */}
      <CardContent className="@container grid gap-4 [overflow-wrap:anywhere]">
        <p className="t-subhead hyphens-auto text-[var(--text-muted)] [overflow-wrap:anywhere]">Tu perfil empieza privado. La presencia en otros gimnasios y en el mapa tiene permisos separados.</p>
        <div className="grid gap-3 @xl:grid-cols-3">
        <Button
          // Off: a 3:1 control outline (≈4.8:1 dark, ≈3.6:1 light); the shared --border is only ~1.3:1.
          className={`whitespace-normal py-2 text-center ${current.profileEnabled ? '' : 'border-[color-mix(in_srgb,var(--text-muted)_75%,var(--surface))]'}`}
          disabled={busy}
          onClick={() => update.mutate({
            profileEnabled: !current.profileEnabled,
            crossGymEnabled: current.profileEnabled ? false : current.crossGymEnabled,
            mapEnabled: current.profileEnabled ? false : current.mapEnabled,
            expectedVersion: current.version,
          })}
          // Outlined + icon, not an accent fill: the profile screen's one accent fill is «Editar».
          variant={current.profileEnabled ? 'danger' : 'ghost'}
        >
          {current.profileEnabled ? null : <UserRoundPlus aria-hidden className="size-5 shrink-0" />}
          {current.profileEnabled ? 'Pausar perfil social' : 'Activar perfil social'}
        </Button>
        <Button
          aria-describedby={locked ? lockedId : undefined}
          className={dependent}
          disabled={locked || busy}
          onClick={() => update.mutate({
            profileEnabled: current.profileEnabled,
            crossGymEnabled: !current.crossGymEnabled,
            mapEnabled: current.mapEnabled,
            expectedVersion: current.version,
          })}
          variant={current.crossGymEnabled ? 'secondary' : 'ghost'}
        >{current.crossGymEnabled ? 'Desactivar entre gimnasios' : 'Permitir otros gimnasios'}</Button>
        <Button
          aria-describedby={locked ? lockedId : undefined}
          className={dependent}
          disabled={locked || busy}
          onClick={() => update.mutate({
            profileEnabled: current.profileEnabled,
            crossGymEnabled: current.crossGymEnabled,
            mapEnabled: !current.mapEnabled,
            expectedVersion: current.version,
          })}
          variant={current.mapEnabled ? 'secondary' : 'ghost'}
        >{current.mapEnabled ? 'Ocultarme del mapa' : 'Aparecer en el mapa'}</Button>
        </div>
        {locked ? (
          <p className="t-footnote flex items-center gap-2 text-[var(--text-muted)]" id={lockedId}>
            <Lock aria-hidden className="size-4 shrink-0" />
            Activa tu perfil social primero para elegir dónde apareces.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
