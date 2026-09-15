import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import { z } from 'zod';
import { ApiError } from '@gymsheet/api-client';
import { trainingGoals, type TrainingGoal } from '@gymsheet/types';
import { profileService, type ProfileInput } from '@/api/services';
import { ErrorState, Skeleton } from '@/components/feedback';
import { numericInputProps } from '@/components/keyboard';
import { Card, ScreenHeader, ScrollScreen } from '@/components/layout';
import { StepProgress, type FlowStep } from '@/components/step-flow';
import { BackLink } from '@/components/nav';
import { Button, Input } from '@/components/ui';
import { GOAL_LABEL } from '@/lib/format';
import { notify } from '@/notifications';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/**
 * A numeric keypad offers both separators depending on the locale, and a user
 * typing their weight will use whichever their phone shows — so `72,5` and
 * `72.5` have to mean the same number.
 */
function toNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

const MIN_AGE = 12;
const MAX_AGE = 100;

/**
 * Why a day/month/year triple is not a usable birth date, or `null` if it is
 * (all three empty counts as usable: the field is optional).
 *
 * Built from local calendar parts, not `new Date('1996-03-15')`, which is
 * parsed as UTC and can land on the previous day west of Greenwich.
 */
function birthDateError(dia: string, mes: string, anio: string): string | null {
  if (dia === '' && mes === '' && anio === '') return null;
  if (dia === '' || mes === '' || anio === '') return 'Completa día, mes y año.';
  if (![dia, mes, anio].every((part) => /^\d+$/.test(part))) return 'Usa solo números.';
  if (anio.length !== 4) return 'Escribe el año con cuatro cifras, por ejemplo 1996.';
  const day = Number(dia);
  const month = Number(mes);
  const year = Number(anio);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return 'Esa fecha no existe.';
  }
  const today = new Date();
  if (date > today) return 'La fecha no puede ser futura.';
  let age = today.getFullYear() - year;
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) {
    age -= 1;
  }
  if (age < MIN_AGE || age > MAX_AGE) return `Debes tener entre ${MIN_AGE} y ${MAX_AGE} años.`;
  return null;
}

/** `1996-03-15` → the three fields the form edits. */
function splitBirthDate(isoDate: string | null | undefined) {
  const [anio = '', mes = '', dia = ''] = isoDate ? isoDate.split('-') : [];
  return { dia, mes, anio };
}

/**
 * The form speaks strings (that is what a `TextInput` produces) and parses to
 * the numbers the API expects, so `z.input` is the shape bound to the fields and
 * `z.output` the payload sent to the backend.
 *
 * Ranges are physiological bounds, not business rules: they exist to catch a
 * missed decimal point (`725` kg) before it reaches the server.
 */
const profileFormSchema = z.object({
  pesoKg: z
    .string()
    .trim()
    .min(1, 'Ingresa tu peso.')
    .transform(toNumber)
    .refine((value) => Number.isFinite(value), 'Usa solo números, por ejemplo 72,5.')
    .refine((value) => value >= 20 && value <= 400, 'El peso debe estar entre 20 y 400 kg.'),
  estaturaCm: z
    .string()
    .trim()
    .min(1, 'Ingresa tu estatura.')
    .transform(toNumber)
    .refine((value) => Number.isInteger(value), 'Usa centímetros enteros, por ejemplo 178.')
    .refine((value) => value >= 80 && value <= 260, 'La estatura debe estar entre 80 y 260 cm.'),
  // Optional: three empty fields are "no lo digo", not an error, and travel as null.
  fechaNacimiento: z
    .object({ dia: z.string().trim(), mes: z.string().trim(), anio: z.string().trim() })
    .superRefine(({ dia, mes, anio }, ctx) => {
      const message = birthDateError(dia, mes, anio);
      if (message) ctx.addIssue({ code: 'custom', message });
    })
    .transform(({ dia, mes, anio }) =>
      dia === '' && mes === '' && anio === ''
        ? null
        : `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`,
    ),
  objetivo: z.enum(trainingGoals),
});

type ProfileFormValues = z.input<typeof profileFormSchema>;
type ProfileFormPayload = z.output<typeof profileFormSchema>;

