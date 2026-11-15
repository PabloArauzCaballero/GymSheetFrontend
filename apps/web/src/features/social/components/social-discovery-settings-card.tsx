'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { notify } from '@/shared/notifications';
import { socialService } from '@/features/social/services/social-service';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';

/** Independent, versioned consent controls for social, cross-gym and map exposure. */
export function SocialDiscoverySettingsCard() {
  const queryClient = useQueryClient();
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
      <CardHeader
        description="Tu perfil empieza privado. La presencia en otros gimnasios y en el mapa tiene permisos separados."
        title="Descubrimiento social"
      />
      {/* Side by side only when the card itself is wide: in the profile's narrow column the labels clipped. */}
      <CardContent className="@container">
        <div className="grid gap-3 @xl:grid-cols-3">
        <Button
          className="whitespace-normal py-2 text-center"
          disabled={busy}
          onClick={() => update.mutate({
            profileEnabled: !current.profileEnabled,
            crossGymEnabled: current.profileEnabled ? false : current.crossGymEnabled,
            mapEnabled: current.profileEnabled ? false : current.mapEnabled,
            expectedVersion: current.version,
          })}
          // Secondary: the profile screen's one accent fill is «Editar».
          variant={current.profileEnabled ? 'danger' : 'secondary'}
        >{current.profileEnabled ? 'Pausar perfil social' : 'Activar perfil social'}</Button>
        <Button
          aria-describedby={locked ? 'social-discovery-locked' : undefined}
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
          aria-describedby={locked ? 'social-discovery-locked' : undefined}
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
          <p className="t-footnote mt-3 flex items-center gap-2 text-[var(--text-muted)]" id="social-discovery-locked">
            <Lock aria-hidden className="size-4 shrink-0" />
            Activa tu perfil social primero para elegir dónde apareces.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
