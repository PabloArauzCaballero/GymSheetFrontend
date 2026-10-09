import { z } from 'zod';
import {
  activeProgramsSchema,
  cardioPlanSchema,
  closeResultSchema,
  nextLoadsSchema,
  programProgressSchema,
  programSchema,
} from '@gymsheet/schemas';
import type {
  ActivateStrengthInput,
  CardioPlanInput,
  CloseAction,
  RoutineProposal,
} from '@gymsheet/schemas';
import { routineSchema } from '@gymsheet/schemas';
import type { RequestFn } from './routine-services';

/** Programas de fuerza y cardio (RF-14..16, RF-19, RF-20, RF-17). */
export function createProgramServices(request: RequestFn) {
  return {
    active: () => request('/programs/active', activeProgramsSchema, { method: 'GET' }),
    /** `409 PROGRAM_ACTIVE_CONFLICT` trae `details.activeProgram`; reintentar con `replace: true`. */
    activateStrength: (input: ActivateStrengthInput) =>
      request('/programs/strength/activate', programSchema, { method: 'POST', body: input }),
    activateCardio: (input: {
      cardioPlanId?: string;
      cardioPlan?: CardioPlanInput;
      fechaInicio?: string;
      duracionSemanas?: number;
      replace?: boolean;
    }) => request('/programs/cardio/activate', programSchema, { method: 'POST', body: input }),
    stop: (id: string) => request(`/programs/${id}/stop`, programSchema, { method: 'POST' }),
    progress: (id: string) => request(`/programs/${id}/progress`, programProgressSchema, { method: 'GET' }),
    nextLoads: (id: string) => request(`/programs/${id}/next-loads`, nextLoadsSchema, { method: 'GET' }),
    close: (id: string, accion: CloseAction) =>
      request(`/programs/${id}/close`, closeResultSchema, { method: 'POST', body: { accion } }),
    /** RF-20: aplica la propuesta (o la parte aceptada) a la rutina propia de la sesión. */
    applyToRoutine: (workoutId: string, proposal: RoutineProposal) =>
      request(`/workouts/${workoutId}/apply-to-routine`, routineSchema, { method: 'POST', body: proposal }),
    cardioPlans: () => request('/cardio-plans', z.array(cardioPlanSchema), { method: 'GET' }),
    createCardioPlan: (input: CardioPlanInput) =>
      request('/cardio-plans', cardioPlanSchema, { method: 'POST', body: input }),
  };
}

export type ProgramServices = ReturnType<typeof createProgramServices>;
