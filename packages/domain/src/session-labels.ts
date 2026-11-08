/**
 * Cómo se nombran fechas, horas y duraciones de sesiones en las listas de la
 * app (Inicio, historial). Compartido por la web y el móvil para que las dos
 * digan «Ayer · 18:05 · 52 min» igual.
 */
const SHORT_DATE = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' });
const SHORT_DATE_YEAR = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });

/** `14 ago`, o `14 ago 2025` si cae fuera del año en curso. */
export function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return (sameYear ? SHORT_DATE : SHORT_DATE_YEAR).format(date);
}

/** Distancia en días de calendario: una sesión a las 23:50 sigue siendo «Ayer» a las 00:10. */
export function relativeDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return shortDate(iso);
}

/** `HH:MM` de inicio: lo que distingue dos sesiones del mismo día. */
export function formatTimeOfDay(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Duración de una sesión cerrada; nula si sigue abierta o duró menos de un minuto. */
export function sessionDuration(startIso: string, endIso: string | null): string | null {
  if (!endIso) return null;
  const minutes = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest === 0 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 60)} h ${rest} min`;
}

/** El nombre de pila para saludar; sin nombre, la primera parte del correo con mayúscula. */
export function shortName(nombreCompleto: string | undefined, email: string | undefined): string {
  const first = nombreCompleto?.trim().split(/\s+/u)[0];
  if (first) return first;
  const local = email?.split('@')[0]?.split(/[._-]+/u)[0];
  if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  return 'atleta';
}
