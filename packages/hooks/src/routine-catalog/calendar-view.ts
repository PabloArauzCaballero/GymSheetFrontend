import type {
  ExerciseMedia,
  Routine,
  RoutineCalendar,
  RoutineGroupType,
  RoutineWeek,
} from '@gymsheet/types';
import { WEEKDAYS, WEEKDAY_NAMES, type Weekday } from '../routine-draft/model';
import type { MonthColumn, PlannedWeek } from '../routine-draft/quality';
import {
  buildDayBlocks,
  estimateBlocksSeconds,
  exerciseMetaLabel,
  setsLabel,
  type DayBlock,
} from './day-blocks';

/** Una semana generada (`GET /routines/:id/calendar`) con el formato de la vista Mes. */
export function calendarWeeks(calendar: Pick<RoutineCalendar, 'semanas'>): PlannedWeek[] {
  return calendar.semanas.map((week) => ({
    numero: week.numero,
    esDescarga: week.esDescarga,
    ajustada: false,
  }));
}

/** Los siete días de la semana con lo que se entrena en cada uno. */
export function routineColumns(routine: Pick<Routine, 'dias'>): MonthColumn[] {
  return WEEKDAYS.map((dia) => {
    const day = routine.dias.find((candidate) => candidate.diaSemana === dia);
    return {
      dia,
      entrena: day !== undefined,
      nombre: day?.nombre?.trim() || null,
      ejercicios: day?.ejercicios.length ?? 0,
    };
  });
}

/** Rutina de «cualquier día»: un solo día sin día de la semana. */
export function isAnyDayRoutine(routine: Pick<Routine, 'dias'>): boolean {
  return routine.dias.length > 0 && routine.dias.every((day) => day.diaSemana === null);
}

/** Miniatura de un ejercicio para filas y tarjetas: la lámina, o el póster del vídeo. */
export type ExerciseThumb = {
  url: string;
  mediaType: ExerciseMedia['mediaType'];
  altText: string;
};

/**
 * La miniatura principal de un ejercicio. Nunca descarga un vídeo: con un vídeo
 * se usa su póster (`thumbnailUrl`), y si no lo tiene se devuelve `null` para
 * que la pantalla pinte el icono del músculo en lugar de un hueco.
 */
export function exerciseThumb(
  media: readonly ExerciseMedia[] | null | undefined,
): ExerciseThumb | null {
  const active = (media ?? []).filter((item) => item.status !== 'INACTIVE');
  const ordered = [...active].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder,
  );
  for (const item of ordered) {
    const url = item.mediaType === 'VIDEO' ? item.thumbnailUrl : (item.thumbnailUrl ?? item.url);
    if (url) return { url, mediaType: item.mediaType, altText: item.altText };
  }
  return null;
}

/** El nombre que se enseña: el revisado en español si existe (C3.b). */
export function exerciseDisplayName(
  exercise: { nombre: string; nombreEs?: string | null } | null | undefined,
): string {
  if (!exercise) return 'Ejercicio no disponible';
  return exercise.nombreEs?.trim() || exercise.nombre;
}

export type DayExerciseView = {
  routineExerciseId: string;
  ejercicioId: string;
  /** `nombreEs ?? nombre`. */
  nombre: string;
  /** Vocabulario crudo del dataset; la pantalla lo traduce (`muscleLabelEs`). */
  grupoMuscular: string | null;
  bodyPart: string | null;
  targetMuscle: string | null;
  /** Medios del ejercicio, tal cual (para `ExerciseImage`). */
  media: ExerciseMedia[];
  /** La miniatura ya elegida; `null` = icono del músculo. */
  imagen: ExerciseThumb | null;
  series: number;
  repsMin: number | null;
  repsMax: number | null;
  /** Serie por tiempo; con ella, las reps son `null`. */
  duracionSeg: number | null;
  pesoObjetivoKg: number | null;
  rirObjetivo: number | null;
  descansoSeg: number | null;
  descansoEntreSeg: number | null;
  nota: string | null;
  grupo: number | null;
  grupoTipo: RoutineGroupType | null;
  /** «3 × 8–12» o «3 × 30 s». */
  setsLabel: string;
  /** «3 series · 8–12 reps · 60 kg · RIR 2». */
  metaLabel: string;
  /** «A1», «A2»… dentro de un bloque; `null` si va suelto. */
  posicion: string | null;
  /** Ejercicio personal (privado) de otra persona: se puede denunciar. */
  esPrivado: boolean;
  /** Las series o el peso de la semana difieren de la rutina base (descarga). */
  ajustado: boolean;
};

