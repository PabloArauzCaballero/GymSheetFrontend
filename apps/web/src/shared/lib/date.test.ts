import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from '@/shared/lib/date';

// El formateo usa `es-BO`, cuya zona horaria es UTC-4. Una fecha de calendario
// interpretada como medianoche UTC retrocedía un día al mostrarse, de modo que
// altas y vencimientos aparecían con un día menos del guardado.
describe('formatDate', () => {
  it('respeta el día de una fecha de calendario', () => {
    expect(formatDate('2026-08-17')).toContain('17');
  });

  it.each(['2026-01-01', '2026-12-31', '2026-03-01'])('no desplaza %s', (value) => {
    const day = Number(value.slice(8, 10));
    expect(formatDate(value)).toContain(String(day));
  });

  it('devuelve un marcador para valores ausentes o inválidos', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('no es una fecha')).toBe('—');
  });

  it('sigue aceptando instantes completos', () => {
    // Una marca de tiempo sí tiene instante: se convierte a la zona local.
    expect(formatDateTime('2026-08-17T12:00:00.000Z')).toContain('17');
  });
});
