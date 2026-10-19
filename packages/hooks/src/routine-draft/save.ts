import type {
  CreateRoutineWithDaysInput,
  Routine,
  RoutineStructureInput,
  RoutineWeekOverrideInput,
} from '@gymsheet/types';
import type { RoutineDraft } from './model';
import { toCreateInput, toStructureInput, toWeekOverrides } from './payload';

/** Lo que el guardado necesita del cliente de la API (`createRoutineServices` lo cumple). */
export type RoutineSaveServices = {
  createWithDays: (input: CreateRoutineWithDaysInput) => Promise<Routine>;
  replaceStructure: (id: string, input: RoutineStructureInput) => Promise<Routine>;
  setWeek: (id: string, semana: number, input: RoutineWeekOverrideInput) => Promise<unknown>;
};

export type SaveDraftResult = {
  routine: Routine;
  /** Semanas cuyo ajuste no se pudo enviar. La rutina sí quedó guardada. */
  semanasFallidas: number[];
};

/**
 * Guarda el borrador: `POST /routines` con los días la primera vez, y
 * `PUT /routines/:id/structure` si ya existe (reintento tras un fallo parcial,
 * o edición). Después envía los ajustes de semana uno a uno.
 *
 * `onCreated` se llama en cuanto el servidor devuelve el id, antes de los
 * ajustes de semana: así un fallo posterior no duplica la rutina al reintentar.
 */
export async function saveRoutineDraft(
  services: RoutineSaveServices,
  draft: RoutineDraft,
  onCreated?: (routineId: string) => void,
): Promise<SaveDraftResult> {
  let routine: Routine;
  if (draft.routineId) {
    routine = await services.replaceStructure(draft.routineId, toStructureInput(draft));
  } else {
    routine = await services.createWithDays(toCreateInput(draft));
    onCreated?.(routine.id);
  }
  const semanasFallidas: number[] = [];
  for (const { numero, cuerpo } of toWeekOverrides(draft)) {
    try {
      await services.setWeek(routine.id, numero, cuerpo);
    } catch {
      semanasFallidas.push(numero);
    }
  }
  return { routine, semanasFallidas };
}
