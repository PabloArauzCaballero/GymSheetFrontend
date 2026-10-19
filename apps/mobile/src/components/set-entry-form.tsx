import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, minTouchTarget, radii, semibold, spacing, tones } from '@/theme';
import { Button } from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { numericInputProps } from '@/components/keyboard';

export interface SetDraft {
  pesoKg: string;
  repeticiones: string;
  rir: string;
}

function formatIncrement(kg: number): string {
  return kg.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

function Stepper({
  label,
  value,
  unit,
  onChange,
  onStep,
  keyboardType = 'number-pad',
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (value: string) => void;
  onStep: (direction: -1 | 1) => void;
  keyboardType?: 'decimal-pad' | 'number-pad';
}) {
  return (
    <View style={{ flex: 1, gap: spacing.sm }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: semibold, letterSpacing: 1.1 }}>
        {label.toUpperCase()}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }}>
        {([-1, 1] as const).map((direction) =>
          direction === -1 ? (
            <PressableScale
              accessibilityLabel={`Reducir ${label.toLowerCase()}`}
              key={direction}
              onPress={() => onStep(direction)}
              style={{
                width: 40,
                height: 40,
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons color={colors.text} name="remove" size={22} />
            </PressableScale>
          ) : null,
        )}
        <View style={{ flex: 1, alignItems: 'center', minWidth: 52 }}>
          <TextInput
            accessibilityLabel={label}
            keyboardType={keyboardType}
            {...numericInputProps}
            onChangeText={onChange}
            placeholder="0"
            placeholderTextColor={colors.textDisabled}
            selectTextOnFocus
            style={{
              color: colors.text,
              fontSize: 36,
              lineHeight: 42,
              fontWeight: '800',
              fontVariant: ['tabular-nums'],
              padding: 0,
              textAlign: 'center',
              minWidth: 52,
            }}
            value={value}
          />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{unit}</Text>
        </View>
        <PressableScale
          accessibilityLabel={`Aumentar ${label.toLowerCase()}`}
          onPress={() => onStep(1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.full,
            backgroundColor: colors.surfaceHigh,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons color={colors.text} name="add" size={22} />
        </PressableScale>
      </View>
    </View>
  );
}

export function SetEntryForm({
  initial,
  previous,
  pending,
  onSubmit,
  weightIncrementKg = 2.5,
}: {
  initial?: Partial<SetDraft>;
  previous?: { pesoKg: number; repeticiones: number };
  pending: boolean;
  onSubmit: (draft: { pesoKg: number; repeticiones: number; rir: number }) => void;
  weightIncrementKg?: number;
}) {
  const [draft, setDraft] = useState<SetDraft>(() => ({
    pesoKg: initial?.pesoKg ?? (previous ? String(previous.pesoKg) : ''),
    repeticiones: initial?.repeticiones ?? (previous ? String(previous.repeticiones) : ''),
    rir: initial?.rir ?? '0',
  }));

  // History often resolves after the workout itself. Fill the empty form then,
  // while preserving anything the user has already started typing.
  useEffect(() => {
    setDraft((current) => {
      const fill = initial ?? (previous ? { pesoKg: String(previous.pesoKg), repeticiones: String(previous.repeticiones) } : undefined);
      if (!fill) return current;
      return {
        pesoKg: current.pesoKg || fill.pesoKg || '',
        repeticiones: current.repeticiones || fill.repeticiones || '',
        rir: current.rir || initial?.rir || '0',
      };
    });
  }, [initial?.pesoKg, initial?.repeticiones, initial?.rir, previous?.pesoKg, previous?.repeticiones]);

  const weight = Number(draft.pesoKg.replace(',', '.'));
  const reps = Number(draft.repeticiones);
  const rir = Number(draft.rir);
  const valid = Number.isFinite(reps) && reps > 0 && Number.isFinite(weight) && weight >= 0;

  const step = (field: 'pesoKg' | 'repeticiones', direction: -1 | 1) => {
    const amount = field === 'pesoKg' ? weightIncrementKg : 1;
    setDraft((current) => {
      const value = Number(current[field].replace(',', '.'));
      const next = Math.max(0, Math.round(((Number.isFinite(value) ? value : 0) + amount * direction) * 100) / 100);
      return { ...current, [field]: String(next) };
    });
  };

  const applyPrevious = () => {
    if (!previous) return;
    setDraft((current) => ({
      ...current,
      pesoKg: String(previous.pesoKg),
      repeticiones: String(previous.repeticiones),
    }));
  };

  return (
    <View
      style={{
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceLow,
      }}
    >
      {previous ? (
        <PressableScale
          accessibilityLabel={`Usar registro anterior: ${previous.pesoKg} kilogramos por ${previous.repeticiones} repeticiones`}
          onPress={applyPrevious}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            minHeight: 46,
            borderRadius: radii.full,
            backgroundColor: colors.surfaceHigh,
          }}
        >
          <Ionicons color={colors.volt} name="time-outline" size={18} />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, flex: 1 }}>Último registro</Text>
          <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold, fontVariant: ['tabular-nums'] }}>
            {previous.pesoKg} kg × {previous.repeticiones}
          </Text>
          <Ionicons color={colors.textMuted} name="arrow-up-outline" size={16} />
        </PressableScale>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 42 }}>
          <Ionicons color={colors.volt} name="sparkles-outline" size={18} />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>Primera vez registrando este ejercicio</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs }}>
        <Stepper
          keyboardType="decimal-pad"
          label="Peso"
          onChange={(value) => setDraft((current) => ({ ...current, pesoKg: value }))}
          onStep={(direction) => step('pesoKg', direction)}
          unit={`KG · ±${formatIncrement(weightIncrementKg)}`}
          value={draft.pesoKg}
        />
        <View style={{ width: 1, backgroundColor: colors.border, marginVertical: spacing.xs }} />
        <Stepper
          label="Reps"
          onChange={(value) => setDraft((current) => ({ ...current, repeticiones: value }))}
          onStep={(direction) => step('repeticiones', direction)}
          unit="REPS · ±1"
          value={draft.repeticiones}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons color={tones.dark.warning.text} name="flame-outline" size={18} />
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>RIR</Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>Repeticiones en reserva</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          {[0, 1, 2, 3, 4].map((value) => {
            const selected = Number(draft.rir) === value;
            return (
              <PressableScale
                accessibilityLabel={`RIR ${value === 4 ? '4 o más' : value}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={value}
                onPress={() => setDraft((current) => ({ ...current, rir: String(value) }))}
                style={{
                  flex: 1,
                  minHeight: 42,
                  borderRadius: radii.full,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? colors.voltDim : colors.surfaceHigh,
                  borderWidth: selected ? 1.5 : 1,
                  borderColor: selected ? colors.volt : 'transparent',
                }}
              >
                <Text style={{ color: selected ? colors.volt : colors.textMuted, fontSize: fontSizes.sm, fontWeight: '700' }}>
                  {value === 4 ? '4+' : value}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      </View>

      <Button
        disabled={!valid}
        icon="checkmark"
        label="Registrar serie"
        loading={pending}
        onPress={() => onSubmit({ pesoKg: weight, repeticiones: reps, rir: Number.isFinite(rir) ? rir : 0 })}
        style={{ borderRadius: radii.full, minHeight: minTouchTarget + 4 }}
      />
    </View>
  );
}
