import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CountUp } from './count-up';

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

/**
 * Lo que se fija aquí no es cuántos fotogramas dura la cuenta, sino las dos
 * promesas que la hacen aceptable: el número arranca desde abajo (se «gana») y
 * quien pide menos movimiento ve el total de inmediato.
 */
describe('CountUp', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pinta el punto de partida antes de contar', () => {
    mockReducedMotion(false);
    render(<CountUp from={0} value={12400} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('salta directo al total con «reducir movimiento»', async () => {
    mockReducedMotion(true);
    render(<CountUp value={12400} />);
    // `es-ES` agrupa desde cinco dígitos: 12400 demuestra el mismo formato que el resto.
    expect(await screen.findByText('12.400')).toBeInTheDocument();
  });

  it('usa dígitos de ancho fijo para que la cifra no baile', () => {
    mockReducedMotion(true);
    const { container } = render(<CountUp value={40} />);
    expect(container.querySelector('span')?.className).toContain('tabular-nums');
  });
});