/** One goal chip. Chips beat a native picker here: six options, all visible. */
function GoalOption({
  goal,
  selected,
  onSelect,
}: {
  goal: TrainingGoal;
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
        {GOAL_LABEL[goal]}
      </Text>
    </Pressable>
  );
}

/**
 * The four questions of the profile, asked one at a time.
 *
 * As a single long form this was a wall of inputs the user scrolled past and
 * abandoned; the data is short enough that one question per screen costs no
 * extra taps and turns filling it in into something with a visible end. The
 * rail at the top is what makes that end visible.
 */
const PROFILE_STEPS: readonly FlowStep[] = [
  { label: 'Peso', icon: 'barbell-outline' },
  { label: 'Estatura', icon: 'resize-outline' },
  { label: 'Nacimiento', icon: 'calendar-outline' },
  { label: 'Objetivo', icon: 'flag-outline' },
];

/** The field validated before each step is allowed to advance. */
const STEP_FIELD = ['pesoKg', 'estaturaCm', 'fechaNacimiento', 'objetivo'] as const;

const BIRTH_DATE_PARTS = [
  { key: 'dia', label: 'Día', placeholder: '15', maxLength: 2, flex: 1 },
  { key: 'mes', label: 'Mes', placeholder: '03', maxLength: 2, flex: 1 },
  { key: 'anio', label: 'Año', placeholder: '1996', maxLength: 4, flex: 1.6 },
] as const;

function StepHeading({
  icon,
  question,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  question: string;
  hint: string;
}) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm }}>
      <Ionicons color={colors.volt} name={icon} size={iconSizes.xl} />
      <Text
        style={{
          color: colors.text,
          fontSize: fontSizes.lg,
          fontWeight: semibold,
          textAlign: 'center',
        }}
      >
        {question}
      </Text>
      <Text
        style={{
          color: colors.textMuted,
          fontSize: fontSizes.sm,
          textAlign: 'center',
          lineHeight: 20,
        }}
      >
        {hint}
      </Text>
    </View>
  );
}

