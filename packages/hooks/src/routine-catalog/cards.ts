import type { RoutineCard } from '@gymsheet/types';
import { WEEKDAYS, type Weekday } from '../routine-draft/model';

/** «3 meses», «12 semanas», «Sin duración fija». */
export function durationLabel(weeks: number | null): string {
  if (!weeks) return 'Sin duración fija';
  if (weeks % 4 === 0 && weeks >= 8) return `${weeks / 4} meses`;
  return weeks === 1 ? '1 semana' : `${weeks} semanas`;
}

/** «4 días/sem · 3 meses». */
export function cardSubtitle(card: Pick<RoutineCard, 'diasPorSemana' | 'duracionSemanas'>): string {
  const days = card.diasPorSemana === 1 ? '1 día/sem' : `${card.diasPorSemana} días/sem`;
  return `${days} · ${durationLabel(card.duracionSemanas)}`;
}

/** Los siete puntos de la semana: cuáles entrena (miniatura de la tarjeta). */
export function weekDots(card: Pick<RoutineCard, 'dias'>): Array<{ dia: Weekday; entrena: boolean }> {
  const trained = new Set(card.dias.map((day) => day.diaSemana));
  return WEEKDAYS.map((dia) => ({ dia, entrena: trained.has(dia) }));
}

export const isPendingInvitation = (card: Pick<RoutineCard, 'invitacion'>): boolean =>
  card.invitacion?.estado === 'PENDING';

/** Autor visible: «REPP» para las oficiales; «@nombre» para el resto. */
export function authorLabel(card: Pick<RoutineCard, 'esOficial' | 'esMia' | 'autor'>): string {
  if (card.esOficial) return 'REPP';
  return card.esMia ? 'Tú' : card.autor.nombre;
}

/** «★ 4,6 (32)» o «Sin valoraciones». */
export function ratingLabel(rating: { promedio: number | null; total: number }): string {
  if (rating.promedio === null || rating.total === 0) return 'Sin valoraciones';
  return `★ ${rating.promedio.toFixed(1).replace('.', ',')} (${rating.total})`;
}

export function copiesLabel(copias: number): string {
  return copias === 1 ? '1 copia' : `${copias} copias`;
}

/** Texto de la tarjeta de invitación: «@ana te compartió "Empuje 4 días"». */
export function invitationHeadline(card: Pick<RoutineCard, 'invitacion' | 'nombre'>): string {
  const from = card.invitacion?.deParte.nombre || 'Alguien';
  return `${from} te compartió «${card.nombre}»`;
}
