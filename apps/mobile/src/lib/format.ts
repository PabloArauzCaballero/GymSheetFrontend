import type { Ionicons } from '@expo/vector-icons';
import type { MembershipStatus, TrainingGoal, WorkoutStatus } from '@gymsheet/types';
import type { BadgeTone } from '@/components/layout';

/** Fechas, horas y duraciones de sesión: compartidas con la web en `@gymsheet/domain`. */
export {
  formatTimeOfDay,
  relativeDay,
  sessionDuration as formatDuration,
  shortDate as formatDate,
  shortName,
} from '@gymsheet/domain';
import { formatTimeOfDay, relativeDay, shortDate as formatDate } from '@gymsheet/domain';

/** Spanish copy for the enums the client-facing screens display. */
export const GOAL_LABEL: Record<TrainingGoal, string> = {
  HIPERTROFIA: 'Hipertrofia',
  FUERZA: 'Fuerza',
  RESISTENCIA: 'Resistencia',
  PERDIDA_GRASA: 'Pérdida de grasa',
  SALUD_GENERAL: 'Salud general',
  RENDIMIENTO_DEPORTIVO: 'Rendimiento deportivo',
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

/** `1996-03-15` → `15/03/1996`. Se parte la cadena: un `Date` la movería de día según la zona. */
export function formatBirthDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return year && month && day ? `${day}/${month}/${year}` : '—';
}

/**
 * `14:32` today, `ayer` for the day before, `Lun` inside the last week, else
 * a short date — the same escalation WhatsApp/Tinder use for a chat list row,
 * so the newest conversation reads at a glance without opening it.
 */
const WEEKDAY_FORMAT = new Intl.DateTimeFormat('es', { weekday: 'short' });

export function chatTimestampLabel(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (days === 0) return formatTimeOfDay(iso) ?? '';
  if (days === 1) return 'ayer';
  if (days < 7) {
    const label = WEEKDAY_FORMAT.format(date);
    return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '');
  }
  return formatDate(iso);
}

/**
 * "En línea" / "Últ. vez hoy a las 14:32" / "Últ. vez ayer a las…" / etc —
 * mismo criterio que WhatsApp: en línea gana a cualquier fecha, y sin ningún
 * `lastSeenAt` (la cuenta nunca cerró un socket) no se inventa una hora.
 */
export function presenceLabel(online: boolean, lastSeenAt: string | null): string {
  if (online) return 'En línea';
  if (!lastSeenAt) return 'Sin conexión reciente';
  const date = new Date(lastSeenAt);
  if (Number.isNaN(date.getTime())) return 'Sin conexión reciente';
  const time = formatTimeOfDay(lastSeenAt);
  const day = relativeDay(lastSeenAt);
  if (day === 'Hoy') return `Últ. vez hoy a las ${time}`;
  if (day === 'Ayer') return `Últ. vez ayer a las ${time}`;
  return `Últ. vez el ${formatDate(lastSeenAt)}`;
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

/** Glifo de cada objetivo para la portada de respaldo (sin imagen). */
export const GOAL_ICON: Record<TrainingGoal, keyof typeof Ionicons.glyphMap> = {
  HIPERTROFIA: 'barbell',
  FUERZA: 'flash',
  RESISTENCIA: 'pulse',
  PERDIDA_GRASA: 'flame',
  SALUD_GENERAL: 'leaf',
  RENDIMIENTO_DEPORTIVO: 'trophy',
  REHABILITACION: 'medkit',
};
