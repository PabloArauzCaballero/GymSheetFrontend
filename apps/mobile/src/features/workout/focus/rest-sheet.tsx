import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { StepButton } from '@/features/workout/focus/stepper';
import {
  clampRest,
  REST_BETWEEN_MAX_SEC,
  REST_MAX_SEC,
  REST_SHORTCUTS,
  REST_STEP,
  restLabel,
} from '@/features/workout/workout-flow';
import { MAX_TIMED_SET_SEC } from '@/features/workout/workout-flow';
import { colors, fontFamilies, heroNumberFontSize, iconSizes, metricColors, minTouchTarget, radii, spacing, tabularNums, type MetricKey } from '@/theme';

export type RestSheetTarget = {
  exerciseId: string;
  name: string;
  /** Descanso tras la serie (o tras la vuelta, en un bloque). */
  restSec: number;
  /** Transición dentro de una superserie; `null` si el ejercicio va suelto. */
  betweenSec: number | null;
  /** Tiempo de trabajo de un ejercicio por tiempo; `null` si va por repeticiones. */
  workSec: number | null;
  /** Cuántos ejercicios más tienen trabajo pendiente hoy. */
  others: number;
  /** «Guardar en mi rutina» solo si la sesión nació de una rutina propia. */
  canSaveToRoutine: boolean;
  routineName: string | null;
};

export type RestSheetResult = {
  restSec: number;
  betweenSec: number | null;
  workSec: number | null;
  scope: 'one' | 'remaining';
  saveToRoutine: boolean;
};

function Dial({
  label,
  hint,
  icon,
  metric,
  value,
  onChange,
  max,
  min = 0,
  testID,
}: {
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  metric: MetricKey;
  value: number;
  onChange: (next: number) => void;
  max: number;
  min?: number;
  testID: string;
}) {
  const tone = metricColors[metric];
  const step = (direction: -1 | 1) => onChange(Math.max(min, Math.min(max, value + direction * REST_STEP)));
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ width: 28, height: 28, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.tint }}>
          <Ionicons color={tone.ink} name={icon} size={iconSizes.sm} />
        </View>
        <View style={{ flex: 1 }}>
          <Text strong variant="subhead">
            {label}
          </Text>
          <Text tone="muted" variant="caption">
            {hint}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
        <StepButton icon="remove" label={`Cinco segundos menos de ${label.toLowerCase()}`} onStep={() => step(-1)} testID={`${testID}-minus`} />
        <Text
          accessibilityLabel={`${label}: ${Math.floor(value / 60)} minutos y ${value % 60} segundos`}
          accessibilityLiveRegion="polite"
          style={[{ flex: 1, textAlign: 'center', color: colors.text, fontFamily: fontFamilies.display, fontSize: heroNumberFontSize }, tabularNums]}
          testID={testID}
        >
          {restLabel(value)}
        </Text>
        <StepButton icon="add" label={`Cinco segundos más de ${label.toLowerCase()}`} onStep={() => step(1)} testID={`${testID}-plus`} />
      </View>
    </View>
  );
}

function ScopeOption({
  icon,
  title,
  detail,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={`${title}. ${detail}`}
      haptic="selection"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.smd,
        minHeight: minTouchTarget + spacing.lg,
        padding: spacing.smd,
        borderRadius: radii.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceHigh,
      }}
      testID={testID}
    >
      <View style={{ width: 40, height: 40, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', backgroundColor: metricColors.rest.tint }}>
        <Ionicons color={metricColors.rest.ink} name={icon} size={iconSizes.md} />
      </View>
      <View style={{ flex: 1 }}>
        <Text strong variant="body">
          {title}
        </Text>
        <Text tone="muted" variant="footnote">
          {detail}
        </Text>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={iconSizes.sm} />
    </PressableScale>
  );
}

/**
 * Descanso e intervalo a mano (D2). Primero se elige el tiempo; al aceptar se
 * pregunta a quién aplica: solo a este ejercicio o a todos los que quedan hoy.
 * La pregunta va DESPUÉS de elegir porque es entonces cuando se sabe si el
 * cambio era «hoy vengo cansado» (todos) o «este me pide más» (solo este).
 */
