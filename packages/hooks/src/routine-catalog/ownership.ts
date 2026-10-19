import type { Routine } from '@gymsheet/types';

/**
 * Qué puede hacer quien mira con una rutina (C1, C2). La regla vive aquí para
 * que web y móvil enseñen los mismos botones que el backend acepta.
 */

type OwnershipView = Pick<Routine, 'esMia' | 'estado'> & {
  dias?: ReadonlyArray<{ ejercicios: readonly unknown[] }>;
};

/**
 * «Activar programa» solo en una rutina propia (`403 ROUTINE_NOT_OWNED` en
 * otro caso), activa y con al menos un ejercicio. Una oficial propia sin
 * `puedoEditar` también se activa: no se mira `puedoEditar`.
 */
export function canActivateProgram(routine: OwnershipView | null | undefined): boolean {
  if (!routine || !routine.esMia || routine.estado === 'ARCHIVED') return false;
  if (!routine.dias) return true;
  return routine.dias.some((day) => day.ejercicios.length > 0);
}

/** «Guardar en mis rutinas» es la acción principal en una rutina ajena (C2). */
export function canSaveCopy(routine: Pick<Routine, 'esMia'> | null | undefined): boolean {
  return routine != null && !routine.esMia;
}

const COPY_SUFFIX = / · v(\d+)$/;

/** «Torso-Pierna 4 días · v2» → 2; `null` si el nombre no lleva sufijo de copia. */
export function copyNumberFromName(nombre: string): number | null {
  const match = COPY_SUFFIX.exec(nombre.trim());
  return match?.[1] ? Number(match[1]) : null;
}

/** El nombre sin el sufijo «· vN» de la copia. */
export function stripCopySuffix(nombre: string): string {
  return nombre.trim().replace(COPY_SUFFIX, '');
}

/** «v2»; `null` si no es una copia numerada. */
export function copyVersionLabel(
  routine: Pick<Routine, 'numeroCopia' | 'nombre'> | null | undefined,
): string | null {
  if (!routine) return null;
  const n = routine.numeroCopia ?? copyNumberFromName(routine.nombre);
  return n ? `v${n}` : null;
}

/** «Ya la guardaste como v2» (la copia más reciente de quien mira). */
export function savedCopyLabel(numeroCopia: number): string {
  return `Ya la guardaste como v${numeroCopia}`;
}
