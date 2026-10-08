import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import {
  WEEKDAYS,
  WEEKDAY_NAMES,
  countLabel,
  findDay,
  type DayTarget,
  type DraftExercise,
  type Weekday,
} from '@gymsheet/hooks';
import { Card, Section } from '@/components/layout';
import { numericInputProps } from '@/components/keyboard';
import { PressableScale } from '@/components/motion';
import { Button, Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { WizardActionBar } from '@/components/wizard/wizard-action-bar';
import { WizardShell } from '@/components/wizard/wizard-shell';
import { useRoutineDraft } from '@/features/routine-wizard/use-wizard';
import { notify } from '@/notifications';
import { wizardStepPath } from '@/lib/wizard-routes';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

const DAYS_STEP = 4;

function digits(value: string, max: number): number | null {
  const clean = value.replace(/[^0-9]/gu, '').slice(0, 4);
  if (clean === '') return null;
  return Math.min(Number.parseInt(clean, 10), max);
}

function show(value: number | null): string {
  return value === null ? '' : String(value);
}

function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  tone = colors.text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      disabled={disabled}
      haptic="selection"
      hitSlop={spacing.xs}
      onPress={onPress}
      scaleTo={0.9}
      style={{
        width: minTouchTarget,
        height: minTouchTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.full,
        backgroundColor: colors.surfaceHigh,
        opacity: disabled ? 0.35 : 1,
      }}
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

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Input
        keyboardType="number-pad"
        {...numericInputProps}
        label={label}
        onChangeText={onChange}
        placeholder={placeholder}
        value={show(value)}
      />
    </View>
  );
}

/** Un ejercicio del día: orden con flechas, series, repeticiones, RIR, descanso y nota. */
function ExerciseEditor({
  exercise,
  position,
  total,
  onMove,
  onRemove,
  onChange,
}: {
  exercise: DraftExercise;
  position: number;
  total: number;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  onChange: (cambios: Partial<DraftExercise>) => void;
}) {
  const setReps = (field: 'repsMin' | 'repsMax', raw: string) => {
    const next = digits(raw, 1000);
    const other = field === 'repsMin' ? exercise.repsMax : exercise.repsMin;
    // Un rango invertido (12–8) es un descuido, no una intención: se ajusta el
    // otro extremo en vez de dejar que el servidor rechace toda la rutina.
    const fix =
      next !== null && other !== null && (field === 'repsMin' ? next > other : next < other)
        ? { [field === 'repsMin' ? 'repsMax' : 'repsMin']: next }
        : {};
    onChange({ [field]: next, ...fix });
  };
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={2} style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
            {`${position}. ${exercise.nombre}`}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{exercise.grupoMuscular}</Text>
        </View>
        <IconButton disabled={position === 1} icon="chevron-up" label={`Subir ${exercise.nombre}`} onPress={() => onMove(-1)} />
        <IconButton disabled={position === total} icon="chevron-down" label={`Bajar ${exercise.nombre}`} onPress={() => onMove(1)} />
        <IconButton icon="trash-outline" label={`Quitar ${exercise.nombre}`} onPress={onRemove} tone={colors.danger} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <NumberField
          label="Series"
          onChange={(raw) => onChange({ seriesObjetivo: digits(raw, 100) ?? 1 })}
          placeholder="3"
          value={exercise.seriesObjetivo}
        />
        <NumberField label="Reps mín." onChange={(raw) => setReps('repsMin', raw)} placeholder="8" value={exercise.repsMin} />
        <NumberField label="Reps máx." onChange={(raw) => setReps('repsMax', raw)} placeholder="12" value={exercise.repsMax} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <NumberField label="RIR" onChange={(raw) => onChange({ rirObjetivo: digits(raw, 10) })} placeholder="2" value={exercise.rirObjetivo} />
        <NumberField label="Descanso (s)" onChange={(raw) => onChange({ descansoSeg: digits(raw, 7200) })} placeholder="90" value={exercise.descansoSeg} />
      </View>
      <Input
        label="Nota"
        maxLength={1000}
        onChangeText={(text) => onChange({ nota: text === '' ? null : text })}
        placeholder="Ej. Pausa de 1 s abajo"
        value={exercise.nota ?? ''}
      />
    </Card>
  );
}

