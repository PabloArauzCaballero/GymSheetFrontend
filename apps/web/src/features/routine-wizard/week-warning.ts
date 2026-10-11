/**
 * Aviso de éxito parcial al guardar: la rutina existe, pero el ajuste de
 * alguna semana (p. ej. una descarga) no llegó al servidor.
 */
export function weekAdjustmentWarning(semanas: readonly number[]): string {
  const lista = semanas.length === 1 ? `la semana ${semanas[0]}` : `las semanas ${formatList(semanas)}`;
  const verbo = semanas.length === 1 ? 'no se pudo' : 'no se pudieron';
  return `Rutina guardada. El ajuste de ${lista} ${verbo} aplicar; ábrela y vuelve a editarlo.`;
}

function formatList(items: readonly number[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}
