import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import type { SkipReason } from '@gymsheet/types';
import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { SKIP_REASONS } from '@/features/workout/workout-flow';
import { colors, fontSizes, iconSizes, metricColors, minTouchTarget, radii, spacing, type MetricKey } from '@/theme';

/** Cada motivo con su glifo y su color: se reconoce sin leer. */
const REASON_LOOK: Record<SkipReason, { icon: keyof typeof Ionicons.glyphMap; metric: MetricKey }> = {
  CANSANCIO: { icon: 'battery-dead-outline', metric: 'effort' },
  PRISA: { icon: 'time-outline', metric: 'time' },
  DOLOR: { icon: 'bandage-outline', metric: 'volume' },
  EQUIPO_OCUPADO: { icon: 'people-outline', metric: 'weight' },
  TECNICA: { icon: 'school-outline', metric: 'reps' },
  OTRO: { icon: 'ellipsis-horizontal', metric: 'skipped' },
};

export type ReasonSheetMode = { kind: 'set'; label: string } | { kind: 'exercise'; label: string } | null;

const NOTE_MAX = 280;

/**
 * «¿Por qué?» de saltar una serie u omitir un ejercicio (D1). Un toque en el
 * motivo y listo: nadie quiere rellenar un formulario entre series. Solo
 * «Otro motivo» abre un campo, y es opcional.
 */
export function ReasonSheet({
  mode,
  onClose,
  onChoose,
}: {
  mode: ReasonSheetMode;
  onClose: () => void;
  onChoose: (reason: SkipReason, note: string | null) => void;
}) {
  const [other, setOther] = useState(false);
  const [note, setNote] = useState('');
  // Mientras se cierra, la hoja conserva lo último que enseñaba.
  const [shown, setShown] = useState<Exclude<ReasonSheetMode, null>>({ kind: 'set', label: '' });
  if (mode !== null && mode !== shown) setShown(mode);
  useEffect(() => {
    if (mode !== null) {
      setOther(false);
      setNote('');
    }
  }, [mode]);

  const isSet = shown.kind === 'set';
  return (
    <BottomSheet
      onClose={onClose}
      subtitle={
        isSet
          ? `${shown.label}. No cuenta para tu volumen ni tus récords, y puedes deshacerlo.`
          : `${shown.label}. Lo que ya hiciste se guarda, y puedes retomarlo después.`
      }
      testID="reason-sheet"
      title={isSet ? '¿Por qué la saltas?' : '¿Por qué lo omites?'}
      visible={mode !== null}
    >
      {other ? (
        <View style={{ gap: spacing.md }}>
          <TextInput
            accessibilityLabel="Motivo, opcional"
            autoFocus
            maxLength={NOTE_MAX}
            multiline
            onChangeText={setNote}
            placeholder="Cuéntalo si quieres (opcional)"
            placeholderTextColor={colors.textMuted}
            style={{
              minHeight: 96,
              padding: spacing.md,
              borderRadius: radii.lg,
              borderCurve: 'continuous',
              backgroundColor: colors.surfaceSunken,
              color: colors.text,
              fontSize: fontSizes.md,
              textAlignVertical: 'top',
            }}
            testID="reason-note"
            value={note}
          />
          <Button
            label={isSet ? 'Saltar serie' : 'Omitir ejercicio'}
            onPress={() => onChoose('OTRO', note.trim() === '' ? null : note.trim())}
            size="lg"
            testID="reason-confirm"
          />
          <Button label="Volver a los motivos" onPress={() => setOther(false)} variant="ghost" />
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {SKIP_REASONS.map((reason) => {
            const look = REASON_LOOK[reason.code];
            const tone = metricColors[look.metric];
            return (
              <PressableScale
                accessibilityLabel={reason.label}
                haptic="selection"
                key={reason.code}
                onPress={() => (reason.code === 'OTRO' ? setOther(true) : onChoose(reason.code, null))}
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
                testID={`reason-${reason.code}`}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: tone.tint,
                  }}
                >
                  <Ionicons color={tone.ink} name={look.icon} size={iconSizes.md} />
                </View>
                <Text strong variant="subhead">
                  {reason.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      )}
    </BottomSheet>
  );
}
