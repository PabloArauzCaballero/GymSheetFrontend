export const numberFormatter = new Intl.NumberFormat('es-BO', {
  maximumFractionDigits: 2,
});

export function formatNumber(value: number | null | undefined) {
  return value == null ? '—' : numberFormatter.format(value);
}

const multiplierFormatter = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** «×1,20»: multiplicador con coma decimal, igual que el resto de cifras de la app. */
export function formatMultiplier(value: number | null | undefined) {
  return value == null ? '—' : `×${multiplierFormatter.format(value)}`;
}
