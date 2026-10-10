import { z } from 'zod';
import { cardioPlanSchema, programSchema } from '@gymsheet/schemas';
import type { ActivateCardioInput, CardioPlanInput } from '@gymsheet/types';
import type { RequestFn } from './routine-services';

/** Plan de cardio manual y su programa (RF-17). Convive con el de pesas. */
export function createCardioServices(request: RequestFn) {
  return {
    createPlan: (input: CardioPlanInput) =>
      request('/cardio-plans', cardioPlanSchema, { method: 'POST', body: input }),
    listPlans: () => request('/cardio-plans', z.array(cardioPlanSchema), { method: 'GET' }),
    updatePlan: (id: string, patch: Partial<CardioPlanInput>) =>
      request(`/cardio-plans/${id}`, cardioPlanSchema, { method: 'PATCH', body: patch }),
    activate: (input: ActivateCardioInput) =>
      request('/programs/cardio/activate', programSchema, { method: 'POST', body: input }),
  };
}

export type CardioServices = ReturnType<typeof createCardioServices>;
