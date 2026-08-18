'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { notify } from '@/shared/notifications';
import type { FitnessGoal } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { equipmentOptions, goalOptions, preferenceOptions } from '../onboarding-options';
import { onboardingService } from '../services/onboarding-service';
import { ChoiceGroup } from './choice-group';

const today = new Date().toISOString().slice(0, 10);

export type OnboardingState = Awaited<ReturnType<typeof onboardingService.get>>;

export function OnboardingForm({ initial }: Readonly<{ initial: OnboardingState }>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(Math.min(4, initial.currentStep));
  const [goal, setGoal] = useState<FitnessGoal>(initial.primaryGoal ?? 'GENERAL_HEALTH');
  const [weight, setWeight] = useState(70);
  const [height, setHeight] = useState(initial.height ?? 170);
  const [weightUnit, setWeightUnit] = useState<'KG' | 'LB'>(initial.weightUnit);
  const [heightUnit, setHeightUnit] = useState<'CM' | 'IN'>(initial.heightUnit);
  const [experienceLevel, setExperience] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>(
    initial.experienceLevel ?? 'BEGINNER',
  );
  const [weeklyFrequency, setFrequency] = useState(initial.weeklyFrequency ?? 3);
  const [trainingLocation, setLocation] = useState<'GYM' | 'HOME' | 'OUTDOORS' | 'MIXED'>(
    initial.trainingLocation ?? 'GYM',
  );
  const [preferences, setPreferences] = useState<string[]>(initial.trainingPreferences);
  const [equipment, setEquipment] = useState<string[]>(initial.availableEquipment);
  const [considerations, setConsiderations] = useState(initial.physicalConsiderations ?? '');
  const [consentHealth, setConsentHealth] = useState(initial.consentHealth);
  const [consentData, setConsentData] = useState(initial.consentData);
  const save = useMutation({
    mutationFn: async () => {
      if (step === 1) return onboardingService.saveGoals(goal);
      if (step === 2)
        return onboardingService.saveProfile({
          weight,
          weightUnit,
          height,
          heightUnit,
          measuredOn: today,
          idempotencyKey: `onboarding-${today}-${weight}-${weightUnit}`,
        });
      if (step === 3)
        return onboardingService.savePreferences({
          experienceLevel,
          weeklyFrequency,
          trainingLocation,
          trainingPreferences: preferences,
          physicalConsiderations: considerations || null,
          consentHealth,
          consentData,
        });
      return onboardingService.saveEquipment(equipment);
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(queryKeys.onboarding, result);
      if (step < 4) setStep(step + 1);
      notify.success('Progreso guardado.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const complete = useMutation({
    mutationFn: onboardingService.complete,
    onSuccess: async (result) => {
      queryClient.setQueryData(queryKeys.onboarding, result);
      router.replace('/dashboard');
      router.refresh();
    },
    onError: (error: Error) => notify.error(error),
  });
  const valid = step !== 2 || (weight > 0 && height > 0);
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-8 sm:py-12">
      <div>
        <p className="data-label text-[var(--accent-ink)]">Configuración inicial</p>
        <h1 className="mt-2 text-3xl font-bold">Personaliza tu experiencia</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Paso {step} de 4 · Tu progreso se guarda en tu cuenta.
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-high)]">
          <div
            className="h-full bg-[var(--volt)] transition-all"
            style={{ width: `${step * 25}%` }}
          />
        </div>
      </div>
      <Card>
        <CardHeader
          title={
            [
              'Tu objetivo principal',
              'Medidas actuales',
              'Cómo quieres entrenar',
              'Equipo disponible',
            ][step - 1] ?? 'Configuración'
          }
        />
        <CardContent className="grid gap-5">
          {step === 1 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {goalOptions.map((item) => (
                <button
                  className={`rounded-lg border p-4 text-left ${goal === item.value ? 'border-[var(--volt)] bg-[var(--surface-high)]' : 'border-[var(--border-subtle)]'}`}
                  key={item.value}
                  onClick={() => setGoal(item.value)}
                  type="button"
                >
                  <span className="font-semibold">{item.label}</span>
                  <span className="mt-1 block text-sm text-[var(--text-muted)]">
                    {item.description}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          {step === 2 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="weight" label="Peso actual">
                <div className="flex gap-2">
                  <Input
                    id="weight"
                    inputMode="decimal"
                    min="1"
                    onChange={(event) => setWeight(event.target.valueAsNumber)}
                    step="0.1"
                    type="number"
                    value={weight}
                  />
                  <Select
                    aria-label="Unidad de peso"
                    onChange={(event) => setWeightUnit(event.target.value as 'KG' | 'LB')}
                    value={weightUnit}
                  >
                    <option>KG</option>
                    <option>LB</option>
                  </Select>
                </div>
              </Field>
              <Field htmlFor="height" label="Altura">
                <div className="flex gap-2">
                  <Input
                    id="height"
                    inputMode="decimal"
                    min="1"
                    onChange={(event) => setHeight(event.target.valueAsNumber)}
                    step="0.1"
                    type="number"
                    value={height}
                  />
                  <Select
                    aria-label="Unidad de altura"
                    onChange={(event) => setHeightUnit(event.target.value as 'CM' | 'IN')}
                    value={heightUnit}
                  >
                    <option>CM</option>
                    <option>IN</option>
                  </Select>
                </div>
              </Field>
            </div>
          ) : null}
          {step === 3 ? (
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field htmlFor="experience" label="Experiencia">
                  <Select
                    id="experience"
                    onChange={(event) =>
                      setExperience(event.target.value as typeof experienceLevel)
                    }
                    value={experienceLevel}
                  >
                    <option value="BEGINNER">Inicial</option>
                    <option value="INTERMEDIATE">Intermedia</option>
                    <option value="ADVANCED">Avanzada</option>
                  </Select>
                </Field>
                <Field htmlFor="frequency" label="Días por semana">
                  <Input
                    id="frequency"
                    max="7"
                    min="1"
                    onChange={(event) => setFrequency(event.target.valueAsNumber)}
                    type="number"
                    value={weeklyFrequency}
                  />
                </Field>
                <Field htmlFor="location" label="Lugar">
                  <Select
                    id="location"
                    onChange={(event) => setLocation(event.target.value as typeof trainingLocation)}
                    value={trainingLocation}
                  >
                    <option value="GYM">Gimnasio</option>
                    <option value="HOME">Casa</option>
                    <option value="OUTDOORS">Exterior</option>
                    <option value="MIXED">Mixto</option>
                  </Select>
                </Field>
              </div>
              <ChoiceGroup
                options={preferenceOptions}
                selected={preferences}
                setSelected={setPreferences}
              />
              <Field htmlFor="considerations" label="Consideraciones físicas (opcional)">
                <Input
                  id="considerations"
                  onChange={(event) => setConsiderations(event.target.value)}
                  value={considerations}
                />
              </Field>
              <label className="flex gap-3 text-sm">
                <input
                  checked={consentHealth}
                  onChange={(event) => setConsentHealth(event.target.checked)}
                  type="checkbox"
                />
                Confirmo que la información física es correcta y puedo actualizarla después.
              </label>
              <label className="flex gap-3 text-sm">
                <input
                  checked={consentData}
                  onChange={(event) => setConsentData(event.target.checked)}
                  type="checkbox"
                />
                Acepto el uso de estos datos para personalizar mi entrenamiento.
              </label>
            </div>
          ) : null}
          {step === 4 ? (
            <ChoiceGroup
              options={equipmentOptions}
              selected={equipment}
              setSelected={setEquipment}
            />
          ) : null}
          <div className="flex justify-between gap-3 border-t border-[var(--border-subtle)] pt-5">
            <Button
              disabled={step === 1}
              onClick={() => setStep(Math.max(1, step - 1))}
              variant="ghost"
            >
              <ChevronLeft className="size-4" />
              Atrás
            </Button>
            {step < 4 ? (
              <Button
                disabled={!valid || (step === 3 && (!consentData || !consentHealth))}
                loading={save.isPending}
                onClick={() => save.mutate()}
                variant="primary"
              >
                Guardar y continuar
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button
                loading={save.isPending || complete.isPending}
                onClick={async () => {
                  await save.mutateAsync();
                  complete.mutate();
                }}
                variant="primary"
              >
                <Check className="size-4" />
                Completar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
