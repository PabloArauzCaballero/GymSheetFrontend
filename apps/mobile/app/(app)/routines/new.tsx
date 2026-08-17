import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import { z } from 'zod';
import { routineSchema } from '@gymsheet/schemas';
import {
  routineVisibilities,
  trainingGoals,
  type Exercise,
  type RoutineVisibility,
  type TrainingGoal,
} from '@gymsheet/types';
import { apiClient } from '@/api/client';
import { exerciseService } from '@/api/services';
import { ExercisePicker } from '@/components/exercise-picker';
import { EmptyState } from '@/components/feedback';
import { Card, ScreenHeader, ScrollScreen, Section } from '@/components/layout';
import { ExerciseImage } from '@/components/media';
import { BackLink } from '@/components/nav';
import { Button, Input } from '@/components/ui';
import { GOAL_LABEL } from '@/lib/format';
import { notify } from '@/notifications';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/**
 * Writes owned by this screen. They live here rather than in `@/api/services`
 * because that module is the read surface shared by every screen, while these
 * two calls exist only to build a routine. The contract is the same the web app
 * validates against (`routineSchema`), so a backend change breaks both at once.
 */
type CreateRoutineBody = {
  nombre: string;
  descripcion: string | null;
  visibilidad: RoutineVisibility;
  objetivo: TrainingGoal;
};

type RoutineExerciseBody = {
  ejercicioId: string;
  orden: number;
  seriesObjetivo: number;
  repsMin: number | null;
  repsMax: number | null;
  pesoObjetivoKg: number | null;
  descansoSeg: number | null;
  rirObjetivo: number | null;
  nota: string | null;
};

const routineWrites = {
  create: (body: CreateRoutineBody) =>
    apiClient.request('/routines', routineSchema, { method: 'POST', body }),
  addExercise: (routineId: string, body: RoutineExerciseBody) =>
    apiClient.request(`/routines/${routineId}/exercises`, routineSchema, {
      method: 'POST',
      body,
    }),
};

/** Spanish copy for the visibility enum; mirrors the wording used on the web. */
const VISIBILITY_LABEL: Record<RoutineVisibility, string> = {
  PRIVATE: 'Privada',
  SHARED: 'Compartida',
  TEMPLATE: 'Plantilla',
};

const routineFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(120, 'El nombre no puede superar los 120 caracteres.'),
  // Optional: an empty description is "sin descripción", not an error, and
  // travels as null so the backend stores an absence instead of a blank string.
  descripcion: z
    .string()
    .trim()
    .max(500, 'La descripción no puede superar los 500 caracteres.')
    .transform((value) => (value === '' ? null : value)),
  objetivo: z.enum(trainingGoals),
  visibilidad: z.enum(routineVisibilities),
});

type RoutineFormValues = z.input<typeof routineFormSchema>;
type RoutineFormPayload = z.output<typeof routineFormSchema>;

/**
 * One exercise queued for the routine being written. The numeric targets are
 * held as strings because that is what a `TextInput` produces; they are parsed
 * once, at save time.
 */
type DraftExercise = {
  /** Stable list key — the same exercise may legitimately appear twice. */
  key: string;
  exercise: Exercise;
  seriesObjetivo: string;
  repsMin: string;
  repsMax: string;
  descansoSeg: string;
};

type DraftNumbers = Omit<DraftExercise, 'key' | 'exercise'>;

/** Sensible starting plan, so a new row is already trainable without editing. */
const DRAFT_DEFAULTS: DraftNumbers = {
  seriesObjetivo: '3',
  repsMin: '8',
  repsMax: '12',
  descansoSeg: '90',
};

/** Series is the one target the backend requires; never send a zero. */
const FALLBACK_SERIES = 3;

/**
 * A number pad still lets separators and pasted text through, so the field is
 * filtered as it is typed: an invalid value can then never exist in state, and
 * no per-field error message is needed.
 */
function onlyDigits(value: string): string {
  return value.replace(/[^0-9]/gu, '');
}

