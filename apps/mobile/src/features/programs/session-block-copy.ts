import type { ProgramSessionExtras } from '@gymsheet/types';

/**
 * Texto de «Tu programa» al terminar la sesión.
 *
 * - Sin sesiones planeadas esa semana (el programa empezó un día sin entreno) no hay fracción «1 de 0»:
 *   la sesión cuenta y ya.
 * - El bono previsto del modo solo se promete si la sesión cuenta: «Para contar necesitas 10 minutos»
 *   junto a «+13 por sobrecarga» se contradecía.
 */
export function describeSessionCount(block: Pick<ProgramSessionExtras, 'sesionCuenta' | 'motivoNoCuenta' | 'sesionesHechasSemana' | 'sesionesPlanSemana' | 'semana'>): string {
  if (!block.sesionCuenta) return block.motivoNoCuenta ?? 'Esta sesión no cuenta para la semana.';
  const week = block.semana ? ` ${block.semana}` : '';
  if (block.sesionesPlanSemana <= 0) return `Esta sesión cuenta para tu programa (semana${week || ' en curso'}).`;
  return `Esta sesión cuenta: ${block.sesionesHechasSemana} de ${block.sesionesPlanSemana} de la semana${week}.`;
}

export function showsModeBonus(block: Pick<ProgramSessionExtras, 'sesionCuenta' | 'bonusModo'>): boolean {
  return Boolean(block.sesionCuenta && block.bonusModo);
}
