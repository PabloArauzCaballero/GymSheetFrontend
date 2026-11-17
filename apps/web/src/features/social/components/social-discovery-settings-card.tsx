'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { refreshDiscoveryReadiness } from '@/shared/api/query-keys';
import { notify } from '@/shared/notifications';
import type { SocialDiscoverySettings } from '@/shared/api/schemas';
import { socialService } from '@/features/social/services/social-service';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { useShareMapLocation } from '@/features/social-map/hooks/use-share-map-location';

const SHARE_OUTCOME_COPY = {
  SHARED: 'Ya apareces en el mapa, en una zona aproximada.',
  DECLINED: 'Ves el mapa, pero no apareces: falta tu consentimiento de ubicación.',
  NO_POSITION: 'Ves el mapa, pero no apareces: permite la ubicación en tu navegador.',
} as const;

/** Independent, versioned consent controls for social, cross-gym and map exposure. */
export function SocialDiscoverySettingsCard() {
  const queryClient = useQueryClient();
  const shareLocation = useShareMapLocation();
  const settings = useQuery({
    queryKey: ['social', 'discovery-settings'],
    queryFn: socialService.getDiscoverySettings,
  });
  const update = useMutation({
    mutationFn: socialService.updateDiscoverySettings,
    onSuccess: async (saved, input) => {
      const before = queryClient.getQueryData<SocialDiscoverySettings>(['social', 'discovery-settings']);
      // The social profile switch is one of the readiness gaps (PROFILE_ENABLED).
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social', 'discovery-settings'] }),
        refreshDiscoveryReadiness(queryClient),
      ]);
      // Turning the map on also shares where the person is, so they appear on it.
      if (input.mapEnabled && !before?.mapEnabled && saved.mapEnabled) {
        const outcome = await shareLocation().catch((error: unknown) => {
          notify.error(error);
          return null;
        });
        if (outcome === 'SHARED') notify.success(SHARE_OUTCOME_COPY.SHARED);
        else if (outcome) notify.info(SHARE_OUTCOME_COPY[outcome]);
        return;
      }
      notify.success('Permisos de descubrimiento actualizados.');
    },
    onError: (error: Error) => notify.error(error),
  });

  if (settings.isLoading) return <LoadingPanel rows={2} />;
  const current = settings.data;
  if (!current) return null;
  const busy = update.isPending;

  return (
    <Card className="scroll-mt-24" id="perfil-social">
      <CardHeader
        description="Tu perfil empieza privado. La presencia en otros gimnasios y en el mapa tiene permisos separados."
        title="Descubrimiento social"
      />
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <Button
          disabled={busy}
          onClick={() => update.mutate({
            profileEnabled: !current.profileEnabled,
            crossGymEnabled: current.profileEnabled ? false : current.crossGymEnabled,
            mapEnabled: current.profileEnabled ? false : current.mapEnabled,
            expectedVersion: current.version,
          })}
          variant={current.profileEnabled ? 'danger' : 'primary'}
        >{current.profileEnabled ? 'Pausar perfil social' : 'Activar perfil social'}</Button>
        <Button
          disabled={!current.profileEnabled || busy}
          onClick={() => update.mutate({
            profileEnabled: current.profileEnabled,
            crossGymEnabled: !current.crossGymEnabled,
            mapEnabled: current.mapEnabled,
            expectedVersion: current.version,
          })}
          variant={current.crossGymEnabled ? 'primary' : 'secondary'}
        >{current.crossGymEnabled ? 'Desactivar entre gimnasios' : 'Permitir otros gimnasios'}</Button>
        <Button
          disabled={!current.profileEnabled || busy}
          onClick={() => update.mutate({
            profileEnabled: current.profileEnabled,
            crossGymEnabled: current.crossGymEnabled,
            mapEnabled: !current.mapEnabled,
            expectedVersion: current.version,
          })}
          variant={current.mapEnabled ? 'primary' : 'secondary'}
        >{current.mapEnabled ? 'Ocultarme del mapa' : 'Aparecer en el mapa'}</Button>
      </CardContent>
    </Card>
  );
}