function toInt(value: string): number | null {
  if (value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Turns a draft into the payload for `POST /routines/{id}/exercises`.
 *
 * A reversed range (`12-8`) is a typo, not an intent, so the bounds are ordered
 * instead of rejected — the plan the user meant is unambiguous.
 */
function toExerciseBody(draft: DraftExercise, orden: number): RoutineExerciseBody {
  const min = toInt(draft.repsMin);
  const max = toInt(draft.repsMax);
  const ordered = min !== null && max !== null && min > max ? { min: max, max: min } : { min, max };
  return {
    ejercicioId: draft.exercise.id,
    orden,
    seriesObjetivo: toInt(draft.seriesObjetivo) ?? FALLBACK_SERIES,
    repsMin: ordered.min,
    repsMax: ordered.max,
    pesoObjetivoKg: null,
    descansoSeg: toInt(draft.descansoSeg),
    rirObjetivo: null,
    nota: null,
  };
}

/**
 * One selectable option. Chips beat a native picker for these two groups: every
 * option fits on screen, so the choice is visible instead of hidden behind a
 * modal.
 */
function ChoiceChip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      // `selected` is what a screen reader announces for a chip group; without
      // it the volt fill is the only cue, which is no cue at all when unseen.
      accessibilityState={{ selected }}
      onPress={onSelect}
      style={({ pressed }) => ({
        justifyContent: 'center',
        minHeight: minTouchTarget,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: selected ? colors.volt : colors.border,
        backgroundColor: selected ? colors.volt : colors.surface,
        paddingHorizontal: spacing.md,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          color: selected ? colors.background : colors.text,
          fontSize: fontSizes.sm,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Editable row for one queued exercise: artwork to identify it, targets to hit. */
function DraftRow({
  draft,
  position,
  onChange,
  onRemove,
}: {
  draft: DraftExercise;
  position: number;
  onChange: (patch: Partial<DraftNumbers>) => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <ExerciseImage exercise={draft.exercise} size={48} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            numberOfLines={2}
            style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '600' }}
          >
            {draft.exercise.nombre}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            {`${position}. ${draft.exercise.grupoMuscular ?? 'Sin grupo muscular'}`}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`Quitar ${draft.exercise.nombre}`}
          accessibilityRole="button"
          onPress={onRemove}
          style={({ pressed }) => ({
            width: minTouchTarget,
            height: minTouchTarget,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radii.full,
            backgroundColor: colors.surfaceHigh,
            opacity: pressed ? 0.75 : 1,
          })}
        >
          <Ionicons
            accessibilityElementsHidden
            color={colors.danger}
            importantForAccessibility="no-hide-descendants"
            name="trash-outline"
            size={iconSizes.md}
          />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input
            keyboardType="number-pad"
            label="Series"
            onChangeText={(value) => onChange({ seriesObjetivo: onlyDigits(value) })}
            placeholder="3"
            value={draft.seriesObjetivo}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            keyboardType="number-pad"
            label="Descanso (s)"
            onChangeText={(value) => onChange({ descansoSeg: onlyDigits(value) })}
            placeholder="90"
            value={draft.descansoSeg}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input
            keyboardType="number-pad"
            label="Reps mín."
            onChangeText={(value) => onChange({ repsMin: onlyDigits(value) })}
            placeholder="8"
            value={draft.repsMin}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            keyboardType="number-pad"
            label="Reps máx."
            onChangeText={(value) => onChange({ repsMax: onlyDigits(value) })}
            placeholder="12"
            value={draft.repsMax}
          />
        </View>
      </View>
    </Card>
  );
}

/**
 * Creates a routine: the header data plus its exercises, composed offline and
 * committed in one action. The backend has no bulk endpoint for this, so saving
 * is `POST /routines` followed by one `POST /routines/{id}/exercises` per row.
 */
export default function NewRoutineScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<DraftExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [resolvingExercise, setResolvingExercise] = useState(false);
  // Only ever incremented: two rows for the same exercise must not share a key.
  const nextKey = useRef(0);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RoutineFormValues, unknown, RoutineFormPayload>({
    resolver: zodResolver(routineFormSchema),
    // The save button reflects validity, so it has to be recomputed as the user
    // types rather than only on submit.
    mode: 'onChange',
    defaultValues: {
      nombre: '',
      descripcion: '',
      objetivo: 'HIPERTROFIA',
      visibilidad: 'PRIVATE',
    },
  });

  const updateDraft = (key: string, patch: Partial<DraftNumbers>) => {
    setDrafts((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  /**
   * The picker hands back an id; the row needs the whole exercise to show its
   * artwork. `fetchQuery` reuses the detail cache when it is already warm and
   * keeps the sheet open (and inert) while the request is in flight.
   */
  const handleSelect = async (exerciseId: string) => {
    setResolvingExercise(true);
    try {
      const exercise = await queryClient.fetchQuery({
        queryKey: ['exercise', exerciseId],
        queryFn: () => exerciseService.get(exerciseId),
      });
      nextKey.current += 1;
      setDrafts((current) => [
        ...current,
        { key: `${exercise.id}-${nextKey.current}`, exercise, ...DRAFT_DEFAULTS },
      ]);
      setPickerOpen(false);
    } catch (error: unknown) {
      notify.error(error);
    } finally {
      setResolvingExercise(false);
    }
  };

  const save = useMutation({
    mutationFn: async (values: RoutineFormPayload) => {
      const routine = await routineWrites.create({
        nombre: values.nombre,
        descripcion: values.descripcion,
        visibilidad: values.visibilidad,
        objetivo: values.objetivo,
      });

      const bodies = drafts.map((draft, index) => toExerciseBody(draft, index + 1));
      let added = 0;
      try {
        // Sequential on purpose: `orden` is positional and the rows are meant to
        // land in the order the user arranged them.
        for (const body of bodies) {
          await routineWrites.addExercise(routine.id, body);
          added += 1;
        }
      } catch (error: unknown) {
        // The routine already exists on the server: failing the whole mutation
        // here would strand it and let the user create a duplicate on retry.
        // Report the failure, then continue to the detail screen with what saved.
        notify.error(error);
      }

      return { routineId: routine.id, added, total: bodies.length };
    },
    onSuccess: async ({ routineId, added, total }) => {
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      if (added < total) {
        notify.warning(
          `La rutina se creó con ${added} de ${total} ejercicios. Añade los que faltan desde la rutina.`,
        );
      } else {
        notify.success('Rutina creada.');
      }
      router.replace({ pathname: '/routines/[id]', params: { id: routineId } });
    },
    onError: (error: unknown) => {
      notify.error(error);
    },
  });

  const onSubmit = handleSubmit((values) => {
    save.mutate(values);
  });

  return (
    <ScrollScreen>
      <BackLink />
      <ScreenHeader
        subtitle="Define el plan y añade los ejercicios en el orden en que los entrenarás."
        title="Nueva rutina"
      />

      <Section title="Datos de la rutina">
        <Card>
          <Controller
            control={control}
            name="nombre"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                error={errors.nombre?.message}
                label="Nombre"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Empuje - Día 1"
                value={value}
              />
            )}
          />
          <Controller
            control={control}
            name="descripcion"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                error={errors.descripcion?.message}
                label="Descripción (opcional)"
                multiline
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="Pecho, hombro y tríceps."
                // Multiline inputs grow from the top; without this the text sits
                // vertically centred on Android.
                style={{
                  minHeight: minTouchTarget * 1.6,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: errors.descripcion ? colors.danger : colors.border,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  padding: spacing.md,
                  fontSize: fontSizes.md,
                  textAlignVertical: 'top',
                }}
                value={value}
              />
            )}
          />
        </Card>
      </Section>

      <Section index={1} title="Objetivo">
        <Controller
          control={control}
          name="objetivo"
          render={({ field: { onChange, value } }) => (
            <View style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {trainingGoals.map((goal) => (
                  <ChoiceChip
                    key={goal}
                    label={GOAL_LABEL[goal]}
                    onSelect={() => onChange(goal)}
                    selected={value === goal}
                  />
                ))}
              </View>
              {errors.objetivo?.message ? (
                <Text style={{ color: colors.danger, fontSize: fontSizes.xs }}>
                  {errors.objetivo.message}
                </Text>
              ) : null}
            </View>
          )}
        />
      </Section>

      <Section index={2} title="Visibilidad">
        <Controller
          control={control}
          name="visibilidad"
          render={({ field: { onChange, value } }) => (
            <View style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {routineVisibilities.map((visibility) => (
                  <ChoiceChip
                    key={visibility}
                    label={VISIBILITY_LABEL[visibility]}
                    onSelect={() => onChange(visibility)}
                    selected={value === visibility}
                  />
                ))}
              </View>
              {errors.visibilidad?.message ? (
                <Text style={{ color: colors.danger, fontSize: fontSizes.xs }}>
                  {errors.visibilidad.message}
                </Text>
              ) : null}
            </View>
          )}
        />
      </Section>

      <Section index={3} title={`Ejercicios (${drafts.length})`}>
        {drafts.length === 0 ? (
          <EmptyState
            icon="barbell-outline"
            message="Añade al menos un ejercicio para poder guardar la rutina."
            title="Sin ejercicios"
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {drafts.map((draft, index) => (
              <DraftRow
                draft={draft}
                key={draft.key}
                onChange={(patch) => updateDraft(draft.key, patch)}
                onRemove={() => setDrafts((current) => current.filter((item) => item.key !== draft.key))}
                position={index + 1}
              />
            ))}
          </View>
        )}

        <Button
          disabled={save.isPending}
          label="Añadir ejercicio"
          onPress={() => setPickerOpen(true)}
          variant="ghost"
        />
      </Section>

      <Button
        disabled={!isValid || drafts.length === 0}
        label="Crear rutina"
        loading={save.isPending}
        onPress={onSubmit}
      />

      <ExercisePicker
        onClose={() => setPickerOpen(false)}
        onSelect={(exerciseId) => void handleSelect(exerciseId)}
        pending={resolvingExercise}
        visible={pickerOpen}
      />
    </ScrollScreen>
  );
}
