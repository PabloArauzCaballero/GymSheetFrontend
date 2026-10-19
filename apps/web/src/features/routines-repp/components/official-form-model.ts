import type { CreateOfficialInput } from '@/features/routines-repp/services/routines-repp-service';

export type DraftExercise = {
  key: string;
  ejercicioId: string;
  nombre: string;
  series: number;
  repsMin: number | null;
  repsMax: number | null;
};

export type DraftDay = {
  key: string;
  diaSemana: number | null;
  nombre: string;
  ejercicios: DraftExercise[];
};

export type OfficialDraft = {
  nombre: string;
  descripcion: string;
  dias: DraftDay[];
};

export const WEEKDAYS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

export const emptyDraft = (): OfficialDraft => ({
  nombre: '',
  descripcion: '',
  dias: [],
});

/** Lo que el formulario no deja enviar, dicho a quien lo rellena. */
export function validateDraft(draft: OfficialDraft): string | null {
  if (draft.nombre.trim().length < 2) return 'Ponle un nombre de al menos 2 letras.';
  if (draft.dias.length === 0) return 'Añade al menos un día.';
  const weekdays = draft.dias.flatMap((day) => (day.diaSemana === null ? [] : [day.diaSemana]));
  if (new Set(weekdays).size !== weekdays.length) {
    return 'Dos días no pueden caer en el mismo día de la semana.';
  }
  if (draft.dias.some((day) => day.ejercicios.length === 0)) {
    return 'Cada día necesita al menos un ejercicio.';
  }
  const badReps = draft.dias
    .flatMap((day) => day.ejercicios)
    .some((e) => e.repsMin !== null && e.repsMax !== null && e.repsMax < e.repsMin);
  if (badReps) return 'Las repeticiones máximas no pueden ser menores que las mínimas.';
  return null;
}

export function draftToInput(draft: OfficialDraft): CreateOfficialInput {
  return {
    nombre: draft.nombre.trim(),
    descripcion: draft.descripcion.trim() || null,
    dias: draft.dias.map((day) => ({
      diaSemana: day.diaSemana,
      nombre: day.nombre.trim() || null,
      ejercicios: day.ejercicios.map((e) => ({
        ejercicioId: e.ejercicioId,
        seriesObjetivo: e.series,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
      })),
    })),
  };
}
