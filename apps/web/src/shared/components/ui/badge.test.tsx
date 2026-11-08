import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';

/**
 * El chip sigue al `Badge` del móvil: quieto por defecto. «Nada se mueve solo»
 * (repp-diseno §7): el latido solo se enciende con una causa explícita.
 */
describe('Badge', () => {
  it('está quieto por defecto, como en el móvil', () => {
    const view = within(render(<Badge>Activa</Badge>).container);
    expect(view.getByText('Activa').className).not.toContain('chip-heartbeat');
  });

  it('late solo si se pide, y solo con movimiento permitido', () => {
    const view = within(render(<Badge latido>Nueva</Badge>).container);
    const chip = view.getByText('Nueva');
    expect(chip.className).toContain('motion-safe:animate-[chip-heartbeat');
    // Sin `origin-center` el chip escala desde una esquina y cabecea.
    expect(chip.className).toContain('origin-center');
  });

  it('conserva las clases propias de quien lo usa', () => {
    const view = within(render(<Badge className="w-full">Ancha</Badge>).container);
    expect(view.getByText('Ancha').className).toContain('w-full');
  });
});
