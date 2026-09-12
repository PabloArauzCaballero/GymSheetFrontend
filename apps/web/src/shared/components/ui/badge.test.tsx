import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';

/**
 * El latido es una decisión de producto («los chips laten en toda la
 * aplicación»), no un detalle de esta pantalla, así que vive en el componente
 * compartido. Esto lo fija: si alguien lo quita de aquí para llevárselo a las
 * pantallas una por una, la regla deja de ser cierta en silencio.
 */
describe('Badge', () => {
  it('late por defecto, y solo con movimiento permitido', () => {
    const view = within(render(<Badge>Activa</Badge>).container);
    const chip = view.getByText('Activa');
    expect(chip.className).toContain('motion-safe:animate-[chip-heartbeat');
    // Sin `origin-center` el chip escala desde una esquina y cabecea.
    expect(chip.className).toContain('origin-center');
  });

  it('se puede callar donde ya hay movimiento alrededor', () => {
    const view = within(render(<Badge latido={false}>Quieta</Badge>).container);
    expect(view.getByText('Quieta').className).not.toContain('chip-heartbeat');
  });

  it('conserva las clases propias de quien lo usa', () => {
    const view = within(render(<Badge className="w-full">Ancha</Badge>).container);
    const chip = view.getByText('Ancha');
    expect(chip.className).toContain('w-full');
    expect(chip.className).toContain('chip-heartbeat');
  });
});
