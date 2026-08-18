import type { MembershipStatus, TrainingGoal, WorkoutStatus } from '@gymsheet/types';
import type { BadgeTone } from '@/components/layout';

/** Spanish copy for the enums the client-facing screens display. */
export const GOAL_LABEL: Record<TrainingGoal, string> = {
  HIPERTROFIA: 'Hipertrofia',
  FUERZA: 'Fuerza',
  RESISTENCIA: 'Resistencia',
  PERDIDA_GRASA: 'Pérdida de grasa',
  SALUD_GENERAL: 'Salud general',
  REHABILITACION: 'Rehabilitación',
};

export const MEMBERSHIP_LABEL: Record<MembershipStatus, string> = {
  ACTIVE: 'Activa',
  SUSPENDED: 'Suspendida',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Vencida',
};

export const MEMBERSHIP_TONE: Record<MembershipStatus, BadgeTone> = {
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  CANCELLED: 'danger',
  EXPIRED: 'danger',
};

export const WORKOUT_LABEL: Record<WorkoutStatus, string> = {
  EN_PROGRESO: 'En progreso',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

export const WORKOUT_TONE: Record<WorkoutStatus, BadgeTone> = {
  EN_PROGRESO: 'info',
  FINALIZADA: 'success',
  CANCELADA: 'danger',
};

const DATE_FORMAT = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });
const DATE_YEAR_FORMAT = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** `14 ago`, or `14 ago 2025` when it falls outside the current year. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return (sameYear ? DATE_FORMAT : DATE_YEAR_FORMAT).format(date);
}

/** Calendar-day distance, so a session at 23:50 is still "Ayer" at 00:10. */
export function relativeDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return formatDate(iso);
}

/**
 * `HH:MM` for the session's start. A history where every row reads "Hace 2
 * días" distinguishes nothing; the clock time is what tells two sessions on the
 * same day apart.
 */
export function formatTimeOfDay(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Session length. Null while it is still running and for sessions that closed
 * within the same minute — "0 min" is noise, not information.
 */
export function formatDuration(startIso: string, endIso: string | null): string | null {
  if (!endIso) return null;
  const minutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 60)} h ${rest} min`;
}

/**
 * Short human label for greetings.
 *
 * `GET /auth/me` does not return `nombreCompleto` (only `POST /auth/login`
 * does), so after the session rehydrates on app start the name is gone. Falling
 * back to the raw email printed the whole address across two lines; the local
 * part reads like a name and fits on one.
 */
export function shortName(nombreCompleto: string | undefined, email: string | undefined): string {
  const first = nombreCompleto?.trim().split(/\s+/u)[0];
  if (first) return first;
  // Falling back to the raw local part greets people as "active.mock". Take the
  // first token of it and capitalise instead: an address is a login, not a name,
  // and a greeting is the first thing on the screen.
  const local = email?.split('@')[0]?.split(/[._-]+/u)[0];
  if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  return 'atleta';
}

/** Initials for the profile avatar; falls back to the email's first letter. */
export function initialsOf(name: string | undefined, email: string | undefined): string {
  const source = name?.trim();
  if (source) {
    const parts = source.split(/\s+/u).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
  }
  return email?.[0]?.toUpperCase() ?? '?';
}
