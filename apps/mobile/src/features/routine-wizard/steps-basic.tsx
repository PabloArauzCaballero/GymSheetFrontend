import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { QUICK_MONTHS, durationInWeeks, type WizardState } from '@gymsheet/hooks';
import { trainingGoals, type TrainingGoal } from '@gymsheet/types';
import { Card, Section } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { Button, Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { WizardActionBar } from '@/components/wizard/wizard-action-bar';
import { WizardShell } from '@/components/wizard/wizard-shell';
import { useRoutineDraft } from '@/features/routine-wizard/use-wizard';
import { GOAL_LABEL } from '@/lib/format';
import { wizardStepPath } from '@/lib/wizard-routes';
import { useRoutineDraftStore } from '@/state/routine-draft-store';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

const WEEKS_STEPPER_MAX = 52;

/** Borrador encontrado en el dispositivo: se ofrece retomarlo antes de empezar de cero. */
function PendingDraftCard() {
  const pendiente = useRoutineDraftStore((store) => store.pendiente);
  const retomar = useRoutineDraftStore((store) => store.retomar);
  const descartar = useRoutineDraftStore((store) => store.descartar);
  if (!pendiente) return null;
  const name = pendiente.draft.nombre.trim() || 'Sin nombre';
  return (
    <Card accent={colors.volt}>
      <View style={{ gap: spacing.xs }}>
        <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
          Tienes un borrador sin terminar
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{`«${name}»`}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          label="Empezar de nuevo"
          onPress={descartar}
          style={{ flex: 1 }}
          variant="ghost"
        />
        <Button
          label="Retomar"
          onPress={() => {
            const resumed = retomar();
            if (resumed && resumed.paso > 0) router.push(wizardStepPath(resumed.paso));
          }}
          style={{ flex: 1 }}
        />
      </View>
    </Card>
  );
}

/**
 * «¿Salir sin guardar?» al abandonar el asistente con cambios, por el botón
 * Volver, el gesto del borde o el botón Atrás de Android. El borrador se
 * conserva en el dispositivo, y el aviso lo dice.
 */
export function useLeaveConfirmation(): void {
  const navigation = useNavigation();
  const leaving = useRef(false);
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (leaving.current || !useRoutineDraftStore.getState().state.sucio) return;
        event.preventDefault();
        Alert.alert('¿Salir sin guardar?', 'Tu borrador se guarda en este dispositivo.', [
          { text: 'Seguir editando', style: 'cancel' },
          {
            text: 'Salir',
            style: 'destructive',
            onPress: () => {
              leaving.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ]);
      }),
    [navigation],
  );
}

export function NameStep() {
  const { draft, dispatch, errors, next } = useRoutineDraft();
  const buscarPendiente = useRoutineDraftStore((store) => store.buscarPendiente);
  useEffect(() => {
    void buscarPendiente();
  }, [buscarPendiente]);
  useLeaveConfirmation();

  return (
    <WizardShell
      actions={<WizardActionBar primary={{ label: 'Siguiente', onPress: () => next(0) }} />}
      paso={0}
      subtitle="Un nombre corto que te ayude a reconocerla."
      title="¿Cómo se llama tu rutina?"
    >
      <PendingDraftCard />
      <Input
        autoCapitalize="sentences"
        error={errors(0).nombre}
        label="Nombre de la rutina"
        maxLength={160}
        onChangeText={(valor) => dispatch({ type: 'campo', campo: 'nombre', valor })}
        onSubmitEditing={() => next(0)}
        placeholder="Ej. Empuje 4 días"
        returnKeyType="next"
        testID="routine-name"
        value={draft.nombre}
      />
    </WizardShell>
  );
}

export function DescriptionStep() {
  const { draft, dispatch, errors, next } = useRoutineDraft();
  return (
    <WizardShell
      actions={<WizardActionBar primary={{ label: 'Siguiente', onPress: () => next(1) }} />}
      paso={1}
      subtitle="Opcional. Cuenta para qué sirve o a quién va dirigida."
      title="Descríbela"
    >
      <Input
        error={errors(1).descripcion}
        label="Descripción"
        maxLength={1000}
        multiline
        numberOfLines={5}
        onChangeText={(valor) => dispatch({ type: 'campo', campo: 'descripcion', valor })}
        placeholder="Ej. Pecho, hombros y tríceps con progresión de cargas."
        style={{
          minHeight: 132,
          textAlignVertical: 'top',
          paddingTop: spacing.md,
          paddingHorizontal: spacing.md,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          color: colors.text,
          fontSize: fontSizes.md,
        }}
        testID="routine-description"
        value={draft.descripcion}
      />
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, textAlign: 'right' }}>
        {`${draft.descripcion.length} / 1000`}
      </Text>
    </WizardShell>
  );
}