function ProfileForm({
  defaults,
  isNew,
  hadBirthDate,
}: {
  defaults: ProfileFormValues;
  isNew: boolean;
  hadBirthDate: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<ProfileFormValues, unknown, ProfileFormPayload>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: defaults,
  });

  const save = useMutation({
    // A user without a profile yet has to POST it: PATCH would 404 on nothing.
    mutationFn: (input: ProfileInput) =>
      isNew ? profileService.create(input) : profileService.update(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
        // El peso guardado aquí también queda en el histórico desde ahora;
        // sin esto la pantalla de evolución no mostraría el registro nuevo
        // hasta reabrir la aplicación.
        queryClient.invalidateQueries({ queryKey: ['profile', 'body-measurements'] }),
      ]);
      notify.success('Perfil actualizado.');
      router.back();
    },
    onError: (error: unknown) => {
      notify.error(error);
    },
  });

  const onSubmit = handleSubmit(({ fechaNacimiento, ...values }) => {
    // Vacío solo borra una fecha que ya existía. Si nunca la hubo se omite, y la
    // edad que guardó una versión anterior de la app no se pierde al editar el peso.
    save.mutate(
      fechaNacimiento === null && !hadBirthDate ? values : { ...values, fechaNacimiento },
    );
  });

  /**
   * Validates only the field on screen before moving on. Running the whole
   * schema would flag questions the user has not reached yet, which reads as
   * the form accusing them of mistakes they have not had a chance to make.
   */
  const goNext = async () => {
    const field = STEP_FIELD[step];
    if (!field) return;
    const valid = await trigger(field);
    if (valid) setStep((current) => Math.min(current + 1, PROFILE_STEPS.length - 1));
  };

  return (
    <Card style={{ gap: spacing.lg, paddingVertical: spacing.xl }}>
      <StepProgress current={step} steps={PROFILE_STEPS} />

      {step === 0 ? (
        <>
          <StepHeading
            hint="Lo usamos para calcular el volumen de tus sesiones."
            icon="barbell-outline"
            question="¿Cuánto pesas?"
          />
          <Controller
            control={control}
            name="pesoKg"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                error={errors.pesoKg?.message}
                keyboardType="numeric"
                {...numericInputProps}
                label="Peso (kg)"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="72,5"
                value={value}
              />
            )}
          />
        </>
      ) : null}

      {step === 1 ? (
        <>
          <StepHeading
            hint="Junto al peso permite seguir tu composición a lo largo del tiempo."
            icon="resize-outline"
            question="¿Cuánto mides?"
          />
          <Controller
            control={control}
            name="estaturaCm"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                error={errors.estaturaCm?.message}
                keyboardType="numeric"
                {...numericInputProps}
                label="Estatura (cm)"
                onBlur={onBlur}
                onChangeText={onChange}
                placeholder="178"
                value={value}
              />
            )}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <StepHeading
            hint="Opcional. Con ella calculamos tu edad, que así se mantiene al día sola."
            icon="calendar-outline"
            question="¿Cuándo naciste?"
          />
          <Controller
            control={control}
            name="fechaNacimiento"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {BIRTH_DATE_PARTS.map((part) => (
                    <View key={part.key} style={{ flex: part.flex }}>
                      <Input
                        keyboardType="number-pad"
                        {...numericInputProps}
                        label={part.label}
                        maxLength={part.maxLength}
                        onBlur={onBlur}
                        onChangeText={(text) =>
                          onChange({ ...value, [part.key]: text.replace(/\D/g, '') })
                        }
                        placeholder={part.placeholder}
                        value={value[part.key]}
                      />
                    </View>
                  ))}
                </View>
                {errors.fechaNacimiento?.message ? (
                  <Text style={{ color: colors.danger, fontSize: fontSizes.xs }}>
                    {errors.fechaNacimiento.message}
                  </Text>
                ) : null}
              </View>
            )}
          />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <StepHeading
            hint="Ajusta las rutinas y las cargas que te sugerimos."
            icon="flag-outline"
            question="¿Cuál es tu objetivo?"
          />
          <Controller
            control={control}
            name="objetivo"
            render={({ field: { onChange, value } }) => (
              <View style={{ gap: spacing.xs }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  {trainingGoals.map((goal) => (
                    <GoalOption
                      goal={goal}
                      key={goal}
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
        </>
      ) : null}

      {step < PROFILE_STEPS.length - 1 ? (
        <Button label="Continuar" onPress={() => void goNext()} />
      ) : (
        <Button label="Guardar cambios" loading={save.isPending} onPress={onSubmit} />
      )}
      {step > 0 ? (
        <Button label="Volver" onPress={() => setStep((current) => current - 1)} variant="ghost" />
      ) : null}
    </Card>
  );
}

export default function ProfileEditScreen() {
  const profile = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => profileService.get(),
    // A 404 means "not onboarded yet", which this screen exists to fix: retrying
    // it would only delay the empty form.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.kind === 'not-found') && failureCount < 1,
  });

  const isNew = profile.error instanceof ApiError && profile.error.kind === 'not-found';

  if (profile.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={90} />
        <Skeleton height={220} />
      </ScrollScreen>
    );
  }

  if (profile.isError && !isNew) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={profile.error} onRetry={() => void profile.refetch()} />
      </ScrollScreen>
    );
  }

  const current = profile.data;

  return (
    // `center` porque esta pantalla es el formulario entero: dejaba la tarjeta
    // arriba con dos tercios de negro debajo, que es justo lo que se pidio
    // evitar. Centrada, el asistente ocupa la pantalla en vez de flotar en ella.
    <ScrollScreen center>
      <BackLink />
      <ScreenHeader
        subtitle={
          isNew
            ? 'Completa tus datos para personalizar tus entrenos.'
            : 'Mantén tus datos al día para seguir tu progreso.'
        }
        title={isNew ? 'Completar perfil' : 'Editar perfil'}
      />
      <ProfileForm
        defaults={{
          pesoKg: current ? String(current.pesoKg) : '',
          estaturaCm: current ? String(current.estaturaCm) : '',
          fechaNacimiento: splitBirthDate(current?.fechaNacimiento),
          objetivo: current?.objetivo ?? 'HIPERTROFIA',
        }}
        hadBirthDate={Boolean(current?.fechaNacimiento)}
        isNew={isNew}
      />
    </ScrollScreen>
  );
}
