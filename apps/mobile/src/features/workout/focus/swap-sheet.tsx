import { Ionicons } from '@expo/vector-icons';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { ExerciseAlternative, ExerciseAlternatives } from '@gymsheet/schemas';
import type { SwapReason, SwapScope } from '@gymsheet/types';
import { workoutService } from '@/api/services';
import { BottomSheet } from '@/components/bottom-sheet';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ExerciseImage } from '@/components/media';
import { PressableScale, SegmentedPill, SegmentLabel } from '@/components/motion';
import { Text } from '@/components/text';
import { SWAP_REASONS, swapReasonLook } from '@/features/workout/swap-reasons';
import { colors, iconSizes, metricColors, minTouchTarget, radii, spacing, thumbSizes } from '@/theme';

export type SwapTarget = {
  /** Ejercicio de la sesión que se cambia. */
  sessionExerciseId: string;
  name: string;
  /** Ya tiene series hechas: se conservan y el nuevo entra detrás. */
  hasSets: boolean;
};

/** Los equivalentes cambian poco durante una sesión: un minuto de frescura. */
const ALTERNATIVES_STALE_MS = 60_000;

export type SwapChoice = { ejercicioId: string; motivo: SwapReason; alcance: SwapScope };

/**
 * Cambiar un ejercicio a mitad de entreno, en dos toques:
 *
 * 1. **Por qué** (máquina ocupada, molestia, cambio de plan…): ordena los
 *    equivalentes — con la máquina ocupada, los de otro equipo primero.
 * 2. **Por cuál**, con el alcance a la vista: «Solo hoy» o «Siempre» (en tu
 *    rutina). «Siempre» solo aparece si la sesión viene de una rutina tuya.
 */
