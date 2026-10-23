/**
 * Lo que la app deja escrito para los widgets: entradas ya resueltas (texto,
 * ánimo, enlace) y los colores, porque el widget no puede importar el tema.
 * Puro y serializable a JSON: Android lo guarda en un archivo y lo relee desde
 * su tarea en segundo plano.
 */
import type { MascotMood } from './mascot.ts';
import type { NudgeEntry } from './nudge.ts';

export type WidgetPalette = Readonly<{ background: string; text: string; muted: string }>;

export type StoredEntry = Readonly<{
  at: number;
  mood: MascotMood;
  title: string;
  body: string;
  bodyPrivate: string;
  url: string;
}>;

export type NudgeSnapshot = Readonly<{
  version: 1;
  palette: WidgetPalette;
  gym: readonly StoredEntry[];
  matches: readonly StoredEntry[];
}>;

export function storeEntries(entries: readonly NudgeEntry[]): StoredEntry[] {
  return entries.map(({ date, ...rest }) => ({ at: date.getTime(), ...rest }));
}

/** La entrada vigente en `now`: la última que ya empezó, o la primera si ninguna empezó. */
export function currentEntry(entries: readonly StoredEntry[], now: number): StoredEntry | null {
  let current: StoredEntry | null = entries[0] ?? null;
  for (const entry of entries) if (entry.at <= now) current = entry;
  return current;
}

export function parseSnapshot(raw: string | null): NudgeSnapshot | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<NudgeSnapshot>;
    return value.version === 1 && Array.isArray(value.gym) && Array.isArray(value.matches) && value.palette
      ? (value as NudgeSnapshot)
      : null;
  } catch {
    return null;
  }
}
