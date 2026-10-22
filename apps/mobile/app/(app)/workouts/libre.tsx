import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { freeWorkoutGroups, type FreeWorkoutGroup } from '@gymsheet/types';
import { workoutService } from '@/api/services';
import { FilterChip } from '@/components/filter-chip';
import { ScreenHeader, ScrollScreen, Section } from '@/components/layout';
import { SegmentedPill, SegmentLabel } from '@/components/motion';
import { BackLink } from '@/components/nav';
import { StickyFooter, StickyFooterSpacer } from '@/components/sticky-footer';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { colors, minTouchTarget, radii, spacing } from '@/theme';

/** Cómo se llama cada zona en la app. */
const GROUP_LABEL: Readonly<Record<FreeWorkoutGroup, string>> = {
  CHEST: 'Pecho',
  BACK: 'Espalda',
  SHOULDERS: 'Hombros',
  ARMS: 'Brazos',
  CORE: 'Abdomen',
  LEGS: 'Piernas',
  GLUTES: 'Glúteos',
  CALVES: 'Pantorrillas',
};

/** Tamaños de sesión: corta, normal, larga. Seis es lo que entra en una hora. */
const SIZES = ['4', '6', '8'] as const;
type SizeOption = (typeof SIZES)[number];
const SIZE_LABEL: Readonly<Record<SizeOption, string>> = { '4': 'Corta', '6': 'Normal', '8': 'Larga' };
const DEFAULT_SIZE: SizeOption = '6';

/**
 * Entreno libre: elige qué zonas quieres trabajar (o ninguna, y es cuerpo
 * completo) y la app te propone los ejercicios. Todo se puede cambiar después:
 * quitar, añadir o cambiar uno por un equivalente desde el menú del entreno.
 *
 * Una sola decisión obligatoria —ninguna— y una sola acción principal.
 */
export default function FreeWorkoutScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [groups, setGroups] = useState<readonly FreeWorkoutGroup[]>([]);
  const [size, setSize] = useState<SizeOption>(DEFAULT_SIZE);

  const toggle = (group: FreeWorkoutGroup) =>
    setGroups((current) => (current.includes(group) ? current.filter((item) => item !== group) : [...current, group]));

  const start = useMutation({
    mutationFn: (empty: boolean) =>
      workoutService.startFree({ grupos: empty ? [] : groups, ejercicios: Number(size), vacia: empty }),
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      if (!session.rutinaLibre.cuerpoCompleto && session.rutinaLibre.grupos.length > 0 && session.rutinaLibre.propuestos === 0) {
        notify.info('No encontramos ejercicios para esas zonas: empieza añadiendo los tuyos.');
      }
      router.replace({ pathname: '/workouts/[id]', params: { id: session.id } });
    },
    onError: (error: Error) => notify.error(error),
  });

  const summary =
    groups.length === 0 ? 'Cuerpo completo' : groups.map((group) => GROUP_LABEL[group]).join(' · ');

  return (
    <ScrollScreen
      overlay={
        <StickyFooter>
          <Button
            icon="flash"
            label="Armar mi entreno"
            loading={start.isPending && start.variables === false}
            onPress={() => {
              if (!start.isPending) start.mutate(false);
            }}
            size="lg"
            style={{ flex: 1 }}
            testID="free-start"
          />
        </StickyFooter>
      }
    >
      <BackLink />
      <ScreenHeader subtitle="Elige zonas o déjalo así para cuerpo completo." title="Entreno libre" />

      <Section title="¿Qué quieres trabajar?">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {freeWorkoutGroups.map((group) => (
            <FilterChip
              key={group}
              label={GROUP_LABEL[group]}
              onPress={() => toggle(group)}
              selected={groups.includes(group)}
              testID={`free-group-${group}`}
            />
          ))}
        </View>
        <Text tone="muted" variant="footnote">
          {summary}
        </Text>
      </Section>

      <Section title="Duración">
        <SegmentedPill
          fill
          itemStyle={{ minHeight: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
          onChange={setSize}
          options={SIZES.map((value) => ({ value, accessibilityLabel: `${SIZE_LABEL[value]}, ${value} ejercicios` }))}
          renderItem={(option, active) => (
            <SegmentLabel
              active={active}
              activeColor={colors.text}
              inactiveColor={colors.textMuted}
              label={`${SIZE_LABEL[option.value]} · ${option.value}`}
            />
          )}
          style={{ padding: spacing.xxs, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}
          value={size}
        />
      </Section>

      <Button
        label="Prefiero empezar en blanco"
        loading={start.isPending && start.variables === true}
        onPress={() => {
          if (!start.isPending) start.mutate(true);
        }}
        size="sm"
        style={{ alignSelf: 'center' }}
        testID="free-empty"
        variant="ghost"
      />
      <StickyFooterSpacer />
    </ScrollScreen>
  );
}
