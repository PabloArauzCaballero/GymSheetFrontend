import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';
import { exerciseGroupLabelEs } from '@gymsheet/domain';
import { routineExerciseLimits as limits } from '@gymsheet/types';
import type { DraftExercise } from '@gymsheet/hooks';
import { numericInputProps } from '@/components/keyboard';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { colors, iconSizes, minTouchTarget, radii, shadows, spacing } from '@/theme';

/** Duración con la que arranca una serie por tiempo (una plancha típica). */
export const DEFAULT_DURATION_SEC = 30;

export function digits(value: string, max: number): number | null {
  const clean = value.replace(/[^0-9]/gu, '').slice(0, 4);
  if (clean === '') return null;
  return Math.min(Number.parseInt(clean, 10), max);
}

function show(value: number | null): string {
  return value === null ? '' : String(value);
}

export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  tone = colors.text,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: string;
  testID?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      disabled={disabled}
      haptic="selection"
      onPress={onPress}
      scaleTo={0.94}
      style={{
        width: minTouchTarget,
        height: minTouchTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.full,
        backgroundColor: colors.surfaceHigh,
        opacity: disabled ? 0.35 : 1,
      }}
      testID={testID}
    >
      <Ionicons
        accessibilityElementsHidden
        color={tone}
        importantForAccessibility="no-hide-descendants"
        name={icon}
        size={iconSizes.md}
      />
    </PressableScale>
  );
}

/** Acción secundaria de texto con icono, 44 de alto. */
export function QuietButton({
  icon,
  label,
  onPress,
  tone = 'secondary',
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'secondary' | 'danger' | 'group';
  testID?: string;
}) {
  const color = tone === 'danger' ? colors.danger : tone === 'group' ? colors.group : colors.textSecondary;
  return (
    <PressableScale
      accessibilityLabel={label}
      haptic="none"
      onPress={onPress}
      scaleTo={0.96}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: minTouchTarget, paddingHorizontal: spacing.xs }}
      testID={testID}
    >
      <Ionicons accessibilityElementsHidden color={color} importantForAccessibility="no-hide-descendants" name={icon} size={iconSizes.sm} />
      <Text strong style={{ color }} variant="subhead">
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Campo numérico con texto propio mientras se edita: se muestra lo tecleado
 * (que puede quedar vacío un instante) y el borrador solo recibe valores
 * válidos; al salir vuelve a mostrar el valor del borrador. Sin esto, borrar
 * «3» para escribir «4» dejaba «14».
 */
export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  testID,
}: {
  label: string;
  testID: string;
  value: number | null;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  return (
    <View style={{ flex: 1 }}>
      <Input
        keyboardType="number-pad"
        {...numericInputProps}
        label={label}
        onBlur={() => setTyped(null)}
        onChangeText={(raw) => {
          setTyped(raw.replace(/[^0-9]/gu, ''));
          onChange(raw);
        }}
        placeholder={placeholder}
        testID={testID}
        value={typed ?? show(value)}
      />
    </View>
  );
}

/**
 * Un ejercicio del día en el editor: orden con flechas, «Repeticiones / Por
 * tiempo», series, reps o duración, RIR, descanso y nota; «Repetir» (el mismo
 * ejercicio otra vez, p. ej. en otro bloque) y «Quitar». En modo selección la
 * tarjeta entera marca o desmarca, y mantener pulsado entra en ese modo.
 *
 * `grouped`: va dentro de un `GroupBlock` (sin tarjeta propia, con insignia A1).
 */
