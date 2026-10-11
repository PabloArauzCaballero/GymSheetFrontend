import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { colors, comfortableTouchTarget, iconSizes, minTouchTarget, radii, spacing } from '@/theme';
import { RestRing } from '@/features/workout/rest-ring';
import {
  REST_PRESETS,
  REST_STEP_SEC,
  formatRestClock,
  speakRest,
  useRestRemaining,
  useWorkoutStore,
} from '@/features/workout/workout-store';

/** Alto de la mini-barra (el entreno reserva este hueco al final del scroll). */
export const REST_BAR_HEIGHT = 60;

function StepButton({ label, spoken, onPress, testID }: { label: string; spoken: string; onPress: () => void; testID?: string }) {
  return (
    <PressableScale
      accessibilityLabel={spoken}
      haptic="selection"
      onPress={onPress}
      scaleTo={0.94}
      style={{
        minWidth: minTouchTarget,
        height: minTouchTarget,
        paddingHorizontal: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.md,
        backgroundColor: colors.surfaceHighest,
      }}
      testID={testID}
    >
      <Text strong tabular variant="subhead">
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Descanso en curso como mini-barra (C8.3.3): anillo de 28, «1:24» tabular,
 * −15 / +15 y «Saltar». Va encima del botón fijo y la pantalla le reserva el
 * hueco, así no tapa ningún control. Tocar el reloj abre la hoja con el anillo
 * grande y los presets 60/90/120/180.
 */
export function RestBar() {
  const { remainingMs, totalMs, running, finished } = useRestRemaining();
  const next = useWorkoutStore((state) => state.restNext);
  const adjust = useWorkoutStore((state) => state.adjustRest);
  const skip = useWorkoutStore((state) => state.skipRest);
  const [open, setOpen] = useState(false);

  if (!running && !finished) return null;

  const frame = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    minHeight: REST_BAR_HEIGHT,
    paddingLeft: spacing.smd,
    paddingRight: spacing.sm,
    borderRadius: radii.xl,
    borderCurve: 'continuous' as const,
    backgroundColor: colors.surfaceHighest,
  };

  if (!running) {
    return (
      <View accessibilityLiveRegion="polite" style={frame} testID="rest-bar-done">
        <Ionicons color={colors.success} name="checkmark-circle" size={iconSizes.lg} />
        <View style={{ flex: 1 }}>
          <Text strong variant="subhead">
            Descanso terminado
          </Text>
          {next ? (
            <Text numberOfLines={1} tone="secondary" variant="footnote">
              {`Siguiente: ${next}`}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  const progress = totalMs > 0 ? remainingMs / totalMs : 0;
  return (
    <>
      <View style={frame} testID="rest-bar">
        <PressableScale
          accessibilityHint="Abre los ajustes del descanso"
          accessibilityLabel={speakRest(remainingMs)}
          haptic="none"
          onPress={() => setOpen(true)}
          scaleTo={0.97}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTouchTarget }}
          testID="rest-bar-expand"
        >
          <RestRing progress={progress} size={28} stroke={4} />
          <View style={{ flex: 1 }}>
            <Text strong style={{ minWidth: 56 }} tabular testID="rest-bar-clock" variant="headline">
              {formatRestClock(remainingMs)}
            </Text>
            {next ? (
              <Text numberOfLines={1} tone="secondary" variant="caption">
                {`Siguiente: ${next}`}
              </Text>
            ) : null}
          </View>
        </PressableScale>
        <StepButton label={`−${REST_STEP_SEC}`} onPress={() => adjust(-REST_STEP_SEC)} spoken={`Quitar ${REST_STEP_SEC} segundos`} />
        <StepButton label={`+${REST_STEP_SEC}`} onPress={() => adjust(REST_STEP_SEC)} spoken={`Añadir ${REST_STEP_SEC} segundos`} />
        <StepButton label="Saltar" onPress={skip} spoken="Saltar el descanso" testID="rest-skip" />
      </View>
      <RestSheet onClose={() => setOpen(false)} visible={open} />
    </>
  );
}

/** La hoja del descanso: anillo grande, ajuste fino, presets y lo que viene. */
function RestSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { remainingMs, totalMs, running } = useRestRemaining();
  const next = useWorkoutStore((state) => state.restNext);
  const adjust = useWorkoutStore((state) => state.adjustRest);
  const preset = useWorkoutStore((state) => state.setRestPreset);
  const skip = useWorkoutStore((state) => state.skipRest);
  const ring = 200;
  const progress = totalMs > 0 ? remainingMs / totalMs : 0;

  return (
    <BottomSheet onClose={onClose} subtitle={next ? `Siguiente: ${next}` : undefined} testID="rest-sheet" title="Descanso" visible={visible && running}>
      <View style={{ alignItems: 'center', justifyContent: 'center', height: ring }}>
        <RestRing progress={progress} size={ring} stroke={10} />
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text accessibilityLabel={speakRest(remainingMs)} accessibilityLiveRegion="polite" tabular variant="display">
            {formatRestClock(remainingMs)}
          </Text>
          <Text tabular tone="muted" variant="footnote">
            {`de ${formatRestClock(totalMs)}`}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {REST_PRESETS.map((seconds) => (
          <PressableScale
            accessibilityLabel={`Descansar ${formatRestClock(seconds * 1000)}`}
            haptic="selection"
            key={seconds}
            onPress={() => preset(seconds)}
            style={{
              flex: 1,
              minHeight: comfortableTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radii.md,
              borderWidth: 1,
              borderColor: colors.borderControl,
            }}
            testID={`rest-preset-${seconds}`}
          >
            <Text strong tabular variant="subhead">
              {formatRestClock(seconds * 1000)}
            </Text>
          </PressableScale>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button label={`−${REST_STEP_SEC} s`} onPress={() => adjust(-REST_STEP_SEC)} style={{ flex: 1 }} variant="secondary" />
        <Button label={`+${REST_STEP_SEC} s`} onPress={() => adjust(REST_STEP_SEC)} style={{ flex: 1 }} variant="secondary" />
      </View>
      <Button
        label="Saltar descanso"
        onPress={() => {
          skip();
          onClose();
        }}
        variant="ghost"
      />
    </BottomSheet>
  );
}
