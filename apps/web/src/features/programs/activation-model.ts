import type { ActivateStrengthInput, LiftTargetInput, ProgramMode, Routine } from '@gymsheet/types';

/**
 * Lo que la persona va decidiendo al activar una rutina (RF-14..16), sin React:
 * valores por omisión desde la rutina, cálculos de la marca (Epley) y el cuerpo
 * de `POST /programs/strength/activate`.
 */
export type LiftDraft = {
  ejercicioId: string;
  nombre: string;
  incluir: boolean;
  /** Peso de trabajo en kg, como texto del campo (vacío = «lo calculamos en tu primera sesión»). */
  pesoKg: string;
  repsMin: string;
  repsMax: string;
  rir: string;
  /** Metas de marca. */
  marcaPesoKg: string;
  marcaReps: string;
  metaKg: string;
  metaFecha: string;
};

export type ActivationDraft = {
  inicio: 'hoy' | 'lunes';
  semanas: string;
  dias: number[];
  modo: ProgramMode;
  lifts: LiftDraft[];
  conCardio: boolean;
};

export const MAX_GOALS = 3;

const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const todayIso = (now: Date = new Date()) => iso(now);

/** El lunes que viene; si hoy ya es lunes, el de dentro de una semana. */
export function nextMondayIso(now: Date = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const untilMonday = (8 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + untilMonday);
  return iso(date);
}

export function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number) as [number, number, number];
  return iso(new Date(year, month - 1, day + days));
}

export function startDateOf(draft: Pick<ActivationDraft, 'inicio'>, now: Date = new Date()): string {
  return draft.inicio === 'lunes' ? nextMondayIso(now) : todayIso(now);
}

/** 1RM estimado (Epley): peso × (1 + reps / 30). Redondeado a un decimal. */
export function epley(pesoKg: number, reps: number): number {
  return Math.round(pesoKg * (1 + reps / 30) * 10) / 10;
}

/** Epley solo es fiable hasta 10 repeticiones. */
export const isReliableEstimate = (reps: number) => reps >= 1 && reps <= 10;

/** Meta «realista» en 12 semanas: entre +5 % y +10 % del 1RM estimado. */
export function realisticGoalRange(e1rm: number): { min: number; max: number } {
  return { min: Math.round(e1rm * 1.05), max: Math.round(e1rm * 1.1) };
}

const num = (value: string): number | null => {
  const parsed = Number(value.replace(',', '.'));
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
};

/** El primer ejercicio de cada día: los «principales» sobre los que se pide carga o meta. */
export function mainExercises(routine: Routine): Array<{ ejercicioId: string; nombre: string; pesoKg: number | null }> {
  const seen = new Set<string>();
  const result: Array<{ ejercicioId: string; nombre: string; pesoKg: number | null }> = [];
  for (const day of routine.dias) {
    const first = day.ejercicios[0];
    if (!first?.ejercicio || seen.has(first.ejercicio.id)) continue;
    seen.add(first.ejercicio.id);
    result.push({ ejercicioId: first.ejercicio.id, nombre: first.ejercicio.nombre, pesoKg: first.pesoObjetivoKg });
  }
  return result;
}

export function createDraft(routine: Routine, now: Date = new Date()): ActivationDraft {
  const weekdays = routine.dias.map((day) => day.diaSemana).filter((day): day is number => day !== null);
  const metaFecha = addDaysIso(todayIso(now), 84);
  return {
    inicio: 'hoy',
    semanas: String(routine.duracionSemanas ?? 4),
    dias: [...new Set(weekdays)].sort((a, b) => a - b),
    modo: 'NONE',
    conCardio: false,
    lifts: mainExercises(routine).map((exercise, index) => ({
      ejercicioId: exercise.ejercicioId,
      nombre: exercise.nombre,
      incluir: index < MAX_GOALS,
      pesoKg: exercise.pesoKg ? String(exercise.pesoKg) : '',
      repsMin: '8',
      repsMax: '12',
      rir: '2',
      marcaPesoKg: '',
      marcaReps: '5',
      metaKg: '',
      metaFecha,
    })),
  };
}

