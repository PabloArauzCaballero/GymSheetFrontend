import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Text, TextInput, useWindowDimensions, View } from 'react-native';
import { DISCOVERY_PREFERENCES_DEFAULTS as DEFAULTS, discoveryPreferencesBlocker, discoveryPreferencesDirty } from '@gymsheet/domain';
import type { SocialStatusValue } from '@gymsheet/schemas';
import { socialService } from '@/api/services';
import { Card, Section } from '@/components/layout';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/checkbox';
import { FilterChip } from '@/components/filter-chip';
import { notify } from '@/notifications';
import { SaveStatusLine, useSectionSave } from '@/components/save-status';
import { colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

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
    mutationKey: ['profile', 'social-status'],
    mutationFn: (input: { socialStatus: SocialStatusValue | null; visible: boolean }) =>
      socialService.updateSocialStatus(input),
    // Confirmed in place by the status line below (the edit screen's save language), not a toast.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social', 'status'] }),
    onError: (error: Error) => notify.error(error.message),
  });

  const current = status.data?.socialStatus ?? null;
  const visible = status.data?.visible ?? false;
  const saveStatus = useSectionSave(['profile', 'social-status'], false);

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
          label={visible ? 'Visible para tus conexiones' : 'Oculto para tus conexiones'}
          loading={save.isPending}
          onPress={() => save.mutate({ socialStatus: current, visible: !visible })}
          variant={visible ? 'secondary' : 'ghost'}
        />
        <SaveStatusLine saved="Estado social guardado." status={saveStatus} testID="social-status-save" />
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
    <Section title="Descubrimiento social">
      <Card>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
          Tu perfil empieza privado. La presencia en otros gimnasios y en el mapa tiene permisos separados.
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
          // Outlined + icon, not an accent fill: the edit screen keeps its accent for saving.
          icon={current?.profileEnabled ? undefined : 'person-add-outline'}
          variant={current?.profileEnabled ? 'danger' : 'ghost'}
        />
        <Button
          accessibilityHint={current && !current.profileEnabled ? 'Activa tu perfil social primero' : undefined}
          disabled={!current?.profileEnabled || update.isPending}
          label={current?.crossGymEnabled ? 'Desactivar entre gimnasios' : 'Permitir otros gimnasios'}
          loading={update.isPending}
          onPress={() => current && update.mutate({
            profileEnabled: current.profileEnabled,
            crossGymEnabled: !current.crossGymEnabled,
            mapEnabled: current.mapEnabled,
            expectedVersion: current.version,
          })}
          variant={current?.crossGymEnabled ? 'secondary' : 'ghost'}
        />
        <Button
          accessibilityHint={current && !current.profileEnabled ? 'Activa tu perfil social primero' : undefined}
          disabled={!current?.profileEnabled || update.isPending}
          label={current?.mapEnabled ? 'Ocultarme del mapa' : 'Aparecer en el mapa'}
          loading={update.isPending}
          onPress={() => current && update.mutate({
            profileEnabled: current.profileEnabled,
            crossGymEnabled: current.crossGymEnabled,
            mapEnabled: !current.mapEnabled,
            expectedVersion: current.version,
          })}
          variant={current?.mapEnabled ? 'secondary' : 'ghost'}
        />
        {current && !current.profileEnabled ? (
          // Disabled buttons say why, in a secondary tone (repp-diseno §8).
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons color={colors.textSecondary} name="lock-closed-outline" size={iconSizes.sm} />
            <Text style={{ flex: 1, color: colors.textSecondary, fontSize: fontSizes.sm, lineHeight: 20 }}>
              Activa tu perfil social primero para elegir dónde apareces.
            </Text>
          </View>
        ) : null}
      </Card>
    </Section>
  );
}

const PREFERENCES_SAVE_KEY = ['social', 'discovery-preferences', 'save'] as const;

/** Preferencias explícitas, separadas del permiso para aparecer en descubrimiento. */
/**
 * `embedded`: dentro de Comunidad, sin la cabecera (la pantalla ya pregunta
 * «a quién buscas») y con un solo botón que guarda y reparte la baraja.
 */
