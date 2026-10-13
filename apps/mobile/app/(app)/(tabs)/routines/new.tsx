import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import { z } from 'zod';
import {
  trainingGoals,
  type Exercise,
  type FitnessGoal,
  type RoutineVisibility,
  type TrainingGoal,
} from '@gymsheet/types';
import { exerciseService, onboardingService, routineService } from '@/api/services';
import { ExercisePicker } from '@/components/exercise-picker';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { numericInputProps } from '@/components/keyboard';
import { Card, ScreenHeader, ScrollScreen, Section } from '@/components/layout';
import { ExerciseImage } from '@/components/media';
import { BackLink } from '@/components/nav';
import { Button, Input } from '@/components/ui';
import { GOAL_LABEL } from '@/lib/format';
import { requestId } from '@/lib/request-id';
import { notify } from '@/notifications';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

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

const VISIBILITY_LABEL: Record<RoutineVisibility, string> = {
  PRIVATE: 'Privada',
  SHARED: 'Compartida con asignados',
  PUBLIC: 'Pública en tu gimnasio',
  TEMPLATE: 'Plantilla oficial',
};

const fitnessToTraining: Record<FitnessGoal, TrainingGoal> = {
  GAIN_MUSCLE: 'HIPERTROFIA',
  LOSE_FAT: 'PERDIDA_GRASA',
  IMPROVE_STRENGTH: 'FUERZA',
  IMPROVE_ENDURANCE: 'RESISTENCIA',
  MAINTAIN_FITNESS: 'SALUD_GENERAL',
  GENERAL_HEALTH: 'SALUD_GENERAL',
  SPORT_PERFORMANCE: 'RENDIMIENTO_DEPORTIVO',
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
  visibilidad: z.enum(['PRIVATE', 'PUBLIC']),
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
  pesoObjetivoKg: string;
  rirObjetivo: string;
  nota: string;
  reason?: string;
};

type DraftNumbers = Omit<DraftExercise, 'key' | 'exercise'>;

/** Sensible starting plan, so a new row is already trainable without editing. */
const DRAFT_DEFAULTS: DraftNumbers = {
  seriesObjetivo: '3',
  repsMin: '8',
  repsMax: '12',
  descansoSeg: '90',
  pesoObjetivoKg: '',
  rirObjetivo: '',
  nota: '',
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

function onlyDecimal(value: string): string {
  const clean = value.replace(/[^0-9.,]/gu, '').replace(',', '.');
  const [whole, ...fraction] = clean.split('.');
  return fraction.length ? `${whole ?? ''}.${fraction.join('').slice(0, 2)}` : (whole ?? '');
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
    pesoObjetivoKg: draft.pesoObjetivoKg === '' ? null : Number(draft.pesoObjetivoKg),
    descansoSeg: toInt(draft.descansoSeg),
    rirObjetivo: toInt(draft.rirObjetivo),
    nota: draft.nota.trim() || null,
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
          fontWeight: semibold,
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
            style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}
          >
            {draft.exercise.nombre}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            {`${position}. ${draft.exercise.grupoMuscular ?? 'Sin grupo muscular'}`}
          </Text>
          {draft.reason ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{draft.reason}</Text>
          ) : null}
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
            {...numericInputProps}
            label="Series"
            onChangeText={(value) => onChange({ seriesObjetivo: onlyDigits(value) })}
            placeholder="3"
            value={draft.seriesObjetivo}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            keyboardType="number-pad"
            {...numericInputProps}
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
            keyboardType="decimal-pad"
            {...numericInputProps}
            label="Peso objetivo (kg)"
            onChangeText={(value) => onChange({ pesoObjetivoKg: onlyDecimal(value) })}
            placeholder="Opcional"
            value={draft.pesoObjetivoKg}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            keyboardType="number-pad"
            {...numericInputProps}
            label="RIR objetivo"
            onChangeText={(value) => onChange({ rirObjetivo: onlyDigits(value) })}
            placeholder="Opcional"
            value={draft.rirObjetivo}
          />
        </View>
      </View>
      <Input
        label="Nota del ejercicio (opcional)"
        onChangeText={(value) => onChange({ nota: value })}
        placeholder="Por ejemplo: agarre neutro"
        value={draft.nota}
      />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Input
            keyboardType="number-pad"
            {...numericInputProps}
            label="Reps mín."
            onChangeText={(value) => onChange({ repsMin: onlyDigits(value) })}
            placeholder="8"
            value={draft.repsMin}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            keyboardType="number-pad"
            {...numericInputProps}
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

