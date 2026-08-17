import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { colors, fontSizes, minTouchTarget, radii, spacing } from '@/theme';
import { Button } from '@/components/ui';

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

export function SetEntryForm({
  initial,
  pending,
  onSubmit,
}: {
  /** Previous set's values, so a repeat is one tap. */
  initial?: Partial<SetDraft>;
  pending: boolean;
  onSubmit: (draft: { pesoKg: number; repeticiones: number; rir: number }) => void;
}) {
  const [draft, setDraft] = useState<SetDraft>({
    pesoKg: initial?.pesoKg ?? '',
    repeticiones: initial?.repeticiones ?? '',
    rir: initial?.rir ?? '',
  });

  const pesoKg = Number(draft.pesoKg.replace(',', '.'));
  const repeticiones = Number(draft.repeticiones);
  const rir = Number(draft.rir);
  // A set needs a rep count; load may legitimately be 0 (bodyweight) and RIR
  // defaults to 0 rather than blocking the save.
  const valid = Number.isFinite(repeticiones) && repeticiones > 0 && Number.isFinite(pesoKg);

  return (
    <View style={{ gap: spacing.sm }}>
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