/**
 * «Ver y ordenar» el día: reordenar, editar series, repeticiones, RIR, descanso y
 * nota de cada ejercicio, renombrar el día, duplicarlo en otros y vaciarlo.
 *
 * El orden se cambia con flechas y no arrastrando: es lo que funciona con
 * lector de pantalla y con una mano, y no necesita una librería nativa más.
 */
export function OrderScreen({ dia }: { dia: DayTarget }) {
  const { state, draft, dispatch } = useRoutineDraft();
  const day = dia === 'grupo' ? undefined : findDay(draft, dia);
  const list = dia === 'grupo' ? state.grupo?.ejercicios : day?.ejercicios;
  if (!list) return <Redirect href={wizardStepPath(DAYS_STEP)} />;

  const others = WEEKDAYS.filter(
    (candidate): candidate is Weekday => candidate !== dia && findDay(draft, candidate) !== undefined,
  );

  const clear = () =>
    Alert.alert('¿Vaciar el día?', 'Se quitarán todos sus ejercicios.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Vaciar',
        style: 'destructive',
        onPress: () => {
          if (dia === 'grupo') list.forEach((e) => dispatch({ type: 'quitarEjercicio', destino: dia, ejercicioId: e.ejercicioId }));
          else dispatch({ type: 'vaciarDia', dia });
          router.back();
        },
      },
    ]);

  return (
    <WizardShell
      actions={
        <WizardActionBar
          info={countLabel(list.length)}
          primary={{ label: 'Listo', onPress: () => router.back() }}
        />
      }
      paso={DAYS_STEP}
      subtitle="Ordena los ejercicios y ajusta series, repeticiones y descanso."
      title={dia === 'grupo' ? 'Ver y ordenar' : `${WEEKDAY_NAMES[dia]} · Ver y ordenar`}
    >
      {day && dia !== 'grupo' ? (
        <Input
          label="Nombre del día"
          maxLength={60}
          onChangeText={(nombre) => dispatch({ type: 'renombrarDia', dia, nombre })}
          placeholder="Ej. Empuje"
          value={day.nombre}
        />
      ) : null}

      <View style={{ gap: spacing.md }}>
        {list.map((exercise, index) => (
          <ExerciseEditor
            exercise={exercise}
            key={exercise.ejercicioId}
            onChange={(cambios) =>
              dispatch({ type: 'editarEjercicio', destino: dia, ejercicioId: exercise.ejercicioId, cambios })
            }
            onMove={(delta) => dispatch({ type: 'moverEjercicio', destino: dia, desde: index, hacia: index + delta })}
            onRemove={() => dispatch({ type: 'quitarEjercicio', destino: dia, ejercicioId: exercise.ejercicioId })}
            position={index + 1}
            total={list.length}
          />
        ))}
      </View>

      {dia !== 'grupo' && others.length > 0 && list.length > 0 ? (
        <Section icon="copy-outline" index={0} title="Duplicar en…">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {others.map((other) => (
              <ChoiceChip
                accessibilityLabel={`Duplicar en ${WEEKDAY_NAMES[other].toLowerCase()}`}
                key={other}
                label={WEEKDAY_NAMES[other].slice(0, 3)}
                onSelect={() => {
                  dispatch({ type: 'duplicarDia', desde: dia, hacia: [other] });
                  notify.success(`Copiado al ${WEEKDAY_NAMES[other].toLowerCase()}.`);
                }}
                selected={false}
              />
            ))}
          </View>
        </Section>
      ) : null}

      {list.length > 0 ? (
        <Button icon="trash-outline" label="Vaciar el día" onPress={clear} variant="danger" />
      ) : null}
    </WizardShell>
  );
}
