import type { ActivateStrengthInput, Program, ProgramMode, Routine } from '@gymsheet/types';

/** Estimación de 1RM de Epley: peso × (1 + reps / 30). Mismo cálculo que el motor del backend. */
export function epley(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

/** Poco fiable por encima de 10 repeticiones (lo avisa la pantalla). */
export const EPLEY_RELIABLE_MAX_REPS = 10;

export const roundToStep = (kg: number, step = 1.25): number => Math.round(kg / step) * step;

/** «116,7 kg»: un decimal y coma. */
export function formatKg(kg: number): string {
  const rounded = Math.round(kg * 10) / 10;
  return `${String(rounded).replace('.', ',')} kg`;
}

/** Meta realista a 12 semanas: +5 a +10 % (principiante hasta +15 %). Solo orienta. */
export function realisticGoalRange(e1rmKg: number, beginner = false): { minKg: number; maxKg: number } {
  return {
    minKg: roundToStep(e1rmKg * 1.05),
    maxKg: roundToStep(e1rmKg * (beginner ? 1.15 : 1.1)),
  };
}

export const MODE_COPY: Record<ProgramMode, { title: string; body: string }> = {
  NONE: { title: 'Normal', body: 'Sigue la rutina tal cual.' },
  PROGRESSIVE_OVERLOAD: {
    title: 'Sobrecarga progresiva',
    body: 'La app sube el peso cuando estás listo. Multiplicador de puntos semanal.',
  },
  STRENGTH_GOALS: {
    title: 'Metas de marca',
    body: 'Elige 1–3 levantamientos y una meta. Insignia al lograrla.',
  },
};

export const MAX_GOALS = 3;

/** Datos que la persona escribe por levantamiento en el paso A4 (texto: viene de campos). */
export type LiftForm = {
  ejercicioId: string;
  nombre: string;
  pesoTrabajo: string;
  repsMin: string;
  repsMax: string;
  rir: string;
  marcaPeso: string;
  marcaReps: string;
  meta: string;
  fechaMeta: string;
};

export const emptyLiftForm = (ejercicioId: string, nombre: string): LiftForm => ({
  ejercicioId, nombre, pesoTrabajo: '', repsMin: '8', repsMax: '12', rir: '2',
  marcaPeso: '', marcaReps: '', meta: '', fechaMeta: '',
});

const num = (text: string): number | null => {
  const value = Number(text.replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) ? value : null;
};

/** El primer ejercicio de cada día (sin repetir): los levantamientos principales por defecto. */
export function mainLifts(routine: Pick<Routine, 'dias'>): Array<{ ejercicioId: string; nombre: string }> {
  const seen = new Set<string>();
  const lifts: Array<{ ejercicioId: string; nombre: string }> = [];
  for (const day of routine.dias) {
    const first = day.ejercicios[0]?.ejercicio;
    if (first && !seen.has(first.id)) {
      seen.add(first.id);
      lifts.push({ ejercicioId: first.id, nombre: first.nombre });
    }
  }
  return lifts;
}

/** 1RM estimado de la marca actual escrita, o null si faltan datos. */
export function estimateFromForm(form: Pick<LiftForm, 'marcaPeso' | 'marcaReps'>): number | null {
  const weight = num(form.marcaPeso);
  const reps = num(form.marcaReps);
  if (weight === null || reps === null || weight <= 0 || reps < 1) return null;
  return epley(weight, Math.round(reps));
}

export type LiftErrors = Partial<Record<'pesoTrabajo' | 'marca' | 'meta' | 'fechaMeta', string>>;

/** Validación por modo (mismas reglas que el backend, con textos para la persona). */
export function validateLifts(mode: ProgramMode, forms: readonly LiftForm[], today: string): LiftErrors[] {
  return forms.map((form) => {
    const errors: LiftErrors = {};
    if (mode === 'PROGRESSIVE_OVERLOAD') {
      const weight = num(form.pesoTrabajo);
      if (form.pesoTrabajo.trim() !== '' && (weight === null || weight < 0)) {
        errors.pesoTrabajo = 'Escribe un peso válido.';
      }
    }
    if (mode === 'STRENGTH_GOALS') {
      const e1rm = estimateFromForm(form);
      const goal = num(form.meta);
      if (e1rm === null) errors.marca = 'Escribe tu marca actual (peso y repeticiones).';
      if (goal === null || goal <= 0) errors.meta = 'Escribe la marca que quieres lograr.';
      else if (e1rm !== null && goal <= e1rm) errors.meta = 'La meta debe superar tu marca actual.';
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(form.fechaMeta)) errors.fechaMeta = 'Elige la fecha de la meta.';
      else if (form.fechaMeta < today) errors.fechaMeta = 'La fecha no puede estar en el pasado.';
    }
    return errors;
  });
}

