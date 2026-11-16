import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
import type { BodyMeasurement, FitnessGoal, OnboardingState } from '@/shared/api/contracts';
import { bodyMeasurementSchema, onboardingSchema } from '@/shared/api/schemas';

export const onboardingService = {
  get: () => apiRequest<OnboardingState>('/me/onboarding', onboardingSchema),
  saveProfile: (input: {
    weight: number;
    weightUnit: 'KG' | 'LB';
    height: number;
    heightUnit: 'CM' | 'IN';
    measuredOn: string;
    idempotencyKey?: string;
  }) =>
    apiRequest<OnboardingState>('/me/onboarding/profile', onboardingSchema, {
      method: 'PUT',
      body: input,
    }),
  saveGoals: (primaryGoal: FitnessGoal) =>
    apiRequest<OnboardingState>('/me/onboarding/goals', onboardingSchema, {
      method: 'PUT',
      body: { primaryGoal },
    }),
  savePreferences: (input: {
    experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    weeklyFrequency: number;
    trainingLocation: 'GYM' | 'HOME' | 'OUTDOORS' | 'MIXED';
    trainingPreferences: string[];
    physicalConsiderations?: string | null;
    consentHealth: boolean;
    /** Version of the health consent text shown; the backend defaults to the current one. */
    consentHealthVersion?: string;
    consentData: boolean;
  }) =>
    apiRequest<OnboardingState>('/me/onboarding/preferences', onboardingSchema, {
      method: 'PUT',
      body: input,
    }),
  saveEquipment: (availableEquipment: string[]) =>
    apiRequest<OnboardingState>('/me/onboarding/equipment', onboardingSchema, {
      method: 'PUT',
      body: { availableEquipment },
    }),
  complete: () =>
    apiRequest<OnboardingState>('/me/onboarding/complete', onboardingSchema, { method: 'POST' }),
  /** Closes the optional "Conocer" step. It never changes the COMPLETED status. */
  setSocialStep: (action: 'DONE' | 'SKIP') =>
    apiRequest<OnboardingState>('/me/onboarding/social', onboardingSchema, {
      method: 'PUT',
      body: { action },
    }),
  measurements: () =>
    apiRequest<BodyMeasurement[]>('/me/body-measurements', z.array(bodyMeasurementSchema)),
  addMeasurement: (input: {
    weight: number;
    unit: 'KG' | 'LB';
    measuredOn: string;
    idempotencyKey?: string;
  }) =>
    apiRequest<BodyMeasurement>('/me/body-measurements', bodyMeasurementSchema, {
      method: 'POST',
      body: input,
    }),
};