export function DiscoveryPreferencesEditor({ embedded = false, onSaved }: { embedded?: boolean; onSaved?: () => void } = {}) {
  const queryClient = useQueryClient();
  const preferences = useQuery({ queryKey: ['social', 'discovery-preferences'], queryFn: socialService.getDiscoveryPreferences });
  const [genders, setGenders] = useState<('MALE' | 'FEMALE')[]>([]);
  const [intents, setIntents] = useState<('TRAINING' | 'FRIENDSHIP' | 'DATING')[]>([]);
  const [minAge, setMinAge] = useState(String(DEFAULTS.minAge));
  const [maxAge, setMaxAge] = useState(String(DEFAULTS.maxAge));
  const [radiusKm, setRadiusKm] = useState(String(DEFAULTS.radiusKm));
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
    mutationKey: PREFERENCES_SAVE_KEY,
    mutationFn: socialService.updateDiscoveryPreferences,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['social', 'discovery-preferences'] });
      // Comunidad deals the deck at once (a toast says it worked); settings say it in their save row.
      if (embedded) notify.success('Preferencias de Conocer guardadas.');
      onSaved?.();
    },
    onError: (error: Error) => notify.error(error.message),
  });
  const version = preferences.data?.version ?? 0;
  const toggle = <T extends string>(items: T[], item: T, update: (next: T[]) => void) =>
    update(items.includes(item) ? items.filter((value) => value !== item) : [...items, item]);
  const { fontScale } = useWindowDimensions();
  const fieldLabel = (text: string) => (
    <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: semibold, letterSpacing: 0.4, textTransform: 'uppercase' }}>
      {text}
    </Text>
  );

  // A disabled save says why (repp-diseno §8): the first thing still missing.
  const draft = { genders, intents, minAge: Number(minAge), maxAge: Number(maxAge), radiusKm: Number(radiusKm), flexibleAge, flexibleDistance };
  const blocker = discoveryPreferencesBlocker(draft);
  const dirty = discoveryPreferencesDirty(preferences.data, draft);
  const status = useSectionSave(PREFERENCES_SAVE_KEY, dirty);
  const submit = () => save.mutate({ ...draft, expectedVersion: version });
  const form = (
    <View style={{ gap: spacing.lg }}>
      {embedded ? null : (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
          Se aplican a las recomendaciones. Si no las configuras, la baraja no adivina por ti.
        </Text>
      )}

      <View style={{ gap: spacing.sm }}>
        {fieldLabel('Quiero conocer')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <FilterChip label="Hombres" onPress={() => toggle(genders, 'MALE', setGenders)} selected={genders.includes('MALE')} />
          <FilterChip label="Mujeres" onPress={() => toggle(genders, 'FEMALE', setGenders)} selected={genders.includes('FEMALE')} />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        {fieldLabel('Busco')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <FilterChip icon="barbell-outline" label="Entrenar" onPress={() => toggle(intents, 'TRAINING', setIntents)} selected={intents.includes('TRAINING')} />
          <FilterChip icon="people-outline" label="Amistad" onPress={() => toggle(intents, 'FRIENDSHIP', setIntents)} selected={intents.includes('FRIENDSHIP')} />
          <FilterChip icon="heart-outline" label="Citas" onPress={() => toggle(intents, 'DATING', setIntents)} selected={intents.includes('DATING')} />
        </View>
      </View>

      {/* Three columns split «RADI/O (KM)» past Dynamic Type ×1.3: one field a row there. */}
      <View style={{ flexDirection: fontScale > 1.3 ? 'column' : 'row', gap: spacing.sm }}>
        {([[minAge, setMinAge, 'Edad mín.'], [maxAge, setMaxAge, 'Edad máx.'], [radiusKm, setRadiusKm, 'Radio (km)']] as const).map(([value, setter, label]) => (
          // space-between: when one label wraps at 320 or with large text, the three inputs still share a baseline.
          <View key={label} style={{ flex: 1, gap: spacing.xs, justifyContent: 'space-between' }}>
            {fieldLabel(label)}
            <TextInput
              accessibilityLabel={label}
              keyboardType="number-pad"
              onChangeText={setter}
              style={{
                color: colors.text,
                fontSize: fontSizes.md,
                fontWeight: semibold,
                textAlign: 'center',
                backgroundColor: colors.surfaceLow,
                borderColor: colors.borderControl,
                borderWidth: 1,
                borderRadius: radii.lg,
                borderCurve: 'continuous',
                paddingVertical: spacing.smd,
              }}
              value={value}
            />
          </View>
        ))}
      </View>

      <View style={{ gap: spacing.xs }}>
        <Checkbox checked={flexibleAge} label="Ampliar un poco la edad si hay pocas personas" onChange={setFlexibleAge} />
        <Checkbox checked={flexibleDistance} label="Ampliar un poco la distancia si hay pocas personas" onChange={setFlexibleDistance} />
      </View>

      {blocker ? <Text style={{ color: colors.textSecondary, fontSize: fontSizes.sm, lineHeight: 20 }}>{blocker}</Text> : null}
      {embedded ? (
        <Button accessibilityHint={blocker ?? undefined} disabled={blocker !== null} label="Buscar compañeros" loading={save.isPending} onPress={submit} />
      ) : (
        // Same save row as every edit section: its status on the left, a small save on the right («Guardar»: the
        // status names the section, so «Preferencias guardadas.» stays on one line at 390).
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <SaveStatusLine saved="Preferencias guardadas." status={status} testID="preferences-status" />
          <Button accessibilityHint={blocker ?? undefined} accessibilityLabel="Guardar preferencias" disabled={blocker !== null || !dirty} label="Guardar" loading={save.isPending} onPress={submit} size="sm" testID="preferences-save" />
        </View>
      )}
    </View>
  );

  if (embedded) return <Card>{form}</Card>;
  return (
    <Section title="Preferencias de Conocer">
      <Card>{form}</Card>
    </Section>
  );
}