export const hasErrors = (errors: readonly LiftErrors[]): boolean =>
  errors.some((e) => Object.keys(e).length > 0);

/** Arma el cuerpo de `POST /programs/strength/activate` desde lo escrito. */
export function buildActivateInput(input: {
  routineId: string;
  mode: ProgramMode;
  forms: readonly LiftForm[];
  fechaInicio?: string;
  duracionSemanas?: number;
  diasSemana?: number[];
  replace?: boolean;
}): ActivateStrengthInput {
  const base: ActivateStrengthInput = {
    routineId: input.routineId,
    modo: input.mode,
    ...(input.fechaInicio ? { fechaInicio: input.fechaInicio } : {}),
    ...(input.duracionSemanas ? { duracionSemanas: input.duracionSemanas } : {}),
    ...(input.diasSemana?.length ? { diasSemana: [...input.diasSemana].sort((a, b) => a - b) } : {}),
    ...(input.replace ? { replace: true } : {}),
  };
  if (input.mode === 'NONE') return base;
  const liftTargets = input.forms.flatMap((form) => {
    const target: NonNullable<ActivateStrengthInput['liftTargets']>[number] = { ejercicioId: form.ejercicioId };
    const weight = num(form.pesoTrabajo);
    if (input.mode === 'PROGRESSIVE_OVERLOAD') {
      if (weight !== null) target.pesoTrabajoKg = weight;
    } else {
      const goal = num(form.meta);
      const kg = num(form.marcaPeso);
      const reps = num(form.marcaReps);
      if (goal === null || kg === null || reps === null) return [];
      target.marcaMetaKg = goal;
      target.fechaMeta = form.fechaMeta;
      target.marcaActual = { pesoKg: kg, reps: Math.round(reps) };
    }
    const min = num(form.repsMin);
    const max = num(form.repsMax);
    if (min !== null) target.repsMin = Math.round(min);
    if (max !== null) target.repsMax = Math.round(max);
    const rir = num(form.rir);
    if (rir !== null) target.rirObjetivo = Math.round(rir);
    return [target];
  });
  return { ...base, liftTargets };
}

/** `ProgramCard`: «Semana 3 de 12 · x1,4». */
export function weekLabel(program: Pick<Program, 'semanaActual' | 'semanasTotales' | 'multiplicador'>): string {
  const week = program.semanaActual ? `Semana ${program.semanaActual} de ${program.semanasTotales}` : 'Fuera de calendario';
  return program.multiplicador > 1 ? `${week} · ${multiplierLabel(program.multiplicador)}` : week;
}

/** «x1,4». */
export function multiplierLabel(value: number): string {
  return `x${String(Math.round(value * 100) / 100).replace('.', ',')}`;
}

export type NextSession = { dia: number; nombre: string | null; routineDayId: string; esHoy: boolean };

/**
 * Próxima sesión del programa: el siguiente día de la rutina (ISO 1–7) desde `todayIso`
 * (1 = lunes). Si hoy toca, `esHoy` es verdadero. Una rutina sin días fijos no tiene.
 */
export function nextSession(routine: Pick<Routine, 'dias'>, todayIso: number): NextSession | null {
  const days = routine.dias
    .filter((day): day is typeof day & { diaSemana: number } => day.diaSemana !== null)
    .sort((a, b) => a.diaSemana - b.diaSemana);
  if (days.length === 0) return null;
  const upcoming = days.find((day) => day.diaSemana >= todayIso) ?? days[0];
  if (!upcoming) return null;
  return { dia: upcoming.diaSemana, nombre: upcoming.nombre, routineDayId: upcoming.id, esHoy: upcoming.diaSemana === todayIso };
}

/** Lunes = 1 … domingo = 7 para una fecha local. */
export function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}