export function SwapSheet({
  target,
  canSaveToRoutine,
  pending,
  onClose,
  onChoose,
}: {
  target: SwapTarget | null;
  canSaveToRoutine: boolean;
  pending: boolean;
  onClose: () => void;
  onChoose: (choice: SwapChoice) => void;
}) {
  const [reason, setReason] = useState<SwapReason | null>(null);
  const [scope, setScope] = useState<SwapScope>('SESION');
  // Mientras se cierra, la hoja conserva lo último que enseñaba (no parpadea).
  const [shown, setShown] = useState<SwapTarget>({ sessionExerciseId: '', name: '', hasSets: false });
  if (target !== null && target.sessionExerciseId !== shown.sessionExerciseId) setShown(target);
  useEffect(() => {
    if (target === null) return;
    setReason(null);
    setScope('SESION');
  }, [target]);

  const alternatives = useQuery({
    queryKey: ['workout-alternatives', shown.sessionExerciseId, reason],
    queryFn: () => workoutService.alternatives(shown.sessionExerciseId, reason ?? undefined),
    enabled: target !== null && reason !== null,
    staleTime: ALTERNATIVES_STALE_MS,
  });

  const picking = reason !== null;
  return (
    <BottomSheet
      onClose={onClose}
      subtitle={picking ? pickingSubtitle(shown.hasSets) : shown.name}
      testID="swap-sheet"
      title={picking ? 'Elige el reemplazo' : '¿Por qué lo cambias?'}
      visible={target !== null}
    >
      {picking ? (
        <View style={{ gap: spacing.md }}>
          {canSaveToRoutine ? (
            <SegmentedPill
              fill
              itemStyle={{ minHeight: minTouchTarget, alignItems: 'center', justifyContent: 'center' }}
              onChange={setScope}
              options={[
                { value: 'SESION', accessibilityLabel: 'Solo hoy' },
                { value: 'RUTINA', accessibilityLabel: 'Siempre, también en mi rutina' },
              ]}
              renderItem={(option, active) => (
                <SegmentLabel
                  active={active}
                  activeColor={colors.text}
                  inactiveColor={colors.textMuted}
                  label={option.value === 'SESION' ? 'Solo hoy' : 'Siempre'}
                  style={{ fontWeight: '600' }}
                />
              )}
              style={{ padding: spacing.xxs, borderRadius: radii.full, backgroundColor: colors.surfaceHigh }}
              value={scope}
            />
          ) : null}

          <AlternativesList
            disabled={pending}
            onPick={(ejercicioId) => onChoose({ ejercicioId, motivo: reason, alcance: scope })}
            query={alternatives}
          />

          <PressableScale
            accessibilityLabel="Cambiar el motivo"
            haptic="none"
            onPress={() => setReason(null)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: minTouchTarget }}
          >
            <Ionicons color={colors.textMuted} name="chevron-back" size={iconSizes.sm} />
            <Text tone="muted" variant="subhead">
              Cambiar el motivo
            </Text>
          </PressableScale>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {SWAP_REASONS.map((code) => {
            const look = swapReasonLook(code);
            const tone = metricColors[look.metric];
            return (
              <PressableScale
                accessibilityLabel={look.label}
                haptic="selection"
                key={code}
                onPress={() => setReason(code)}
                style={{
                  flexBasis: '47%',
                  flexGrow: 1,
                  minHeight: minTouchTarget + spacing.xl,
                  padding: spacing.smd,
                  gap: spacing.sm,
                  borderRadius: radii.lg,
                  borderCurve: 'continuous',
                  backgroundColor: colors.surfaceHigh,
                }}
                testID={`swap-reason-${code}`}
              >
                <View
                  style={{
                    width: iconSizes['2xl'] - spacing.xs,
                    height: iconSizes['2xl'] - spacing.xs,
                    borderRadius: radii.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: tone.tint,
                  }}
                >
                  <Ionicons color={tone.ink} name={look.icon} size={iconSizes.md} />
                </View>
                <Text strong variant="subhead">
                  {look.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      )}
    </BottomSheet>
  );
}

function pickingSubtitle(hasSets: boolean): string {
  return hasSets
    ? 'Lo que ya hiciste se guarda; el nuevo sigue con las series que faltan.'
    : 'Mismo sitio y mismo objetivo; cambia solo el ejercicio.';
}

function AlternativesList({
  query,
  disabled,
  onPick,
}: {
  query: UseQueryResult<ExerciseAlternatives>;
  disabled: boolean;
  onPick: (exerciseId: string) => void;
}) {
  if (query.isPending) {
    return (
      <View style={{ gap: spacing.sm }}>
        <Skeleton height={thumbSizes.row} />
        <Skeleton height={thumbSizes.row} />
        <Skeleton height={thumbSizes.row} />
      </View>
    );
  }
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.data.alternativas.length === 0) {
    return (
      <Text tone="muted" variant="subhead">
        No encontramos equivalentes en tu catálogo. Puedes omitirlo y añadir otro desde el menú.
      </Text>
    );
  }
  return (
    <View style={{ gap: spacing.xs }}>
      {query.data.alternativas.map((item) => (
        <AlternativeRow disabled={disabled} item={item} key={item.id} onPress={() => onPick(item.id)} />
      ))}
    </View>
  );
}

function AlternativeRow({
  item,
  disabled,
  onPress,
}: {
  item: ExerciseAlternative;
  disabled: boolean;
  onPress: () => void;
}) {
  const detail = [item.grupoMuscular, item.equipo].filter(Boolean).join(' · ');
  return (
    <PressableScale
      accessibilityHint="Lo cambia ahora"
      accessibilityLabel={detail ? `${item.nombre}, ${detail}` : item.nombre}
      disabled={disabled}
      haptic="selection"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.smd,
        minHeight: minTouchTarget + spacing.md,
        padding: spacing.xs,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
      }}
      testID={`swap-option-${item.id}`}
    >
      <View style={{ width: thumbSizes.stack + spacing.sm, height: thumbSizes.stack + spacing.sm }}>
        <ExerciseImage
          exercise={{ nombre: item.nombre, grupoMuscular: item.grupoMuscular, imagenUrl: item.imagenUrl, media: [] }}
          rounded={radii.md}
          size="fill"
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} strong variant="subhead">
          {item.nombre}
        </Text>
        {detail ? (
          <Text numberOfLines={1} tone="muted" variant="footnote">
            {detail}
          </Text>
        ) : null}
      </View>
      <Ionicons color={colors.textMuted} name="swap-horizontal" size={iconSizes.md} />
    </PressableScale>
  );
}
