import type {
  CreateRoutineWithDaysInput,
  RoutineDayInput,
  RoutineStructureInput,
  RoutineWeekOverrideInput,
} from '@gymsheet/types';
import { durationInWeeks, type RoutineDraft } from './model';

/** Volumen y carga de una semana de descarga cuando la persona la marca a mano (04 · §1). */
const DELOAD_VOLUME = 0.5;
const DELOAD_LOAD = 0.9;

export function toDayInputs(draft: RoutineDraft): RoutineDayInput[] {
  return draft.dias.map((day) => ({
    diaSemana: day.diaSemana,
    nombre: day.nombre.trim() || null,
    ejercicios: day.ejercicios.map((exercise) => ({
      ejercicioId: exercise.ejercicioId,
      seriesObjetivo: exercise.seriesObjetivo,
      repsMin: exercise.repsMin,
      // Un rango invertido (12–8) es un descuido, no una intención: el servidor rechazaría
      // toda la rutina, así que el máximo nunca queda por debajo del mínimo.
      repsMax:
        exercise.repsMin !== null && exercise.repsMax !== null
          ? Math.max(exercise.repsMin, exercise.repsMax)
          : exercise.repsMax,
      pesoObjetivoKg: exercise.pesoObjetivoKg,
      rirObjetivo: exercise.rirObjetivo,
      descansoSeg: exercise.descansoSeg,
      nota: exercise.nota?.trim() || null,
    })),
  }));
}

/** Cuerpo de `POST /routines` (rutina completa con sus días). */
export function toCreateInput(draft: RoutineDraft): CreateRoutineWithDaysInput {
  return {
    nombre: draft.nombre.trim(),
    descripcion: draft.descripcion.trim() || null,
    objetivo: draft.objetivo,
    visibilidad: draft.visibilidad,
    duracionSemanas: durationInWeeks(draft.duracion),
    progresion: {
      activa: draft.progresion.activa,
      descargaCada: draft.progresion.activa ? draft.progresion.descargaCada : null,
    },
    dias: toDayInputs(draft),
  };
}

/** Cuerpo de `PUT /routines/:id/structure`. */
export function toStructureInput(draft: RoutineDraft): RoutineStructureInput {
  return { dias: toDayInputs(draft) };
}

/** Los ajustes de semana que hay que enviar tras guardar (`PUT /routines/:id/weeks/:n`). */
export function toWeekOverrides(
  draft: RoutineDraft,
): Array<{ numero: number; cuerpo: RoutineWeekOverrideInput }> {
  const total = durationInWeeks(draft.duracion);
  return Object.entries(draft.semanas)
    .map(([key, choice]) => ({ numero: Number(key), choice }))
    .filter(({ numero }) => Number.isInteger(numero) && numero >= 1 && numero <= total)
    .sort((a, b) => a.numero - b.numero)
    .map(({ numero, choice }) => ({
      numero,
      cuerpo:
        choice === 'DESCARGA'
          ? {
              esDescarga: true,
              factorVolumen: DELOAD_VOLUME,
              factorCarga: DELOAD_LOAD,
            }
          : { esDescarga: false, factorVolumen: 1, factorCarga: 1 },
    }));
}
