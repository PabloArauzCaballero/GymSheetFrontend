import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { SocialStatusValue } from '@gymsheet/schemas';
import { socialService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { FilterChip } from '@/components/filter-chip';
import { notify } from '@/notifications';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

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
      await queryClient.invalidateQueries({ queryKey: ['social', 'discovery-settings'] });
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

/** Preferencias explícitas, separadas del permiso para aparecer en descubrimiento. */
export function DiscoveryPreferencesEditor() {
  const queryClient = useQueryClient();
  const preferences = useQuery({ queryKey: ['social', 'discovery-preferences'], queryFn: socialService.getDiscoveryPreferences });
  const [genders, setGenders] = useState<('MALE' | 'FEMALE')[]>([]);
  const [intents, setIntents] = useState<('TRAINING' | 'FRIENDSHIP' | 'DATING')[]>([]);
  const [minAge, setMinAge] = useState('18');
  const [maxAge, setMaxAge] = useState('65');
  const [radiusKm, setRadiusKm] = useState('25');
  const [flexibleAge, setFlexibleAge] = useState(false);
  const [flexibleDistance, setFlexibleDistance] = useState(false);
  useEffect(() => {
    const value = preferences.data;
    if (!value?.configured) return;
    setGenders(value.genders); setIntents(value.intents);
    setMinAge(String(value.minAge)); setMaxAge(String(value.maxAge)); setRadiusKm(String(value.radiusKm));
    setFlexibleAge(value.flexibleAge); setFlexibleDistance(value.flexibleDistance);
  }, [preferences.data]);
  const save = useMutation({
    mutationFn: socialService.updateDiscoveryPreferences,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['social', 'discovery-preferences'] });
      notify.success('Preferencias de Conocer guardadas.');
    },
    onError: (error: Error) => notify.error(error.message),
  });
  const version = preferences.data?.version ?? 0;
  const toggle = <T extends string>(items: T[], item: T, update: (next: T[]) => void) =>
    update(items.includes(item) ? items.filter((value) => value !== item) : [...items, item]);
  const chip = (label: string, active: boolean, onPress: () => void) => (
    <PressableScale key={label} onPress={onPress}>
      <Text style={{ color: active ? colors.volt : colors.text, backgroundColor: active ? colors.surfaceHigh : colors.surface, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, overflow: 'hidden' }}>{label}</Text>
    </PressableScale>
  );

  return (
    <Section icon="options-outline" title="Preferencias de Conocer">
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20, marginBottom: spacing.md }}>
          Elegí a quién querés conocer. Si no configurás esto, la baraja no adivina por vos.
        </Text>
        <Text style={{ color: colors.text, fontWeight: semibold, marginBottom: spacing.sm }}>Quiero conocer</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {chip('Hombres', genders.includes('MALE'), () => toggle(genders, 'MALE', setGenders))}
          {chip('Mujeres', genders.includes('FEMALE'), () => toggle(genders, 'FEMALE', setGenders))}
        </View>
        <Text style={{ color: colors.text, fontWeight: semibold, marginBottom: spacing.sm }}>Busco</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md }}>
          {chip('Entrenar', intents.includes('TRAINING'), () => toggle(intents, 'TRAINING', setIntents))}
          {chip('Amistad', intents.includes('FRIENDSHIP'), () => toggle(intents, 'FRIENDSHIP', setIntents))}
          {chip('Citas', intents.includes('DATING'), () => toggle(intents, 'DATING', setIntents))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          {([[minAge, setMinAge, 'Edad mín.'], [maxAge, setMaxAge, 'Edad máx.'], [radiusKm, setRadiusKm, 'Radio km']] as const).map(([value, setter, label]) => (
            <View key={label} style={{ flex: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{label}</Text>
              <TextInput keyboardType="number-pad" value={value} onChangeText={setter} style={{ color: colors.text, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, padding: spacing.sm }} />
            </View>
          ))}
        </View>
        <PressableScale onPress={() => setFlexibleAge((value) => !value)}>
          <Text style={{ color: colors.text, marginBottom: spacing.sm }}>{flexibleAge ? '☑' : '□'} Ampliar un poco el rango de edad si hay pocas personas</Text>
        </PressableScale>
        <PressableScale onPress={() => setFlexibleDistance((value) => !value)}>
          <Text style={{ color: colors.text, marginBottom: spacing.md }}>{flexibleDistance ? '☑' : '□'} Ampliar un poco la distancia si hay pocas personas</Text>
        </PressableScale>
        <Button label="Guardar preferencias" loading={save.isPending} disabled={!genders.length || !intents.length || Number(minAge) < 18 || Number(maxAge) < Number(minAge) || Number(radiusKm) < 1 || Number(radiusKm) > 500} onPress={() => save.mutate({
          genders, intents, minAge: Number(minAge), maxAge: Number(maxAge), radiusKm: Number(radiusKm), flexibleAge, flexibleDistance, expectedVersion: version,
        })} />
      </Card>
    </Section>
  );
}
