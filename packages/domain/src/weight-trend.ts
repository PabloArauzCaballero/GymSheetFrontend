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

export type WeighInLike = { id: string | number; weight: number; unit: string; measuredOn: string };

/**
 * The «Registrar peso» row subtitle, identical on web and mobile: the last
 * weigh-in and, once there are two, the change since the first one.
 */
export function weightRowSubtitle(weighIns: readonly WeighInLike[] | undefined, failed: boolean, formatDate: (value: string) => string): string {
  if (failed) return 'No se pudo cargar tu evolución';
  const ordered = [...(weighIns ?? [])].sort((a, b) => b.measuredOn.localeCompare(a.measuredOn));
  const last = ordered[0];
  if (!last) return 'Anota tu primer pesaje';
  const first = ordered[ordered.length - 1];
  const value = `Último: ${last.weight.toLocaleString('es-ES')} ${last.unit.toLowerCase()}`;
  if (!first || first.id === last.id) return value;
  return `${value} · ${weightTrend(last.weight - first.weight, last.unit, formatDate(first.measuredOn))}`;
}
