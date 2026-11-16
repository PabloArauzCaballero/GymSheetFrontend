/**
 * «+1,5 kg desde 3 oct.», or «Sin cambios desde…» when the change rounds to zero:
 * «−0 kg» reads as a loss that never happened.
 */
export function weightTrend(delta: number, unit: string, since: string): string {
  const rounded = Math.round(Math.abs(delta) * 10) / 10;
  if (rounded === 0) return `Sin cambios desde ${since}`;
  const sign = delta > 0 ? '+' : '−';
  return `${sign}${rounded.toLocaleString('es-ES', { maximumFractionDigits: 1 })} ${unit.toLowerCase()} desde ${since}`;
}