export type DraftErrors = Partial<Record<'semanas' | 'dias' | 'lifts', string>> & {
  lift?: Record<string, string>;
};

/** Qué falta para poder activar. Un mensaje por campo, en español llano. */
export function validateDraft(draft: ActivationDraft): DraftErrors {
  const errors: DraftErrors = {};
  const weeks = num(draft.semanas);
  if (weeks === null || !Number.isInteger(weeks) || weeks < 1 || weeks > 52) {
    errors.semanas = 'Elige entre 1 y 52 semanas.';
  }
  if (draft.dias.length === 0) errors.dias = 'Elige al menos un día de la semana.';
  if (draft.modo === 'NONE') return errors;

  const included = draft.lifts.filter((lift) => lift.incluir);
  if (included.length === 0) {
    errors.lifts = 'Elige al menos un levantamiento.';
    return errors;
  }
  if (draft.modo === 'STRENGTH_GOALS' && included.length > MAX_GOALS) {
    errors.lifts = `Elige como máximo ${MAX_GOALS} levantamientos.`;
  }
  const lift: Record<string, string> = {};
  for (const item of included) {
    const min = num(item.repsMin);
    const max = num(item.repsMax);
    if (min === null || max === null || min < 1 || max < min || max > 50) {
      lift[item.ejercicioId] = 'Las repeticiones van de un mínimo a un máximo (1 a 50).';
      continue;
    }
    if (draft.modo === 'PROGRESSIVE_OVERLOAD') {
      const peso = num(item.pesoKg);
      if (item.pesoKg.trim() !== '' && (peso === null || peso < 0 || peso > 1000)) {
        lift[item.ejercicioId] = 'El peso va de 0 a 1000 kg.';
      }
    } else {
      const peso = num(item.marcaPesoKg);
      const reps = num(item.marcaReps);
      const meta = num(item.metaKg);
      if (peso === null || peso <= 0 || reps === null || reps < 1 || reps > 30) {
        lift[item.ejercicioId] = 'Escribe tu marca actual: peso y repeticiones.';
      } else if (meta === null || meta <= 0 || meta > 1000) {
        lift[item.ejercicioId] = 'Escribe la marca que quieres lograr.';
      }
    }
  }
  if (Object.keys(lift).length > 0) errors.lift = lift;
  return errors;
}

export const hasErrors = (errors: DraftErrors) => Object.keys(errors).length > 0;

function toLiftTarget(lift: LiftDraft, mode: ProgramMode): LiftTargetInput {
  const base: LiftTargetInput = {
    ejercicioId: lift.ejercicioId,
    repsMin: Number(lift.repsMin),
    repsMax: Number(lift.repsMax),
  };
  if (mode === 'PROGRESSIVE_OVERLOAD') {
    const peso = num(lift.pesoKg);
    const rir = num(lift.rir);
    return { ...base, ...(peso !== null ? { pesoTrabajoKg: peso } : {}), rirObjetivo: rir };
  }
  return {
    ...base,
    marcaActual: { pesoKg: Number(lift.marcaPesoKg.replace(',', '.')), reps: Number(lift.marcaReps) },
    marcaMetaKg: Number(lift.metaKg.replace(',', '.')),
    fechaMeta: lift.metaFecha,
  };
}

/** El cuerpo de `POST /programs/strength/activate`. Solo se llama con un borrador sin errores. */
export function buildActivationInput(
  routineId: string,
  draft: ActivationDraft,
  options: { replace: boolean; now?: Date },
): ActivateStrengthInput {
  return {
    routineId,
    fechaInicio: startDateOf(draft, options.now),
    duracionSemanas: Number(draft.semanas),
    modo: draft.modo,
    diasSemana: draft.dias,
    replace: options.replace,
    ...(draft.modo === 'NONE'
      ? {}
      : { liftTargets: draft.lifts.filter((lift) => lift.incluir).map((lift) => toLiftTarget(lift, draft.modo)) }),
  };
}
