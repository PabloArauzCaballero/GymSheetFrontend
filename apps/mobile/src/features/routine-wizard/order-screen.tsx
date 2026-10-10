import { Redirect, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import {
  WEEKDAYS,
  WEEKDAY_NAMES,
  blockLetter,
  countLabel,
  findDay,
  newDraftUid,
  transitionLabel,
  validateDayExercises,
  type DayTarget,
  type DraftExercise,
  type Weekday,
} from '@gymsheet/hooks';
import { routineExerciseLimits as limits } from '@gymsheet/types';
import { GroupBlock } from '@/components/group-block';
import { Section } from '@/components/layout';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { ChoiceChip } from '@/components/wizard/choice-chip';
import { WizardActionBar } from '@/components/wizard/wizard-action-bar';
import { WizardShell } from '@/components/wizard/wizard-shell';
import {
  ExerciseEditor,
  NumberField,
  QuietButton,
  digits,
} from '@/features/routine-wizard/exercise-editor';
import { useRoutineDraft } from '@/features/routine-wizard/use-wizard';
import { notify } from '@/notifications';
import { wizardStepPath } from '@/lib/wizard-routes';
import { spacing } from '@/theme';

const DAYS_STEP = 4;

type Run = { grupo: number | null; items: Array<{ exercise: DraftExercise; index: number }> };

/** Corridas contiguas con el mismo `grupo` (≥2 = bloque), como en `buildDayBlocks`. */
function runsOf(list: readonly DraftExercise[]): Run[] {
  const runs: Run[] = [];
  list.forEach((exercise, index) => {
    const last = runs[runs.length - 1];
    if (last && exercise.grupo !== null && last.grupo === exercise.grupo) last.items.push({ exercise, index });
    else runs.push({ grupo: exercise.grupo, items: [{ exercise, index }] });
  });
  return runs;
}

/** ¿Los índices elegidos son contiguos? (unir solo funciona con filas seguidas). */
function contiguous(indexes: readonly number[]): boolean {
  const sorted = [...indexes].sort((a, b) => a - b);
  return sorted.every((value, position) => position === 0 || value === (sorted[position - 1] ?? 0) + 1);
}

/**
 * «Ver y ordenar» el día (C3.d): reordenar, editar series, repeticiones o
 * duración («Por tiempo»), RIR, descanso y nota; **unir en superserie** (2) o
 * circuito (3+) filas contiguas —mantener pulsada una fila o «Seleccionar para
 * unir»—, «Separar» y el «Descanso entre ejercicios» del bloque; repetir un
 * ejercicio (el mismo press en dos bloques). Los bloques se dibujan con el
 * mismo `GroupBlock` que el Día, y los avisos salen de `validateDayExercises`
 * (lo que el backend rechazaría).
 *
 * El orden se cambia con flechas y no arrastrando: funciona con lector de
 * pantalla y con una mano, y no necesita otra librería nativa.
 */
export function OrderScreen({ dia }: { dia: DayTarget }) {
  const { state, draft, dispatch } = useRoutineDraft();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const day = dia === 'grupo' ? undefined : findDay(draft, dia);
  const list = dia === 'grupo' ? state.grupo?.ejercicios : day?.ejercicios;
  const issues = useMemo(() => (list ? validateDayExercises(list) : []), [list]);
  if (!list) return <Redirect href={wizardStepPath(DAYS_STEP)} />;

  const others = WEEKDAYS.filter(
    (candidate): candidate is Weekday => candidate !== dia && findDay(draft, candidate) !== undefined,
  );
  const runs = runsOf(list);
  const rowIssues = (uid: string) => issues.filter((issue) => issue.uid === uid).map((issue) => issue.mensaje);
  const groupIssues = (grupo: number) =>
    issues.filter((issue) => issue.grupo === grupo && !issue.uid).map((issue) => issue.mensaje);

  const selectedIndexes = list.flatMap((exercise, index) => (selected.has(exercise.uid) ? [index] : []));
  const canJoin = selectedIndexes.length >= 2 && contiguous(selectedIndexes);
  const joinLabel = selectedIndexes.length >= 3 ? 'Unir en circuito' : 'Unir en superserie';
  const selectionInfo =
    selectedIndexes.length < 2
      ? 'Elige 2 o más ejercicios seguidos'
      : canJoin
        ? `${selectedIndexes.length} seleccionados`
        : 'Tienen que ir seguidos: muévelos con las flechas';

  const startSelecting = (uid?: string) => {
    void Haptics.selectionAsync();
    setSelecting(true);
    setSelected(new Set(uid ? [uid] : []));
  };
  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };
  const toggle = (uid: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  const join = () => {
    dispatch({ type: 'unirEnGrupo', destino: dia, uids: [...selected] });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    stopSelecting();
  };

  const edit = (uid: string, cambios: Partial<Omit<DraftExercise, 'uid'>>) =>
    dispatch({ type: 'editarEjercicio', destino: dia, uid, cambios });
  const repeat = (exercise: DraftExercise, index: number) => {
    // Una fila nueva con el mismo ejercicio, justo debajo y fuera de cualquier bloque.
    dispatch({
      type: 'agregarEjercicio',
      destino: dia,
      ejercicio: { ...exercise, uid: newDraftUid(), grupo: null, descansoEntreSeg: null },
    });
    dispatch({ type: 'moverEjercicio', destino: dia, desde: list.length, hacia: index + 1 });
    notify.success(`«${exercise.nombre}» añadido otra vez.`);
  };

  const clear = () =>
    Alert.alert('¿Vaciar el día?', 'Se quitarán todos sus ejercicios.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Vaciar',
        style: 'destructive',
        onPress: () => {
          if (dia === 'grupo') list.forEach((e) => dispatch({ type: 'quitarEjercicio', destino: dia, uid: e.uid }));
          else dispatch({ type: 'vaciarDia', dia });
          router.back();
        },
      },
    ]);

  const editorFor = (
    exercise: DraftExercise,
    index: number,
    group?: { badge: string; last: boolean },
  ) => (
    <ExerciseEditor
      badge={group?.badge}
      exercise={exercise}
      grouped={Boolean(group)}
      issues={rowIssues(exercise.uid)}
      key={exercise.uid}
      onChange={(cambios) => edit(exercise.uid, cambios)}
      onLongPress={() => startSelecting(exercise.uid)}
      onMove={(delta) => dispatch({ type: 'moverEjercicio', destino: dia, desde: index, hacia: index + delta })}
      onRemove={() => dispatch({ type: 'quitarEjercicio', destino: dia, uid: exercise.uid })}
      onRepeat={() => repeat(exercise, index)}
      onTimed={(duracionSeg) => dispatch({ type: 'setPorTiempo', destino: dia, uid: exercise.uid, duracionSeg })}
      onToggleSelect={() => toggle(exercise.uid)}
      position={index + 1}
      restRole={group ? (group.last ? 'round' : 'none') : 'set'}
      selected={selected.has(exercise.uid)}
      selecting={selecting}
      total={list.length}
    />
  );

  let letter = 0;
  return (
    <WizardShell
      actions={
        selecting ? (
          <WizardActionBar
            info={selectionInfo}
            primary={{ label: joinLabel, onPress: join, disabled: !canJoin }}
            secondary={{ label: 'Cancelar', onPress: stopSelecting }}
          />
        ) : (
          <WizardActionBar info={countLabel(list.length)} primary={{ label: 'Listo', onPress: () => router.back() }} />
        )
      }
      paso={DAYS_STEP}
      subtitle="Ordena, ajusta series y descansos, y une ejercicios en superseries."
      title={dia === 'grupo' ? 'Ver y ordenar' : `${WEEKDAY_NAMES[dia]} · Ver y ordenar`}
    >
      {day && dia !== 'grupo' && !selecting ? (
        <Input
          label="Nombre del día"
          maxLength={60}
          onChangeText={(nombre) => dispatch({ type: 'renombrarDia', dia, nombre })}
          placeholder="Ej. Empuje"
          value={day.nombre}
        />
      ) : null}

      {list.length >= 2 && !selecting ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text style={{ flex: 1 }} tone="muted" variant="footnote">
            Mantén pulsado un ejercicio para unirlo con el siguiente.
          </Text>
          <QuietButton
            icon="git-merge-outline"
            label="Seleccionar para unir"
            onPress={() => startSelecting()}
            tone="group"
            testID="start-group-select"
          />
        </View>
      ) : null}

      <View style={{ gap: spacing.md }}>
        {runs.map((run) => {
          const first = run.items[0];
          if (!first) return null;
          if (run.grupo === null || run.items.length < 2) {
            return run.items.map(({ exercise, index }) => editorFor(exercise, index));
          }
          const label = blockLetter(letter);
          letter += 1;
          const grupo = run.grupo;
          const lastItem = run.items[run.items.length - 1];
          const between = first.exercise.descansoEntreSeg ?? 0;
          const rounds = Math.max(...run.items.map(({ exercise }) => exercise.seriesObjetivo));
          return (
            <GroupBlock
              footer={
                selecting ? null : (
                  <View style={{ gap: spacing.xs }}>
                    <NumberField
                      label={`Descanso entre ejercicios (s, 0–${limits.descansoEntreMax})`}
                      onChange={(raw) =>
                        dispatch({
                          type: 'setDescansoEntre',
                          destino: dia,
                          grupo,
                          descansoEntreSeg: digits(raw, limits.descansoEntreMax) ?? 0,
                        })
                      }
                      placeholder="0"
                      testID={`group-rest-${label}`}
                      value={between}
                    />
                    {groupIssues(grupo).map((issue) => (
                      <Text accessibilityRole="alert" key={issue} tone="warning" variant="footnote">
                        {issue}
                      </Text>
                    ))}
                  </View>
                )
              }
              headerAction={
                selecting ? null : (
                  <QuietButton
                    icon="git-branch-outline"
                    label="Separar"
                    onPress={() => dispatch({ type: 'separarGrupo', destino: dia, grupo })}
                    testID={`split-${label}`}
                  />
                )
              }
              key={`g-${grupo}-${first.exercise.uid}`}
              label={`${run.items.length >= 3 ? 'Circuito' : 'Superserie'} ${label}`}
              rounds={rounds}
              testID={`order-block-${label}`}
              transition={transitionLabel(between)}
            >
              {run.items.map(({ exercise, index }, position) =>
                editorFor(exercise, index, {
                  badge: `${label}${position + 1}`,
                  last: exercise.uid === lastItem?.exercise.uid,
                }),
              )}
            </GroupBlock>
          );
        })}
      </View>

      {!selecting && dia !== 'grupo' && others.length > 0 && list.length > 0 ? (
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

      {list.length > 0 && !selecting ? (
        <Button icon="trash-outline" label="Vaciar el día" onPress={clear} variant="ghost" />
      ) : null}
    </WizardShell>
  );
}
