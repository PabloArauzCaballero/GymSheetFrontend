/**
 * Un color de marca rebajado a fondo.
 *
 * Se compone con alfa hexadecimal —igual que en el móvil— en vez de mezclar
 * hacia el negro: el catálogo trae los colores como `#rrggbb`, y mezclarlos
 * obligaría a convertirlos a RGB por separado en cada plataforma.
 */
export function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  return `${hex}${clamped.toString(16).padStart(2, '0')}`;
}

/** Diámetro del nodo de un hito, en píxeles. Idéntico al del móvil. */
export const PATH_NODE_SIZE = 44;

export const RARITY_LABEL: Readonly<Record<string, string>> = {
  COMUN: 'Común',
  RARA: 'Rara',
  EPICA: 'Épica',
  LEGENDARIA: 'Legendaria',
};
