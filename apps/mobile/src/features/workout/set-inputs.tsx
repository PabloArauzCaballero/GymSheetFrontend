import { Ionicons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';
import { numericInputProps } from '@/components/keyboard';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, comfortableTouchTarget, fontSizes, iconSizes, minTouchTarget, radii, spacing, tabularNums } from '@/theme';
import { kgLabel, parseSeconds } from '@/features/workout/workout-flow';

/**
 * Lo que se está tecleando de la serie: texto, para no pelear con el teclado.
 * `duracionSeg` solo se usa en un ejercicio por tiempo (plancha 45 s).
 */
export type SetDraft = { pesoKg: string; repeticiones: string; rir: string; duracionSeg: string };

export const EMPTY_DRAFT: SetDraft = { pesoKg: '', repeticiones: '', rir: '', duracionSeg: '' };

/** Serie por tiempo: los segundos (1–3600) y, si lo hay, el lastre. */
export function parseTimedDraft(draft: SetDraft): { duracionSeg: number; pesoKg?: number } | null {
  const duracionSeg = parseSeconds(draft.duracionSeg);
  const pesoKg = draft.pesoKg.trim() === '' ? 0 : Number(draft.pesoKg.replace(',', '.'));
  if (duracionSeg === null || !Number.isFinite(pesoKg) || pesoKg < 0) return null;
  return pesoKg > 0 ? { duracionSeg, pesoKg } : { duracionSeg };
}

export function parseDraft(draft: SetDraft): { pesoKg: number; repeticiones: number; rir: number } | null {
  const pesoKg = draft.pesoKg.trim() === '' ? 0 : Number(draft.pesoKg.replace(',', '.'));
  const repeticiones = Number(draft.repeticiones);
  const rir = draft.rir.trim() === '' ? 0 : Number(draft.rir);
  if (!Number.isFinite(pesoKg) || pesoKg < 0) return null;
  if (!Number.isInteger(repeticiones) || repeticiones < 1) return null;
  return { pesoKg, repeticiones, rir: Number.isFinite(rir) ? Math.max(0, Math.min(10, Math.round(rir))) : 0 };
}

