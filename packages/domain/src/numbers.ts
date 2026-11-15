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

/** 63.5 → «63,5»: how a decimal is written in a Spanish form field. */
export function formatDecimalInput(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return String(value).replace('.', ',');
}

/**
 * «63,5» or «63.5» → 63.5. A keypad offers either separator depending on the
 * locale, so both mean the same number; empty or garbage → NaN (the schema rejects it).
 */
export function parseDecimalInput(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return Number.NaN;
  return Number(trimmed.replace(',', '.'));
}