export function ExerciseEditor({
  exercise,
  position,
  total,
  badge,
  grouped = false,
  restRole = 'set',
  selecting = false,
  selected = false,
  issues = [],
  onToggleSelect,
  onLongPress,
  onMove,
  onRemove,
  onRepeat,
  onChange,
  onTimed,
}: {
  exercise: DraftExercise;
  position: number;
  total: number;
  badge?: string;
  grouped?: boolean;
  /**
   * Qué significa su descanso: tras cada serie (suelto), tras la vuelta (último
   * de un bloque) o nada (los demás del bloque: allí manda la transición).
   */
  restRole?: 'set' | 'round' | 'none';
  selecting?: boolean;
  selected?: boolean;
  issues?: readonly string[];
  onToggleSelect: () => void;
  onLongPress: () => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  onRepeat: () => void;
  onChange: (cambios: Partial<Omit<DraftExercise, 'uid'>>) => void;
  onTimed: (duracionSeg: number | null) => void;
}) {
  const timed = exercise.duracionSeg !== null;
  const invertedReps =
    !timed && exercise.repsMin !== null && exercise.repsMax !== null && exercise.repsMin > exercise.repsMax;
  const muscle = exerciseGroupLabelEs(exercise.grupoMuscular);

  const nameBlock = (
    <View style={{ flex: 1, gap: spacing.xxs, minHeight: minTouchTarget, justifyContent: 'center' }}>
      <Text numberOfLines={2} variant="headline">
        {badge || selecting ? exercise.nombre : `${position}. ${exercise.nombre}`}
      </Text>
      {muscle ? (
        <Text tone="muted" variant="footnote">
          {muscle}
        </Text>
      ) : null}
    </View>
  );

  const head = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {selecting ? (
        <Ionicons
          accessibilityElementsHidden
          color={selected ? colors.group : colors.textMuted}
          importantForAccessibility="no-hide-descendants"
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={iconSizes.lg}
        />
      ) : badge ? (
        <View
          style={{
            minWidth: minTouchTarget - spacing.md,
            paddingHorizontal: spacing.xs,
            paddingVertical: spacing.xxs,
            borderRadius: radii.full,
            alignItems: 'center',
            backgroundColor: colors.groupTint,
            borderWidth: 1,
            borderColor: colors.group,
          }}
        >
          <Text strong tabular tone="group" variant="caption">
            {badge}
          </Text>
        </View>
      ) : null}
      {selecting ? (
        nameBlock
      ) : (
        <PressableScale
          accessibilityHint="Mantén pulsado para seleccionar y unir en superserie"
          accessibilityLabel={exercise.nombre}
          haptic="none"
          onLongPress={onLongPress}
          onPress={() => undefined}
          scaleTo={1}
          style={{ flex: 1 }}
        >
          {nameBlock}
        </PressableScale>
      )}
      {selecting ? null : (
        <>
          <IconButton
            disabled={position === 1}
            icon="chevron-up"
            label={`Subir ${exercise.nombre}`}
            onPress={() => onMove(-1)}
          />
          <IconButton
            disabled={position === total}
            icon="chevron-down"
            label={`Bajar ${exercise.nombre}`}
            onPress={() => onMove(1)}
          />
        </>
      )}
    </View>
  );

  const frame = grouped
    ? { gap: spacing.smd, paddingVertical: spacing.sm }
    : {
        gap: spacing.smd,
        padding: spacing.md,
        borderRadius: radii.xl,
        borderCurve: 'continuous' as const,
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e1,
      };

  if (selecting) {
    return (
      <PressableScale
        accessibilityLabel={`${exercise.nombre}${badge ? `, ${badge}` : ''}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        haptic="selection"
        onPress={onToggleSelect}
        style={[
          frame,
          selected && !grouped ? { borderWidth: 1, borderColor: colors.group } : null,
        ]}
        testID={`order-select-${position}`}
      >
        {head}
      </PressableScale>
    );
  }

  return (
    <View style={frame} testID={`order-exercise-${position}`}>
      {head}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <ChoiceChip
          label="Repeticiones"
          onSelect={() => onTimed(null)}
          selected={!timed}
          testID={`mode-reps-${position}`}
        />
        <ChoiceChip
          label="Por tiempo"
          onSelect={() => onTimed(exercise.duracionSeg ?? DEFAULT_DURATION_SEC)}
          selected={timed}
          testID={`mode-time-${position}`}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <NumberField
          label="Series"
          onChange={(raw) => {
            const series = digits(raw, 99);
            if (series !== null && series > 0) onChange({ seriesObjetivo: series });
          }}
          placeholder="3"
          testID="field-series"
          value={exercise.seriesObjetivo}
        />
        {timed ? (
          <NumberField
            label="Duración (s)"
            onChange={(raw) => {
              const seconds = digits(raw, limits.duracionMax);
              if (seconds !== null && seconds > 0) onChange({ duracionSeg: seconds });
            }}
            placeholder={String(DEFAULT_DURATION_SEC)}
            testID="field-duration"
            value={exercise.duracionSeg}
          />
        ) : (
          <>
            <NumberField
              label="Reps mín."
              onChange={(raw) => onChange({ repsMin: digits(raw, 999) })}
              placeholder="8"
              testID="field-reps-min"
              value={exercise.repsMin}
            />
            <NumberField
              label="Reps máx."
              onChange={(raw) => onChange({ repsMax: digits(raw, 999) })}
              placeholder="12"
              testID="field-reps-max"
              value={exercise.repsMax}
            />
          </>
        )}
      </View>
      {invertedReps ? (
        <Text accessibilityRole="alert" tone="warning" variant="footnote">
          El máximo es menor que el mínimo: se guardará igual al mínimo.
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <NumberField
          label="RIR"
          onChange={(raw) => onChange({ rirObjetivo: digits(raw, limits.rirMax) })}
          placeholder="2"
          testID="field-rir"
          value={exercise.rirObjetivo}
        />
        {restRole === 'none' ? (
          <View style={{ flex: 1 }} />
        ) : (
          <NumberField
            label={restRole === 'round' ? 'Descanso tras la vuelta (s)' : 'Descanso (s)'}
            onChange={(raw) => onChange({ descansoSeg: digits(raw, limits.descansoMax) })}
            placeholder="90"
            testID="field-rest"
            value={exercise.descansoSeg}
          />
        )}
      </View>
      <Input
        label="Nota"
        maxLength={1000}
        onChangeText={(text) => onChange({ nota: text === '' ? null : text })}
        placeholder="Ej. Pausa de 1 s abajo"
        value={exercise.nota ?? ''}
      />
      {issues.map((issue) => (
        <Text accessibilityRole="alert" key={issue} tone="warning" variant="footnote">
          {issue}
        </Text>
      ))}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <QuietButton icon="copy-outline" label="Repetir" onPress={onRepeat} testID={`repeat-${position}`} />
        <QuietButton icon="trash-outline" label="Quitar" onPress={onRemove} tone="danger" testID={`remove-${position}`} />
      </View>
    </View>
  );
}
