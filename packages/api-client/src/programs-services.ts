import {
  activeProgramsSchema,
  closeProgramResultSchema,
  nextLoadsSchema,
  programProgressSchema,
  programSchema,
  routineSchema,
} from '@gymsheet/schemas';
import type { ActivateStrengthInput, ApplyToRoutineInput, CloseAction } from '@gymsheet/types';
import type { RequestFn } from './routine-services';

/**
 * Programas de pesas (RF-14..16, RF-19, RF-20).
 *
 * `activateStrength` responde `409 PROGRAM_ACTIVE_CONFLICT` con
 * `details.activeProgram` si ya hay otro de pesas; con `replace: true` lo apaga.
 * Con una rutina ajena responde `403 ROUTINE_NOT_OWNED` (`details.routineId`):
 * primero hay que guardarla (`sharing.copy`, que devuelve la copia «· vN»).
 */
export function createProgramServices(request: RequestFn) {
  return {
    active: () => request('/programs/active', activeProgramsSchema, { method: 'GET' }),
    activateStrength: (input: ActivateStrengthInput) =>
      request('/programs/strength/activate', programSchema, { method: 'POST', body: input }),
    stop: (id: string) => request(`/programs/${id}/stop`, programSchema, { method: 'POST' }),
    progress: (id: string) =>
      request(`/programs/${id}/progress`, programProgressSchema, { method: 'GET' }),
    nextLoads: (id: string) =>
      request(`/programs/${id}/next-loads`, nextLoadsSchema, { method: 'GET' }),
    close: (id: string, accion: CloseAction) =>
      request(`/programs/${id}/close`, closeProgramResultSchema, {
        method: 'POST',
        body: { accion },
      }),
    /** RF-20: lleva a la rutina lo que se hizo en la sesión (la `propuesta` de `finish`, tal cual). */
    applyToRoutine: (sessionId: string, input: ApplyToRoutineInput) =>
      request(`/workouts/${sessionId}/apply-to-routine`, routineSchema, {
        method: 'POST',
        body: input,
      }),
  };
}

export type ProgramServices = ReturnType<typeof createProgramServices>;
