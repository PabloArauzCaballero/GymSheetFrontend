/**
 * Barra de avance dentro del tramo actual.
 *
 * El relleno lleva el color del rango que se persigue, no el de la marca: lo
 * que mide es la distancia hasta *ese* hito, y pintarla del acento general la
 * convertiría en una barra de carga cualquiera.
 */
export function ProgressTrack({
  ratio,
  color,
  height = 8,
}: Readonly<{ ratio: number; color: string; height?: number }>) {
  const clamped = Math.min(1, Math.max(0, ratio));
  return (
    <div
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clamped * 100)}
      className="w-full overflow-hidden rounded-full bg-[var(--surface-high)]"
      role="progressbar"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          // Un tramo recién empezado debe verse empezado: sin este mínimo el
          // 1 % es un pixel y la barra parece vacía justo cuando más importa
          // confirmar que el primer entrenamiento contó.
          width: `${Math.max(clamped * 100, clamped > 0 ? 3 : 0)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
