import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { colors, fontSizes, minTouchTarget, radii, spacing } from '@/theme';
import { Button } from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { numericInputProps } from '@/components/keyboard';

/**
 * The one form used mid-workout, so it is built for a sweaty thumb between
 * sets: three numeric fields side by side, big numeric keypads, no scrolling
 * and no dropdowns. Values pre-fill from the previous set because the next one
 * is usually the same load.
 */
export interface SetDraft {
  pesoKg: string;
  repeticiones: string;
  rir: string;
}

/** «2.5» → «2,5»: coma decimal, y sin ceros de sobra («5» en vez de «5,0»). */
function formatIncrement(kg: number): string {
  return kg.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  suffix?: string;
}) {
  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          minHeight: minTouchTarget,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.sm,
        }}
      >
        <TextInput
          accessibilityLabel={label}
          // `decimal-pad` on weight (plates come in halves), plain digits elsewhere.
          keyboardType={label === 'Peso' ? 'decimal-pad' : 'number-pad'}
          // Neither pad has a return key on iOS: without the accessory bar the
          // keyboard covers «Registrar» and nothing on screen closes it.
          {...numericInputProps}
          onChangeText={onChange}
          placeholder="0"
          placeholderTextColor={colors.textDisabled}
          selectTextOnFocus
          style={{
            flex: 1,
            color: colors.text,
            fontSize: fontSizes.lg,
            fontWeight: '700',
            fontVariant: ['tabular-nums'],
            paddingVertical: spacing.sm,
          }}
          value={value}
        />
        {suffix ? (
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{suffix}</Text>
        ) : null}
      </View>
    </View>
  );
}


/** A one-tap adjustment. Deliberately not a Button: these are modifiers, not
 *  the action, and dressing them as buttons would compete with "Registrar". */
function QuickChip({
  label,
  onPress,
  wide = false,
}: {
  label: string;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flexGrow: wide ? 1 : 0,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 36,
        paddingHorizontal: spacing.md,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceHigh,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: fontSizes.xs,
          fontWeight: '700',
          fontVariant: ['tabular-nums'],
        }}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

export function SetEntryForm({
  initial,
  previous,
  pending,
  onSubmit,
  weightIncrementKg = 2.5,
}: {
  /** Previous set's values *within this session*, so a repeat is one tap. */
  initial?: Partial<SetDraft>;
  /**
   * The heaviest set of the last time this exercise was trained, in an earlier
   * session. This is the number progressive overload is actually measured
   * against: matching the set you did ninety seconds ago is not progress, and
   * beating what you did last Tuesday is. `undefined` the first time an
   * exercise is trained, which is why the chip is conditional rather than
   * disabled — there is nothing to beat yet, and saying so would be noise.
   */
  previous?: { pesoKg: number; repeticiones: number };
  pending: boolean;
  onSubmit: (draft: { pesoKg: number; repeticiones: number; rir: number }) => void;
  /**
   * Cuánto suma cada chip de peso. Preferencia de cuenta (`Ajustes`), no una
   * constante: 2.5 kg es solo el valor por defecto para quien no la cambió.
   */
  weightIncrementKg?: number;
}) {
  const [draft, setDraft] = useState<SetDraft>({
    // Falls back to the previous session when this one has no sets yet: opening
    // an exercise on an empty form asks the lifter to remember their own last
    // load, which is precisely what a training log exists to avoid.
    pesoKg: initial?.pesoKg ?? (previous ? String(previous.pesoKg) : ''),
    repeticiones: initial?.repeticiones ?? (previous ? String(previous.repeticiones) : ''),
    rir: initial?.rir ?? '',
  });

  const pesoKg = Number(draft.pesoKg.replace(',', '.'));
  const repeticiones = Number(draft.repeticiones);
  const rir = Number(draft.rir);
  // A set needs a rep count; load may legitimately be 0 (bodyweight) and RIR
  // defaults to 0 rather than blocking the save.
  const valid = Number.isFinite(repeticiones) && repeticiones > 0 && Number.isFinite(pesoKg);

  /** Applies a delta to a field, floored at zero and keeping halves on weight. */
  const bump = (field: keyof SetDraft, delta: number) =>
    setDraft((prev) => {
      const current = Number(String(prev[field]).replace(',', '.'));
      const base = Number.isFinite(current) ? current : 0;
      const next = Math.max(0, Math.round((base + delta) * 100) / 100);
      return { ...prev, [field]: String(next) };
    });

  const repeatLast =
    initial?.pesoKg || initial?.repeticiones
      ? () =>
          setDraft({
            pesoKg: initial?.pesoKg ?? '',
            repeticiones: initial?.repeticiones ?? '',
            rir: initial?.rir ?? '',
          })
      : null;

  return (
    <View style={{ gap: spacing.sm }}>
      {/* Progressive overload is arithmetic on the last set, not a fresh entry:
          almost every set is the previous one plus a couple of reps or half a
          plate. Typing that on a numeric keypad mid-set, with chalk on your
          hands, is the friction these chips remove. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {repeatLast ? <QuickChip label="Igual que la anterior" onPress={repeatLast} wide /> : null}
        {previous ? (
          // Sobrecarga sobre la sesión anterior, en un toque. Es la operación
          // que la gente hace de cabeza al llegar a la barra, y la única que
          // convierte el registro en un plan en vez de en un diario.
          <QuickChip
            label={`Superar ${previous.pesoKg} kg`}
            onPress={() =>
              setDraft((prev) => ({
                ...prev,
                pesoKg: String(previous.pesoKg + weightIncrementKg),
                repeticiones: prev.repeticiones || String(previous.repeticiones),
              }))
            }
            wide
          />
        ) : null}
        <QuickChip
          label={`+${formatIncrement(weightIncrementKg)} kg`}
          onPress={() => bump('pesoKg', weightIncrementKg)}
        />
        <QuickChip
          label={`−${formatIncrement(weightIncrementKg)} kg`}
          onPress={() => bump('pesoKg', -weightIncrementKg)}
        />
        <QuickChip label="+1 rep" onPress={() => bump('repeticiones', 1)} />
        <QuickChip label="−1 rep" onPress={() => bump('repeticiones', -1)} />
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <NumberField
          label="Peso"
          onChange={(pesoKgNext) => setDraft((prev) => ({ ...prev, pesoKg: pesoKgNext }))}
          suffix="kg"
          value={draft.pesoKg}
        />
        <NumberField
          label="Reps"
          onChange={(next) => setDraft((prev) => ({ ...prev, repeticiones: next }))}
          value={draft.repeticiones}
        />
        <NumberField
          label="RIR"
          onChange={(next) => setDraft((prev) => ({ ...prev, rir: next }))}
          value={draft.rir}
        />
      </View>
      <Button
        disabled={!valid}
        label="Registrar serie"
        loading={pending}
        onPress={() =>
          onSubmit({
            pesoKg,
            repeticiones,
            rir: Number.isFinite(rir) ? rir : 0,
          })
        }
      />
    </View>
  );
}
