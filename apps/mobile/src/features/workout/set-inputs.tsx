import { Ionicons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';
import { numericInputProps } from '@/components/keyboard';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, comfortableTouchTarget, fontSizes, iconSizes, minTouchTarget, radii, spacing, tabularNums } from '@/theme';
import { kgLabel } from '@/features/workout/workout-flow';

/** Lo que se está tecleando de la serie: texto, para no pelear con el teclado. */
export type SetDraft = { pesoKg: string; repeticiones: string; rir: string };

export const EMPTY_DRAFT: SetDraft = { pesoKg: '', repeticiones: '', rir: '' };

export function parseDraft(draft: SetDraft): { pesoKg: number; repeticiones: number; rir: number } | null {
  const pesoKg = draft.pesoKg.trim() === '' ? 0 : Number(draft.pesoKg.replace(',', '.'));
  const repeticiones = Number(draft.repeticiones);
  const rir = draft.rir.trim() === '' ? 0 : Number(draft.rir);
  if (!Number.isFinite(pesoKg) || pesoKg < 0) return null;
  if (!Number.isInteger(repeticiones) || repeticiones < 1) return null;
  return { pesoKg, repeticiones, rir: Number.isFinite(rir) ? Math.max(0, Math.min(10, Math.round(rir))) : 0 };
}

function Field({
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
function Chip({ label, spoken, onPress, testID }: { label: string; spoken?: string; onPress: () => void; testID?: string }) {
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

/**
 * Los campos de la serie del ejercicio actual (C8.3.3): peso, reps y RIR
 * grandes, «Última vez: 9 × 80 kg» que al tocarlo rellena, y los ajustes de un
 * toque. El botón «Registrar serie» no está aquí: va fijo abajo.
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
  /** La mejor serie de la última vez que se hizo este ejercicio, en otra sesión. */
  lastTime?: { pesoKg: number; repeticiones: number; when: string } | null;
}) {
  const bump = (field: keyof SetDraft, delta: number) => {
    const current = Number(String(value[field]).replace(',', '.'));
    const base = Number.isFinite(current) ? current : 0;
    const next = Math.max(0, Math.round((base + delta) * 100) / 100);
    onChange({ ...value, [field]: String(next) });
  };
  const step = kgLabel(weightIncrementKg);

  return (
    <View style={{ gap: spacing.smd }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Field
          decimal
          label="Peso"
          onChange={(pesoKg) => onChange({ ...value, pesoKg })}
          suffix="kg"
          testID="set-weight"
          value={value.pesoKg}
        />
        <Field label="Reps" onChange={(repeticiones) => onChange({ ...value, repeticiones })} testID="set-reps" value={value.repeticiones} />
        <Field label="RIR" onChange={(rir) => onChange({ ...value, rir })} testID="set-rir" value={value.rir} />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <Chip label={`−${step} kg`} onPress={() => bump('pesoKg', -weightIncrementKg)} spoken={`Quitar ${step} kilos`} />
        <Chip label={`+${step} kg`} onPress={() => bump('pesoKg', weightIncrementKg)} spoken={`Sumar ${step} kilos`} />
        <Chip label="−1 rep" onPress={() => bump('repeticiones', -1)} spoken="Una repetición menos" />
        <Chip label="+1 rep" onPress={() => bump('repeticiones', 1)} spoken="Una repetición más" />
      </View>
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
            borderRadius: radii.md,
            backgroundColor: colors.surface,
          }}
          testID="last-time"
        >
          <Ionicons color={colors.textSecondary} name="time-outline" size={iconSizes.sm} />
          <Text style={{ flex: 1 }} tone="secondary" variant="subhead">
            {'Última vez: '}
            <Text strong tabular variant="subhead">
              {`${lastTime.repeticiones} × ${kgLabel(lastTime.pesoKg)} kg`}
            </Text>
          </Text>
          <Text tone="muted" variant="footnote">
            {lastTime.when}
          </Text>
        </PressableScale>
      ) : null}

    </View>
  );
}