export type DayView = {
  diaId: string;
  diaSemana: number | null;
  titulo: string;
  /** Todos los ejercicios en orden, ya con su `posicion`. */
  ejercicios: DayExerciseView[];
  /** Los mismos ejercicios agrupados en sueltos, superseries y circuitos. */
  bloques: Array<DayBlock<DayExerciseView>>;
  totalSeries: number;
  /** Duración estimada en minutos (`estimateBlocksSeconds`). */
  minutosEstimados: number;
};

/**
 * El día de una semana concreta: los nombres e imágenes salen de la rutina y
 * las series, repeticiones, peso y descansos, de la semana generada (que ya
 * aplica la descarga). Devuelve la lista plana y los bloques.
 */
export function dayView(
  routine: Pick<Routine, 'dias'>,
  week: RoutineWeek | undefined,
  diaId: string,
): DayView | null {
  const base = routine.dias.find((day) => day.id === diaId);
  if (!base) return null;
  const generated = week?.dias.find((day) => day.diaId === diaId);
  const title = [
    base.diaSemana ? WEEKDAY_NAMES[base.diaSemana as Weekday] : 'Cualquier día',
    base.nombre?.trim() || null,
  ]
    .filter(Boolean)
    .join(' · ');
  const flat = base.ejercicios.map((item): DayExerciseView => {
    const planned = generated?.ejercicios.find((e) => e.routineExerciseId === item.id);
    const series = planned?.series ?? item.seriesObjetivo;
    const duracionSeg = planned?.duracionSeg ?? item.duracionSeg ?? null;
    const repsMin = duracionSeg !== null ? null : (planned?.repsMin ?? item.repsMin);
    const repsMax = duracionSeg !== null ? null : (planned?.repsMax ?? item.repsMax);
    const pesoObjetivoKg = planned?.pesoObjetivoKg ?? item.pesoObjetivoKg;
    const rirObjetivo = planned?.rirObjetivo ?? item.rirObjetivo;
    const media = item.ejercicio?.media ?? [];
    return {
      routineExerciseId: item.id,
      ejercicioId: item.ejercicio?.id ?? planned?.ejercicioId ?? '',
      nombre: exerciseDisplayName(item.ejercicio),
      grupoMuscular: item.ejercicio?.grupoMuscular ?? null,
      bodyPart: item.ejercicio?.bodyPart ?? null,
      targetMuscle: item.ejercicio?.targetMuscle ?? null,
      media,
      imagen: exerciseThumb(media),
      esPrivado: item.ejercicio?.tipoEjercicio === 'PERSONAL',
      series,
      repsMin,
      repsMax,
      duracionSeg,
      pesoObjetivoKg,
      rirObjetivo,
      descansoSeg: planned?.descansoSeg ?? item.descansoSeg,
      descansoEntreSeg: planned?.descansoEntreSeg ?? item.descansoEntreSeg ?? null,
      nota: (planned?.nota ?? item.nota)?.trim() || null,
      grupo: planned?.grupo ?? item.grupo ?? null,
      grupoTipo: planned?.grupoTipo ?? item.grupoTipo ?? null,
      setsLabel: setsLabel({ series, repsMin, repsMax, duracionSeg }),
      metaLabel: exerciseMetaLabel({
        series,
        repsMin,
        repsMax,
        duracionSeg,
        pesoObjetivoKg,
        rirObjetivo,
      }),
      posicion: null,
      ajustado: series !== item.seriesObjetivo,
    };
  });
  const bloques = buildDayBlocks(flat);
  const ejercicios = bloques.flatMap((block) => block.items);
  return {
    diaId,
    diaSemana: base.diaSemana,
    titulo: title,
    ejercicios,
    bloques,
    totalSeries: ejercicios.reduce((sum, item) => sum + item.series, 0),
    minutosEstimados:
      ejercicios.length === 0 ? 0 : Math.max(1, Math.round(estimateBlocksSeconds(bloques) / 60)),
  };
}