export function Field({
  label,
  value,
  onChange,
  suffix,
  decimal = false,
  testID,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  suffix?: string;
  decimal?: boolean;
  testID?: string;
}) {
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <Text tone="muted" variant="footnote">
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          minHeight: comfortableTouchTarget + spacing.sm,
          paddingHorizontal: spacing.smd,
          borderRadius: radii.md,
          borderCurve: 'continuous',
          borderWidth: 1,
          borderColor: colors.borderControl,
          backgroundColor: colors.surface,
        }}
      >
        <TextInput
          accessibilityLabel={label}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          {...numericInputProps}
          onChangeText={onChange}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          selectTextOnFocus
          style={[{ flex: 1, minWidth: 0, color: colors.text, fontSize: fontSizes.lg, fontWeight: '700', paddingVertical: spacing.sm }, tabularNums]}
          testID={testID}
          value={value}
        />
        {suffix ? (
          <Text tone="muted" variant="footnote">
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Ajuste de un toque (44 de alto): modifica, no compite con «Registrar serie». */
export function Chip({ label, spoken, onPress, testID }: { label: string; spoken?: string; onPress: () => void; testID?: string }) {
  return (
    <PressableScale
      accessibilityLabel={spoken ?? label}
      haptic="selection"
      onPress={onPress}
      scaleTo={0.94}
      style={{
        minHeight: minTouchTarget,
        minWidth: minTouchTarget,
        paddingHorizontal: spacing.smd,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.full,
        backgroundColor: colors.surfaceHighest,
      }}
      testID={testID}
    >
      <Text strong tabular variant="footnote">
        {label}
      </Text>
    </PressableScale>
  );
}

function StepperField({
  label,
  value,
  unit,
  decimal = false,
  testID,
  onChange,
  onStep,
}: {
  label: string;
  value: string;
  unit: string;
  decimal?: boolean;
  testID: string;
  onChange: (next: string) => void;
  onStep: (direction: -1 | 1) => void;
}) {
  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      <Text strong tone="muted" variant="caption" style={{ letterSpacing: 1.1 }}>
        {label.toUpperCase()}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xxs }}>
        {([-1, 1] as const).map((direction) =>
          direction === -1 ? (
            <PressableScale
              accessibilityLabel={`Reducir ${label.toLowerCase()}`}
              haptic="selection"
              key={direction}
              onPress={() => onStep(direction)}
              style={{ width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surfaceHighest, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons color={colors.text} name="remove" size={iconSizes.md} />
            </PressableScale>
          ) : null,
        )}
        <View style={{ flex: 1, minWidth: 48, alignItems: 'center' }}>
          <TextInput
            accessibilityLabel={label}
            keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
            {...numericInputProps}
            onChangeText={onChange}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            selectTextOnFocus
            style={[{ minWidth: 48, padding: 0, color: colors.text, fontSize: 34, lineHeight: 40, fontWeight: '800', textAlign: 'center' }, tabularNums]}
            testID={testID}
            value={value}
          />
          <Text tone="muted" variant="caption">{unit}</Text>
        </View>
        <PressableScale
          accessibilityLabel={`Aumentar ${label.toLowerCase()}`}
          haptic="selection"
          onPress={() => onStep(1)}
          style={{ width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.surfaceHighest, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons color={colors.text} name="add" size={iconSizes.md} />
        </PressableScale>
      </View>
    </View>
  );
}

/**
 * Entrada de serie: los valores se pueden teclear o ajustar con botones
 * grandes. «Última vez» carga la marca anterior con un toque; registrar queda
 * fijo abajo durante la sesión.
 */
export function SetInputs({
  value,
  onChange,
  weightIncrementKg = 2.5,
  lastTime,
}: {
  value: SetDraft;
  onChange: (next: SetDraft) => void;
  weightIncrementKg?: number;
  /** La última serie registrada la vez anterior que se hizo este ejercicio. */
  lastTime?: { pesoKg: number; repeticiones: number; when: string } | null;
}) {
  const bump = (field: 'pesoKg' | 'repeticiones', delta: number) => {
    const current = Number(String(value[field]).replace(',', '.'));
    const base = Number.isFinite(current) ? current : 0;
    const next = Math.max(0, Math.round((base + delta) * 100) / 100);
    onChange({ ...value, [field]: String(next) });
  };
  const step = kgLabel(weightIncrementKg);
  const selectedRir = Number(value.rir || 0);

  return (
    <View style={{ gap: spacing.md, padding: spacing.md, borderRadius: radii.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surface }}>
      {lastTime ? (
        <PressableScale
          accessibilityHint="Rellena peso y repeticiones"
          accessibilityLabel={`Última vez, ${lastTime.when}: ${lastTime.repeticiones} por ${kgLabel(lastTime.pesoKg)} kilos`}
          haptic="selection"
          onPress={() =>
            onChange({ ...value, pesoKg: String(lastTime.pesoKg), repeticiones: String(lastTime.repeticiones) })
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            minHeight: minTouchTarget,
            paddingHorizontal: spacing.smd,
            borderRadius: radii.full,
            backgroundColor: colors.surfaceHighest,
          }}
          testID="last-time"
        >
          <Ionicons color={colors.textSecondary} name="time-outline" size={iconSizes.sm} />
          <Text style={{ flex: 1 }} tone="secondary" variant="footnote">
            {'Último registro · '}
            <Text strong tabular variant="subhead">
              {`${kgLabel(lastTime.pesoKg)} kg × ${lastTime.repeticiones}`}
            </Text>
          </Text>
          <Text tone="muted" variant="footnote">
            {lastTime.when}
          </Text>
        </PressableScale>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs }}>
        <StepperField
          decimal
          label="Peso"
          onChange={(pesoKg) => onChange({ ...value, pesoKg })}
          onStep={(direction) => bump('pesoKg', weightIncrementKg * direction)}
          testID="set-weight"
          unit={`KG · ±${step}`}
          value={value.pesoKg}
        />
        <View style={{ width: 1, backgroundColor: colors.borderSubtle, marginVertical: spacing.xs }} />
        <StepperField
          label="Reps"
          onChange={(repeticiones) => onChange({ ...value, repeticiones })}
          onStep={(direction) => bump('repeticiones', direction)}
          testID="set-reps"
          unit="REPS · ±1"
          value={value.repeticiones}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons color={colors.warning} name="flame-outline" size={iconSizes.sm} />
            <Text strong variant="subhead">RIR</Text>
          </View>
          <Text tone="muted" variant="caption">Repeticiones en reserva</Text>
        </View>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: spacing.xs }}>
          {[0, 1, 2, 3, 4].map((rir) => {
            const selected = rir === 4 ? selectedRir >= 4 : selectedRir === rir;
            return (
              <PressableScale
                accessibilityLabel={`RIR ${rir === 4 ? '4 o más' : rir}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                haptic="selection"
                key={rir}
                onPress={() => onChange({ ...value, rir: String(rir) })}
                style={{ flex: 1, minHeight: minTouchTarget, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.groupTint : colors.surfaceHighest, borderWidth: selected ? 1.5 : 1, borderColor: selected ? colors.group : 'transparent' }}
                testID={rir === 0 ? 'set-rir' : undefined}
              >
                <Text strong tabular tone={selected ? 'group' : 'secondary'} variant="subhead">{rir === 4 ? '4+' : rir}</Text>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </View>
  );
}