/** Creates a complete routine in one server transaction. */
export default function NewRoutineScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<DraftExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [resolvingExercise, setResolvingExercise] = useState(false);
  const [location, setLocation] = useState<'GYM' | 'HOME' | 'OUTDOORS'>('GYM');
  const [minutes, setMinutes] = useState(60);
  const creationKey = useRef(requestId());
  const onboarding = useQuery({ queryKey: ['onboarding', 'me'], queryFn: () => onboardingService.get() });
  const existing = useQuery({
    queryKey: ['routine', editId],
    queryFn: () => routineService.get(editId!),
    enabled: Boolean(editId),
  });
  const hydrated = useRef(false);
  // Only ever incremented: two rows for the same exercise must not share a key.
  const nextKey = useRef(0);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, dirtyFields },
    watch,
    setValue,
  } = useForm<RoutineFormValues, unknown, RoutineFormPayload>({
    resolver: zodResolver(routineFormSchema),
    // The save button reflects validity, so it has to be recomputed as the user
    // types rather than only on submit.
    mode: 'onChange',
    defaultValues: {
      nombre: '',
      descripcion: '',
      objetivo: 'SALUD_GENERAL',
      visibilidad: 'PRIVATE',
    },
  });
  const selectedGoal = watch('objetivo');
  const selectedVisibility = watch('visibilidad');

  useEffect(() => {
    if (editId) return;
    if (!onboarding.data) return;
    if (!dirtyFields.objetivo && onboarding.data.primaryGoal) {
      setValue('objetivo', fitnessToTraining[onboarding.data.primaryGoal], { shouldValidate: true });
    }
    if (onboarding.data.trainingLocation === 'HOME' || onboarding.data.trainingLocation === 'OUTDOORS') {
      setLocation(onboarding.data.trainingLocation);
    }
  }, [editId, onboarding.data, dirtyFields.objetivo, setValue]);

  useEffect(() => {
    if (!editId || !existing.data || hydrated.current) return;
    hydrated.current = true;
    const routine = existing.data;
    setValue('nombre', routine.nombre, { shouldValidate: true });
    setValue('descripcion', routine.descripcion ?? '', { shouldValidate: true });
    setValue('objetivo', routine.objetivo ?? 'SALUD_GENERAL', { shouldValidate: true });
    setValue('visibilidad', routine.visibilidad === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE', { shouldValidate: true });
    setDrafts(routine.ejercicios.filter((item) => item.ejercicio).sort((a, b) => a.orden - b.orden).map((item, index) => ({
      key: `${item.id}-${index}`,
      exercise: item.ejercicio!,
      seriesObjetivo: String(item.seriesObjetivo),
      repsMin: item.repsMin === null ? '' : String(item.repsMin),
      repsMax: item.repsMax === null ? '' : String(item.repsMax),
      descansoSeg: item.descansoSeg === null ? '' : String(item.descansoSeg),
      pesoObjetivoKg: item.pesoObjetivoKg === null ? '' : String(item.pesoObjetivoKg),
      rirObjetivo: item.rirObjetivo === null ? '' : String(item.rirObjetivo),
      nota: item.nota ?? '',
    })));
  }, [editId, existing.data, setValue]);

  const recommend = useMutation({
    mutationFn: () => routineService.recommend({ objetivo: selectedGoal, lugar: location, minutos: minutes, publico: selectedVisibility === 'PUBLIC' }),
    onSuccess: (result) => {
      setDrafts((current) => {
        const known = new Set(current.map((draft) => draft.exercise.id));
        const additions = result.items.filter((item) =>
          !known.has(item.ejercicio.id) &&
          (selectedVisibility !== 'PUBLIC' || item.ejercicio.tipoEjercicio === 'GLOBAL'),
        ).map((item) => {
          nextKey.current += 1;
          return {
            key: `${item.ejercicio.id}-${nextKey.current}`,
            exercise: item.ejercicio,
            ...DRAFT_DEFAULTS,
            seriesObjetivo: String(item.seriesObjetivo),
            repsMin: String(item.repsMin),
            repsMax: String(item.repsMax),
            descansoSeg: String(item.descansoSeg),
            reason: item.motivo,
          };
        });
        return [...current, ...additions];
      });
      if (result.requiresReview) notify.warning(result.message);
      else if (!result.items.length) notify.info('No hay ejercicios compatibles con este lugar y material. Puedes añadirlos manualmente.');
      else notify.success('Propuesta añadida. Puedes cambiar cualquier ejercicio.');
    },
    onError: (error: Error) => notify.error(error),
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
      if (values.visibilidad === 'PUBLIC' && drafts.some((draft) => draft.exercise.tipoEjercicio !== 'GLOBAL')) {
        throw new Error('Para publicar, usa ejercicios del catálogo general o guarda esta rutina como privada.');
      }
      const bodies = drafts.map((draft, index) => toExerciseBody(draft, index + 1));
      if (bodies.some((body) => body.seriesObjetivo < 1 || body.seriesObjetivo > 100 ||
        (body.repsMin !== null && body.repsMin < 1) ||
        (body.repsMax !== null && body.repsMax < 1) ||
        (body.descansoSeg !== null && body.descansoSeg > 7200) ||
        (body.pesoObjetivoKg !== null && (!Number.isFinite(body.pesoObjetivoKg) || body.pesoObjetivoKg > 2000)) ||
        (body.rirObjetivo !== null && body.rirObjetivo > 10) ||
        (body.nota !== null && body.nota.length > 1000))) {
        throw new Error('Revisa las series, repeticiones, peso, RIR y descansos de los ejercicios.');
      }
      const payload = {
        nombre: values.nombre,
        descripcion: values.descripcion,
        visibilidad: values.visibilidad,
        objetivo: values.objetivo,
        creationKey: creationKey.current,
        ejercicios: bodies,
      };
      return editId
        ? routineService.replaceComplete(editId, payload)
        : routineService.createComplete(payload);
    },
    onSuccess: async (routine) => {
      await queryClient.invalidateQueries({ queryKey: ['routines'] });
      if (editId) await queryClient.invalidateQueries({ queryKey: ['routine', editId] });
      notify.success(editId ? 'Rutina actualizada.' : routine.visibilidad === 'PUBLIC' ? 'Rutina creada y publicada.' : 'Rutina creada.');
      router.replace({ pathname: '/routines/[id]', params: { id: routine.id } });
    },
    onError: (error: unknown) => {
      notify.error(error);
    },
  });

  const onSubmit = handleSubmit((values) => {
    save.mutate(values);
  });

  if (editId && existing.isPending) {
    return <ScrollScreen><BackLink /><Skeleton height={150} /><Skeleton height={180} /></ScrollScreen>;
  }
  if (editId && existing.isError) {
    return <ScrollScreen><BackLink /><ErrorState error={existing.error} onRetry={() => void existing.refetch()} /></ScrollScreen>;
  }

  return (
    <ScrollScreen>
      <BackLink />
      <ScreenHeader
        subtitle="Define el plan y añade los ejercicios en el orden en que los entrenarás."
        title={editId ? 'Editar rutina' : 'Nueva rutina'}
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
                {(['PRIVATE', 'PUBLIC'] as const).map((visibility) => (
                  <ChoiceChip
                    key={visibility}
                    label={VISIBILITY_LABEL[visibility]}
                    onSelect={() => onChange(visibility)}
                    selected={value === visibility}
                  />
                ))}
              </View>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                Pública: otras personas de tu gimnasio podrán verla y copiarla.
              </Text>
              {errors.visibilidad?.message ? (
                <Text style={{ color: colors.danger, fontSize: fontSizes.xs }}>
                  {errors.visibilidad.message}
                </Text>
              ) : null}
            </View>
          )}
        />
      </Section>

      <Section index={3} title="Propuesta de ejercicios">
        <Card>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
            Usamos tu objetivo y experiencia guardados. Elige dónde harás esta sesión.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {(['GYM', 'HOME', 'OUTDOORS'] as const).map((place) => (
              <ChoiceChip
                key={place}
                label={{ GYM: 'Gimnasio', HOME: 'Casa', OUTDOORS: 'Exterior' }[place]}
                onSelect={() => setLocation(place)}
                selected={location === place}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {[30, 60, 90].map((duration) => (
              <ChoiceChip
                key={duration}
                label={`${duration} min`}
                onSelect={() => setMinutes(duration)}
                selected={minutes === duration}
              />
            ))}
          </View>
          <Button
            disabled={onboarding.isPending}
            label="Recomendar ejercicios"
            loading={recommend.isPending}
            onPress={() => recommend.mutate()}
            variant="ghost"
          />
        </Card>
      </Section>

      <Section index={4} title={`Ejercicios (${drafts.length})`}>
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
        disabled={!isValid || drafts.length === 0 || Boolean(editId && !hydrated.current)}
        label={editId ? 'Guardar cambios' : 'Crear rutina'}
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
