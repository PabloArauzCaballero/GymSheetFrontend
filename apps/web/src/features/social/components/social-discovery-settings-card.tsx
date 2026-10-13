'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

  return (
    <Card>
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
