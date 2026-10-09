import type { Program, ProgramMode } from '@gymsheet/types';

/** «x1,4»: el multiplicador semanal con coma decimal, como lo ve la persona. */
export function multiplierLabel(value: number): string {
  return `x${value.toLocaleString('es', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;
}

export function modeLabel(mode: ProgramMode | 'CARDIO'): string {
  switch (mode) {
    case 'PROGRESSIVE_OVERLOAD':
      return 'Sobrecarga progresiva';
    case 'STRENGTH_GOALS':
      return 'Metas de marca';
    case 'CARDIO':
      return 'Cardio';
    default:
      return 'Normal';
  }
}

/** El modo da multiplicador semanal; sin modo (o en cardio sin pesas) no hay bono. */
export function hasMultiplier(program: Pick<Program, 'modo'>): boolean {
  return program.modo !== 'NONE';
}

/** «Semana 3 de 12»; antes de empezar o después de terminar no hay semana actual. */
export function weekLabel(program: Pick<Program, 'semanaActual' | 'semanasTotales'>): string {
  return program.semanaActual
    ? `Semana ${program.semanaActual} de ${program.semanasTotales}`
    : `${program.semanasTotales} semanas`;
}

/** Cuánto del programa ya pasó, de 0 a 1. */
export function programFraction(program: Pick<Program, 'semanaActual' | 'semanasTotales'>): number {
  if (!program.semanaActual || program.semanasTotales <= 0) return 0;
  return Math.min(1, Math.max(0, program.semanaActual / program.semanasTotales));
}

/** «Cumple esta semana para llegar a x1,6»: lo que falta para el siguiente escalón. */
export function nextMultiplierHint(program: Pick<Program, 'multiplicador' | 'proximoMultiplicador'>): string {
  if (program.multiplicador >= 2) return 'Estás en el máximo: x2,0.';
  return `Cumple esta semana para llegar a ${multiplierLabel(program.proximoMultiplicador)}.`;
}
