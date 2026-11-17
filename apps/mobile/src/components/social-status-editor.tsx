import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type { SocialStatusValue } from '@gymsheet/schemas';
import { socialService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { Button } from '@/components/ui';
import { FilterChip } from '@/components/filter-chip';
import { refreshDiscoveryReadiness } from '@/features/social-profile/query-keys';
import { notify } from '@/notifications';
import { colors, fontSizes, spacing } from '@/theme';

const OPTIONS: readonly { value: SocialStatusValue; label: string }[] = [
  { value: 'OPEN_TO_MEET', label: 'Abierto/a a conocer gente' },
  { value: 'IN_RELATIONSHIP', label: 'En pareja' },
  { value: 'SINGLE', label: 'Soltero/a' },
];

/**
 * Tu estado social: solo lo ve quien tenga una conexión aceptada contigo Y lo
 * dejes visible. Se guarda al tocar, sin botón de confirmar — mismo criterio
 * que `GenderPreference` para una preferencia reversible de un solo campo.
 */
export function SocialStatusEditor() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ['social', 'status'],
    queryFn: () => socialService.getSocialStatus(),
  });

  const save = useMutation({
    mutationFn: (input: { socialStatus: SocialStatusValue | null; visible: boolean }) =>
      socialService.updateSocialStatus(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['social', 'status'] });
      notify.success('Estado social actualizado.');
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const current = status.data?.socialStatus ?? null;
  const visible = status.data?.visible ?? false;

  return (
    <Section title="Tu estado social">
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
          Solo lo ven tus conexiones aceptadas, y solo si lo dejas visible.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {OPTIONS.map((option) => {
            const active = option.value === current;
            return (
              <FilterChip
                key={option.value}
                label={option.label}
                onPress={() => save.mutate({ socialStatus: option.value, visible })}
                selected={active}
              />
            );
          })}
        </View>
        <Button
          icon={visible ? 'eye-outline' : 'eye-off-outline'}
          label={visible ? 'Visible para tus conexiones' : 'Oculto'}
          loading={save.isPending}
          onPress={() => save.mutate({ socialStatus: current, visible: !visible })}
          variant={visible ? 'secondary' : 'ghost'}
        />
      </Card>
    </Section>
  );
}

/** Consentimiento separado para descubrimiento entre gimnasios y en mapa. */
export function SocialDiscoverySettingsEditor() {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ['social', 'discovery-settings'],
    queryFn: socialService.getDiscoverySettings,
  });
  const update = useMutation({
    mutationFn: socialService.updateDiscoverySettings,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social', 'discovery-settings'] }),
        refreshDiscoveryReadiness(queryClient),
      ]);
      notify.success('Permisos de descubrimiento actualizados.');
    },
    onError: (error: Error) => notify.error(error.message),
  });
  const current = settings.data;
  const busy = settings.isLoading || update.isPending;

  return (
    <Section icon="compass-outline" title="Descubrimiento social">
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
          Tu perfil empieza privado. Puedes aparecer en otros gimnasios y en el mapa por separado.
        </Text>
        <Button
          disabled={!current || update.isPending}
          label={current?.profileEnabled ? 'Pausar perfil social' : 'Activar perfil social'}
          loading={busy}
          onPress={() => current && update.mutate({
            profileEnabled: !current.profileEnabled,
            crossGymEnabled: current.profileEnabled ? false : current.crossGymEnabled,
            mapEnabled: current.profileEnabled ? false : current.mapEnabled,
            expectedVersion: current.version,
          })}
          variant={current?.profileEnabled ? 'danger' : 'primary'}
        />
        <Button
          disabled={!current?.profileEnabled || update.isPending}
          label={current?.crossGymEnabled ? 'Desactivar descubrimiento entre gimnasios' : 'Permitir descubrimiento entre gimnasios'}
          loading={update.isPending}
          onPress={() => current && update.mutate({
            profileEnabled: current.profileEnabled,
            crossGymEnabled: !current.crossGymEnabled,
            mapEnabled: current.mapEnabled,
            expectedVersion: current.version,
          })}
          variant={current?.crossGymEnabled ? 'primary' : 'ghost'}
        />
        <Button
          disabled={!current?.profileEnabled || update.isPending}
          label={current?.mapEnabled ? 'Ocultarme del mapa' : 'Aparecer en el mapa'}
          loading={update.isPending}
          onPress={() => current && update.mutate({
            profileEnabled: current.profileEnabled,
            crossGymEnabled: current.crossGymEnabled,
            mapEnabled: !current.mapEnabled,
            expectedVersion: current.version,
          })}
          variant={current?.mapEnabled ? 'primary' : 'ghost'}
        />
      </Card>
    </Section>
  );
}

/** Lives with the rest of the "Conocer" profile; re-exported for existing callers. */
export { DiscoveryPreferencesEditor } from '@/features/social-profile/discovery-preferences-editor';
