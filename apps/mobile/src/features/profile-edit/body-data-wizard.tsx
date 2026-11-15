import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { trainingGoals } from '@gymsheet/types';
import { profileService, type ProfileInput } from '@/api/services';
import { numericInputProps } from '@/components/keyboard';
import { Card } from '@/components/layout';
import { StepProgress } from '@/components/step-flow';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { BIRTH_DATE_PARTS } from '@/lib/birth-date';
import { notify } from '@/notifications';
import { spacing } from '@/theme';
import { GoalOption, StepHeading } from './body-data-steps';
import { PROFILE_STEPS, STEP_FIELD, profileFormSchema, type ProfileFormPayload, type ProfileFormValues } from './body-data-schema';

/** Peso, estatura, nacimiento y objetivo: cuatro preguntas, una por pantalla. */
export function BodyDataWizard({
  defaults,
  isNew,
  hadBirthDate,
  initialStep = 0,
}: {
  defaults: ProfileFormValues;
  isNew: boolean;
  hadBirthDate: boolean;
  initialStep?: number;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), PROFILE_STEPS.length - 1));
  const { control, handleSubmit, trigger, formState: { errors } } = useForm<ProfileFormValues, unknown, ProfileFormPayload>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: defaults,
  });

  const save = useMutation({
    // A user without a profile yet has to POST it: PATCH would 404 on nothing.
    mutationFn: (input: ProfileInput) => (isNew ? profileService.create(input) : profileService.update(input)),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
        // The saved weight is also a new row of the weight history.
        queryClient.invalidateQueries({ queryKey: ['profile', 'body-measurements'] }),
        // Completing these fields can award profile points: re-read the senda.
        queryClient.invalidateQueries({ queryKey: ['progression'] }),
      ]);
      notify.success('Perfil actualizado.');
      router.back();
    },
    onError: (error: unknown) => notify.error(error),
  });

  const onSubmit = handleSubmit(({ fechaNacimiento, ...values }) => {
    // Empty only clears a date that existed. If there never was one it is
    // omitted, so an age saved by an older app version survives a weight edit.
    save.mutate(fechaNacimiento === null && !hadBirthDate ? values : { ...values, fechaNacimiento });
  });

  /** Validates only the field on screen: the rest has not been asked yet. */
  const goNext = async () => {
    const field = STEP_FIELD[step];
    if (!field) return;
    if (await trigger(field)) setStep((current) => Math.min(current + 1, PROFILE_STEPS.length - 1));
  };

  return (
    <Card style={{ gap: spacing.lg, paddingVertical: spacing.xl }}>
      <StepProgress current={step} steps={PROFILE_STEPS} />

      {step === 0 ? (
        <>
          <StepHeading hint="Lo usamos para calcular el volumen de tus sesiones." icon="barbell-outline" question="¿Cuánto pesas?" />
          <Controller
            control={control}
            name="pesoKg"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input error={errors.pesoKg?.message} keyboardType="numeric" {...numericInputProps} label="Peso (kg)" onBlur={onBlur} onChangeText={onChange} placeholder="72,5" value={value} />
            )}
          />
        </>
      ) : null}

      {step === 1 ? (
        <>
          <StepHeading hint="Junto al peso permite seguir tu composición a lo largo del tiempo." icon="resize-outline" question="¿Cuánto mides?" />
          <Controller
            control={control}
            name="estaturaCm"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input error={errors.estaturaCm?.message} keyboardType="numeric" {...numericInputProps} label="Estatura (cm)" onBlur={onBlur} onChangeText={onChange} placeholder="178" value={value} />
            )}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <StepHeading hint="Opcional. Con ella calculamos tu edad, que así se mantiene al día sola." icon="calendar-outline" question="¿Cuándo naciste?" />
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
                        onChangeText={(text) => onChange({ ...value, [part.key]: text.replace(/\D/g, '') })}
                        placeholder={part.placeholder}
                        value={value[part.key]}
                      />
                    </View>
                  ))}
                </View>
                {errors.fechaNacimiento?.message ? (
                  <Text tone="danger" variant="footnote">
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
          <StepHeading hint="Ajusta las rutinas y las cargas que te sugerimos." icon="flag-outline" question="¿Cuál es tu objetivo?" />
          <Controller
            control={control}
            name="objetivo"
            render={({ field: { onChange, value } }) => (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {trainingGoals.map((goal) => (
                  <GoalOption goal={goal} key={goal} onSelect={() => onChange(goal)} selected={value === goal} />
                ))}
              </View>
            )}
          />
        </>
      ) : null}

      {step < PROFILE_STEPS.length - 1 ? (
        <Button icon="arrow-forward" iconPosition="end" label="Continuar" onPress={() => void goNext()} />
      ) : (
        <Button icon="checkmark" label="Guardar cambios" loading={save.isPending} onPress={onSubmit} testID="profile-data-save" />
      )}
      {step > 0 ? <Button icon="arrow-back" label="Volver" onPress={() => setStep((current) => current - 1)} variant="ghost" /> : null}
    </Card>
  );
}
