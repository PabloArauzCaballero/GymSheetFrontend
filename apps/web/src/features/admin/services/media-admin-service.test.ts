import { describe, expect, it } from 'vitest';
import { planImageCode } from './media-admin-service';

// El backend exige que `code` sea kebab-case en minúsculas
// (`/^[a-z0-9][a-z0-9-]*$/`); derivarlo mal rechaza la carga con un 400.
describe('planImageCode', () => {
  it.each([
    ['MENSUAL', 'qr-plan-mensual'],
    ['PLAN.ANUAL_2026', 'qr-plan-plan-anual-2026'],
    ['Trimestral Premium', 'qr-plan-trimestral-premium'],
    ['MEMBRESÍA-BÁSICA', 'qr-plan-membresia-basica'],
  ])('normaliza %s a %s', (planCode, expected) => {
    expect(planImageCode(planCode)).toBe(expected);
  });

  it('produce un código válido incluso si el plan no aporta caracteres útiles', () => {
    expect(planImageCode('---')).toBe('qr-plan-sin-codigo');
  });

  it.each(['MENSUAL', 'PLAN.ANUAL_2026', 'Trimestral Premium', '---'])(
    'siempre cumple el patrón del backend para %s',
    (planCode) => {
      expect(planImageCode(planCode)).toMatch(/^[a-z0-9][a-z0-9-]*$/u);
    },
  );
});
