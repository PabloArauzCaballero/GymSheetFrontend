import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import type { FitnessGoal } from '@gymsheet/types';
import { Ionicons } from '@expo/vector-icons';
import { equipmentOptions, goalOptions, preferenceOptions } from '@gymsheet/domain';
import { onboardingService } from '@/api/services';
import { BackLink } from '@/components/nav';
import { Checkbox } from '@/components/checkbox';
import { ErrorState, Skeleton } from '@/components/feedback';
import { numericInputProps } from '@/components/keyboard';
import { Card, ScrollScreen } from '@/components/layout';
import { EnterUp } from '@/components/motion';
import { StepProgress, type FlowStep } from '@/components/step-flow';
import { Text as AppText } from '@/components/text';
import { Button, Input } from '@/components/ui';
import {
  onboardingDone,
  onboardingFinish,
  onboardingFinishCta,
  onboardingSteps,
} from '@/features/first-impression/copy';
import { shortName } from '@/lib/format';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { accentPolicy, colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

const STEPS: readonly FlowStep[] = [
  { label: 'Objetivo', icon: 'flag-outline' },
  { label: 'Medidas', icon: 'barbell-outline' },
  { label: 'Cómo entrenas', icon: 'options-outline' },
  { label: 'Lugar y material', icon: 'construct-outline' },
];

const preferenceAlreadyAsked: Partial<Record<FitnessGoal, string>> = {
  GAIN_MUSCLE: 'Hipertrofia',
  IMPROVE_STRENGTH: 'Fuerza',
};

const today = new Date().toISOString().slice(0, 10);

/** Un glifo por objetivo, los mismos que usa el directorio de Comunidad. */
const GOAL_ICON: Record<FitnessGoal, keyof typeof Ionicons.glyphMap> = {
  GAIN_MUSCLE: 'barbell-outline',
  LOSE_FAT: 'flame-outline',
  IMPROVE_STRENGTH: 'flash-outline',
  IMPROVE_ENDURANCE: 'infinite-outline',
  MAINTAIN_FITNESS: 'fitness-outline',
  GENERAL_HEALTH: 'heart-outline',
  SPORT_PERFORMANCE: 'trophy-outline',
};

/** Chip de un toque, para elegir entre un puñado de opciones excluyentes ("KG" vs "LB"). */
function ToggleChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: minTouchTarget,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: active ? colors.volt : colors.border,
        backgroundColor: active ? colors.volt : colors.surface,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text
        style={{
          color: active ? colors.background : colors.text,
          fontSize: fontSizes.sm,
          fontWeight: semibold,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Selección múltiple libre: preferencias de entreno, equipo disponible. */
function ChoiceGroup({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: readonly string[];
  onToggle: (value: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <ToggleChip active={active} key={option} label={option} onPress={() => onToggle(option)} />
        );
      })}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const principal = useAuthStore((state) => state.principal);
  const state = useQuery({ queryKey: ['onboarding', 'me'], queryFn: () => onboardingService.get() });

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<FitnessGoal>('GENERAL_HEALTH');
  const [weight, setWeight] = useState('70');
  const [weightUnit, setWeightUnit] = useState<'KG' | 'LB'>('KG');
  const [height, setHeight] = useState('170');
  const [heightUnit, setHeightUnit] = useState<'CM' | 'IN'>('CM');
  const [experienceLevel, setExperience] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>(
    'BEGINNER',
  );
  const [weeklyFrequency, setFrequency] = useState('3');
  const [trainingLocation, setLocation] = useState<'GYM' | 'HOME' | 'OUTDOORS' | 'MIXED'>('GYM');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [considerations, setConsiderations] = useState('');
  const [consentHealth, setConsentHealth] = useState(false);
  const [consentData, setConsentData] = useState(false);

  // Retoma el paso donde quedó, y precarga lo que ya haya guardado — volver a
  // esta pantalla no debe reiniciar el cuestionario desde cero.
  useEffect(() => {
    if (!state.data) return;
    setStep(Math.min(3, state.data.currentStep - 1));
    if (state.data.primaryGoal) setGoal(state.data.primaryGoal);
    setWeightUnit(state.data.weightUnit);
    setHeightUnit(state.data.heightUnit);
    if (state.data.height) setHeight(String(state.data.height));
    if (state.data.experienceLevel) setExperience(state.data.experienceLevel);
    if (state.data.weeklyFrequency) setFrequency(String(state.data.weeklyFrequency));
    if (state.data.trainingLocation) setLocation(state.data.trainingLocation);
    setPreferences(state.data.trainingPreferences);
    setEquipment(state.data.availableEquipment);
    setConsiderations(state.data.physicalConsiderations ?? '');
    setConsentHealth(state.data.consentHealth);
    setConsentData(state.data.consentData);
    // Solo al cargar el estado inicial: no queremos que un refetch posterior
    // pise lo que la persona está escribiendo en este momento.
  }, [state.data === undefined]);

  const save = useMutation({
    mutationFn: async () => {
      if (step === 0) return onboardingService.saveGoals(goal);
      if (step === 1)
        return onboardingService.saveProfile({
          weight: Number(weight.replace(',', '.')),
          weightUnit,
          height: Number(height.replace(',', '.')),
          heightUnit,
          measuredOn: today,
          idempotencyKey: `onboarding-${today}-${weight}-${weightUnit}`,
        });
      if (step === 2)
        return onboardingService.savePreferences({
          experienceLevel,
          weeklyFrequency: Number(weeklyFrequency),
          trainingLocation,
          trainingPreferences: preferences,
          physicalConsiderations: considerations || null,
          consentHealth,
          consentData,
        });
      return onboardingService.saveEquipment(trainingLocation === 'GYM' ? [] : equipment);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['onboarding', 'me'], result);
      if (step < 3) setStep((current) => current + 1);
      else notify.success('Progreso guardado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const complete = useMutation({
    mutationFn: () => onboardingService.complete(),
    onSuccess: () => {
      // Lo que se acaba de contar cambia el perfil y las recomendaciones: sin
      // esto «Para ti» seguía pidiendo «Cuéntanos tu objetivo» varios minutos.
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      void queryClient.invalidateQueries({ queryKey: ['routines'] });
      notify.success(onboardingDone);
      router.replace('/home');
    },
    onError: (error: Error) => notify.error(error),
  });

  if (state.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={300} />
      </ScrollScreen>
    );
  }
  if (state.isError) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={state.error} onRetry={() => void state.refetch()} />
      </ScrollScreen>
    );
  }

  const weightValid = Number.isFinite(Number(weight.replace(',', '.'))) && Number(weight) > 0;
  const heightValid = Number.isFinite(Number(height.replace(',', '.'))) && Number(height) > 0;
  const stepValid = step !== 1 || (weightValid && heightValid);
  const consentGiven = step !== 2 || (consentHealth && consentData);

  // Un protagonista por paso: la pregunta. El último no pregunta, celebra, y
  // apunta a lo que viene después —elegir la rutina del primer entreno—.
  const heading =
    onboardingSteps[step] ??
    onboardingFinish(shortName(principal?.nombreCompleto, principal?.email), trainingLocation === 'GYM');

  return (
    <ScrollScreen>
      <BackLink />
      <StepProgress current={step} steps={STEPS} />

      {/* `key` vuelve a montar la cabecera al cambiar de paso: la pregunta nueva
          entra subiendo, que es lo que dice «has avanzado». Dos `EnterUp`. */}
      <View key={step} style={{ gap: spacing.sm }}>
        <EnterUp index={0}>
          <AppText tone="muted" variant="footnote">
            {`Paso ${step + 1} de 4 · Se guarda en tu cuenta`}
          </AppText>
        </EnterUp>
        <EnterUp index={1} style={{ gap: spacing.sm }}>
          {step === 3 ? (
            <Ionicons
              accessibilityElementsHidden
              color={accentPolicy.ink}
              importantForAccessibility="no-hide-descendants"
              name="checkmark-circle"
              size={iconSizes['2xl']}
            />
          ) : null}
          <AppText accessibilityRole="header" variant="display">
            {heading.title}
          </AppText>
          <AppText tone="secondary" variant="subhead">
            {heading.subline}
          </AppText>
        </EnterUp>
      </View>

      <Card style={{ gap: spacing.lg }}>
        {step === 0 ? (
          <View style={{ gap: spacing.sm }}>
            {goalOptions.map((option) => (
              <Pressable
                accessibilityLabel={`${option.label}. ${option.description}`}
                accessibilityRole="button"
                accessibilityState={{ selected: goal === option.value }}
                key={option.value}
                onPress={() => setGoal(option.value)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: goal === option.value ? colors.volt : colors.border,
                  backgroundColor: goal === option.value ? colors.surfaceHigh : colors.surface,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Ionicons
                  accessibilityElementsHidden
                  color={goal === option.value ? accentPolicy.ink : accentPolicy.glyph}
                  importantForAccessibility="no-hide-descendants"
                  name={GOAL_ICON[option.value]}
                  size={iconSizes.lg}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
                    {option.label}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, marginTop: 2 }}>
                    {option.description}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.xs }}>
              <Input
                error={!weightValid && weight.length > 0 ? 'Ingresa un peso válido.' : undefined}
                keyboardType="decimal-pad"
                {...numericInputProps}
                icon="barbell-outline"
                label="Peso actual"
                onChangeText={setWeight}
                value={weight}
              />
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <ToggleChip active={weightUnit === 'KG'} label="KG" onPress={() => setWeightUnit('KG')} />
                <ToggleChip active={weightUnit === 'LB'} label="LB" onPress={() => setWeightUnit('LB')} />
              </View>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Input
                error={!heightValid && height.length > 0 ? 'Ingresa una estatura válida.' : undefined}
                keyboardType="decimal-pad"
                {...numericInputProps}
                icon="resize-outline"
                label="Altura"
                onChangeText={setHeight}
                value={height}
              />
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <ToggleChip active={heightUnit === 'CM'} label="CM" onPress={() => setHeightUnit('CM')} />
                <ToggleChip active={heightUnit === 'IN'} label="IN" onPress={() => setHeightUnit('IN')} />
              </View>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.xs }}>
              <AppText strong variant="subhead">Experiencia</AppText>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const).map((level) => (
                  <ToggleChip
                    active={experienceLevel === level}
                    key={level}
                    label={{ BEGINNER: 'Inicial', INTERMEDIATE: 'Intermedia', ADVANCED: 'Avanzada' }[level]}
                    onPress={() => setExperience(level)}
                  />
                ))}
              </View>
            </View>
            <Input
              keyboardType="number-pad"
              {...numericInputProps}
              icon="calendar-outline"
              label="Días por semana"
              onChangeText={setFrequency}
              value={weeklyFrequency}
            />
            <View style={{ gap: spacing.xs }}>
              <AppText strong variant="subhead">Lugar</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {(['GYM', 'HOME', 'OUTDOORS', 'MIXED'] as const).map((location) => (
                  <ToggleChip
                    active={trainingLocation === location}
                    key={location}
                    label={{ GYM: 'Gimnasio', HOME: 'Casa', OUTDOORS: 'Exterior', MIXED: 'Mixto' }[location]}
                    onPress={() => setLocation(location)}
                  />
                ))}
              </View>
            </View>
            <View style={{ gap: spacing.xs }}>
              <AppText strong variant="subhead">
                Algo que quieras añadir a tu objetivo (opcional)
              </AppText>
              <ChoiceGroup
                onToggle={(value) =>
                  setPreferences((current) =>
                    current.includes(value)
                      ? current.filter((item) => item !== value)
                      : [...current, value],
                  )
                }
                options={preferenceOptions.filter((option) => option !== preferenceAlreadyAsked[goal])}
                selected={preferences}
              />
            </View>
            <Input
              label="Consideraciones físicas (opcional)"
              onChangeText={setConsiderations}
              value={considerations}
            />
            <Checkbox
              checked={consentHealth}
              label="Confirmo que la información física es correcta y puedo actualizarla después."
              onChange={setConsentHealth}
            />
            <Checkbox
              checked={consentData}
              label="Acepto el uso de estos datos para personalizar mi entrenamiento."
              onChange={setConsentData}
            />
          </View>
        ) : null}

        {step === 3 ? (
          trainingLocation === 'GYM' ? (
            <View style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.md }}>
                Entrenas en un gimnasio. Tomaremos como disponibles el material habitual, incluido banco y peso corporal.
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                Cuando crees una rutina podrás cambiar cualquier ejercicio si tu sede no tiene algo concreto.
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.md }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
                Marca solo el material que tienes fuera del gimnasio. El peso corporal ya está incluido.
              </Text>
              <ChoiceGroup
                onToggle={(value) =>
                  setEquipment((current) => {
                    if (current.includes(value)) return current.filter((item) => item !== value);
                    return value === 'Máquinas' ? [...current, 'Máquinas', 'Banco'].filter((item, index, all) => all.indexOf(item) === index) : [...current, value];
                  })
                }
                options={equipmentOptions.filter((option) => option !== 'Peso corporal')}
                selected={equipment}
              />
            </View>
          )
        ) : null}

        {step < 3 ? (
          <Button
            disabled={!stepValid || !consentGiven}
            icon="arrow-forward"
            iconPosition="end"
            label="Guardar y continuar"
            loading={save.isPending}
            onPress={() => save.mutate()}
          />
        ) : (
          <Button
            icon="arrow-forward"
            iconPosition="end"
            label={onboardingFinishCta}
            loading={save.isPending || complete.isPending}
            onPress={async () => {
              await save.mutateAsync();
              complete.mutate();
            }}
          />
        )}
        {step > 0 ? (
          <Button
            icon="arrow-back"
            label="Atrás"
            onPress={() => setStep((current) => Math.max(0, current - 1))}
            variant="ghost"
          />
        ) : null}
      </Card>
    </ScrollScreen>
  );
}
