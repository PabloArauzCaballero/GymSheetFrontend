export const numberFormatter = new Intl.NumberFormat('es-BO', {
  maximumFractionDigits: 2,
});

export function formatNumber(value: number | null | undefined) {
  return value == null ? '—' : numberFormatter.format(value);
}