export function RestSheet({
  target,
  onClose,
  onApply,
}: {
  target: RestSheetTarget | null;
  onClose: () => void;
  onApply: (result: RestSheetResult) => void;
}) {
  const [shown, setShown] = useState<RestSheetTarget | null>(null);
  if (target !== null && target !== shown) setShown(target);
  const [rest, setRest] = useState(90);
  const [between, setBetween] = useState<number | null>(null);
  const [work, setWork] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const [save, setSave] = useState(false);

  useEffect(() => {
    if (!target) return;
    setRest(clampRest(target.restSec));
    setBetween(target.betweenSec === null ? null : clampRest(target.betweenSec, REST_BETWEEN_MAX_SEC));
    setWork(target.workSec);
    setAsking(false);
    setSave(false);
  }, [target]);

  if (!shown) return null;

  const submit = (scope: 'one' | 'remaining') =>
    onApply({ restSec: rest, betweenSec: between, workSec: work, scope, saveToRoutine: save && shown.canSaveToRoutine });

  const accept = () => {
    // Sin nadie más a quien aplicarlo ni rutina donde guardarlo, no hay nada que preguntar.
    if (shown.others === 0 && !shown.canSaveToRoutine) submit('one');
    else setAsking(true);
  };

  return (
    <BottomSheet
      onClose={onClose}
      subtitle={asking ? `Descanso de ${restLabel(rest)}${between !== null ? ` · ${restLabel(between)} entre ejercicios` : ''}` : shown.name}
      testID="rest-sheet"
      title={asking ? '¿Aplicar también a los demás?' : 'Descanso'}
      visible={target !== null}
    >
      {asking ? (
        <View style={{ gap: spacing.sm }}>
          {shown.canSaveToRoutine ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.smd,
                minHeight: minTouchTarget + spacing.sm,
                paddingHorizontal: spacing.smd,
                borderRadius: radii.lg,
                borderCurve: 'continuous',
                backgroundColor: colors.surfaceSunken,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text strong variant="subhead">
                  Guardar en mi rutina
                </Text>
                <Text numberOfLines={1} tone="muted" variant="caption">
                  {shown.routineName ? `Así queda para la próxima en «${shown.routineName}»` : 'Así queda para la próxima vez'}
                </Text>
              </View>
              <Switch
                accessibilityLabel="Guardar en mi rutina"
                onValueChange={(value) => {
                  void Haptics.selectionAsync();
                  setSave(value);
                }}
                testID="rest-save-routine"
                thumbColor={colors.text}
                trackColor={{ false: colors.surfaceHighest, true: metricColors.rest.edge }}
                value={save}
              />
            </View>
          ) : null}
          <ScopeOption detail="Los demás siguen como están" icon="radio-button-on-outline" onPress={() => submit('one')} testID="rest-scope-one" title="Solo este ejercicio" />
          {shown.others > 0 ? (
            <ScopeOption
              detail={`Este y ${shown.others === 1 ? 'el otro que queda' : `los otros ${shown.others} que quedan`}`}
              icon="layers-outline"
              onPress={() => submit('remaining')}
              testID="rest-scope-remaining"
              title="A todos los que quedan hoy"
            />
          ) : null}
          <Button label="Cambiar el tiempo" onPress={() => setAsking(false)} variant="ghost" />
        </View>
      ) : (
        <View style={{ gap: spacing.lg }}>
          <Dial
            hint={between !== null ? 'Al terminar la vuelta' : 'Entre serie y serie'}
            icon="hourglass-outline"
            label="Descanso"
            max={REST_MAX_SEC}
            metric="rest"
            onChange={setRest}
            testID="rest-value"
            value={rest}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {REST_SHORTCUTS.map((seconds) => {
              const active = rest === seconds;
              return (
                <PressableScale
                  accessibilityLabel={`Descanso de ${restLabel(seconds)}`}
                  accessibilityState={{ selected: active }}
                  haptic="selection"
                  key={seconds}
                  onPress={() => setRest(seconds)}
                  scaleTo={0.94}
                  style={{
                    minWidth: 60,
                    height: minTouchTarget,
                    paddingHorizontal: spacing.smd,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: radii.full,
                    borderWidth: 1.5,
                    borderColor: active ? metricColors.rest.ink : 'transparent',
                    backgroundColor: active ? metricColors.rest.tint : colors.surfaceHighest,
                  }}
                  testID={`rest-shortcut-${seconds}`}
                >
                  <Text strong tabular variant="subhead">
                    {restLabel(seconds)}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
          {between !== null ? (
            <Dial
              hint="Para cambiar de ejercicio dentro del bloque"
              icon="swap-horizontal-outline"
              label="Entre ejercicios"
              max={REST_BETWEEN_MAX_SEC}
              metric="time"
              onChange={setBetween}
              testID="rest-between"
              value={between}
            />
          ) : null}
          {work !== null ? (
            <Dial
              hint="Lo que dura cada serie"
              icon="stopwatch-outline"
              label="Tiempo de trabajo"
              max={MAX_TIMED_SET_SEC}
              metric="time"
              min={REST_STEP}
              onChange={setWork}
              testID="rest-work"
              value={work}
            />
          ) : null}
          <Button label="Aceptar" onPress={accept} size="lg" testID="rest-accept" />
        </View>
      )}
    </BottomSheet>
  );
}