export function GoalStep() {
  const { draft, dispatch, next } = useRoutineDraft();
  const select = (goal: TrainingGoal) =>
    dispatch({ type: 'objetivo', objetivo: draft.objetivo === goal ? null : goal });
  return (
    <WizardShell
      actions={<WizardActionBar primary={{ label: 'Siguiente', onPress: () => next(2) }} />}
      paso={2}
      subtitle="Define las series y repeticiones con las que empiezan tus ejercicios."
      title="¿Cuál es tu objetivo?"
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {trainingGoals.map((goal) => (
          <ChoiceChip
            key={goal}
            label={GOAL_LABEL[goal]}
            onSelect={() => select(goal)}
            selected={draft.objetivo === goal}
            testID={`goal-${goal}`}
          />
        ))}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
        Puedes avanzar sin elegir uno.
      </Text>
    </WizardShell>
  );
}

/** Texto bajo la duración: «12 semanas · descarga cada 4». */
function progressionSummary(state: WizardState): string {
  const { draft } = state;
  const weeks = durationInWeeks(draft.duracion);
  const base = `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  if (!draft.progresion.activa) return `${base} · sin progresión automática`;
  return draft.progresion.descargaCada
    ? `${base} · descarga cada ${draft.progresion.descargaCada}`
    : `${base} · sin descarga`;
}

function WeeksStepper({
  value,
  onChange,
  error,
}: {
  value: number;
  onChange: (next: number) => void;
  error?: string;
}) {
  const step = (delta: number) => onChange(Math.min(WEEKS_STEPPER_MAX + 1, Math.max(1, value + delta)));
  const button = (label: string, icon: 'remove' | 'add', delta: number) => (
    <PressableScale
      accessibilityLabel={label}
      haptic="selection"
      onPress={() => step(delta)}
      style={{
        width: minTouchTarget,
        height: minTouchTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <Ionicons color={colors.text} name={icon} size={iconSizes.md} />
    </PressableScale>
  );
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {button('Una semana menos', 'remove', -1)}
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: colors.text, fontSize: fontSizes.lg, fontWeight: semibold, minWidth: 110, textAlign: 'center' }}
        >
          {`${value} ${value === 1 ? 'semana' : 'semanas'}`}
        </Text>
        {button('Una semana más', 'add', 1)}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: fontSizes.xs }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function DurationStep() {
  const { state, draft, dispatch, errors, next } = useRoutineDraft();
  const custom = draft.duracion.unidad === 'semanas';
  const cycle = [4, 5, 6] as const;
  return (
    <WizardShell
      actions={<WizardActionBar info={progressionSummary(state)} primary={{ label: 'Siguiente', onPress: () => next(3) }} />}
      paso={3}
      subtitle="Cuánto dura el programa y quién la puede ver."
      title="Duración y visibilidad"
    >
      <Section icon="lock-closed-outline" index={0} title="Visibilidad">
        <Card>
          <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
            Privada
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
            Solo tú la ves. Más adelante podrás compartirla o publicarla.
          </Text>
        </Card>
      </Section>

      <Section icon="calendar-outline" index={1} title="Duración">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {QUICK_MONTHS.map((months) => (
            <ChoiceChip
              key={months}
              label={`${months} ${months === 1 ? 'mes' : 'meses'}`}
              onSelect={() =>
                dispatch({ type: 'duracion', duracion: { unidad: 'meses', cantidad: months } })
              }
              selected={!custom && draft.duracion.cantidad === months}
              testID={`duration-${months}m`}
            />
          ))}
          <ChoiceChip
            label="A medida"
            onSelect={() =>
              dispatch({
                type: 'duracion',
                duracion: { unidad: 'semanas', cantidad: durationInWeeks(draft.duracion) },
              })
            }
            selected={custom}
            testID="duration-custom"
          />
        </View>
        {custom ? (
          <WeeksStepper
            error={errors(3).duracion}
            onChange={(cantidad) =>
              dispatch({ type: 'duracion', duracion: { unidad: 'semanas', cantidad } })
            }
            value={draft.duracion.cantidad}
          />
        ) : null}
      </Section>

      <Section icon="trending-up-outline" index={2} title="Progresión">
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
                Progresión automática
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
                Genera las semanas y propone una semana de descarga.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Progresión automática"
              ios_backgroundColor={colors.surfaceHigh}
              onValueChange={(activa) =>
                dispatch({ type: 'progresion', progresion: { ...draft.progresion, activa } })
              }
              trackColor={{ false: colors.surfaceHigh, true: colors.volt }}
              value={draft.progresion.activa}
            />
          </View>
          {draft.progresion.activa ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {cycle.map((every) => (
                <ChoiceChip
                  accessibilityLabel={`Descarga cada ${every} semanas`}
                  key={every}
                  label={`Cada ${every}`}
                  onSelect={() =>
                    dispatch({
                      type: 'progresion',
                      progresion: { activa: true, descargaCada: every },
                    })
                  }
                  selected={draft.progresion.descargaCada === every}
                  testID={`deload-${every}`}
                />
              ))}
              <ChoiceChip
                label="Sin descarga"
                onSelect={() =>
                  dispatch({ type: 'progresion', progresion: { activa: true, descargaCada: null } })
                }
                selected={draft.progresion.descargaCada === null}
                testID="deload-none"
              />
            </View>
          ) : null}
        </Card>
      </Section>
    </WizardShell>
  );
}
