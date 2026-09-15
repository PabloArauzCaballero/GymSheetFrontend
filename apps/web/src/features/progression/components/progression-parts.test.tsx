import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ProgressionLevel } from '@/shared/api/schemas';
import { RankHero } from './progression-parts';

// Fallo ajeno a este test: `ProgressionLevel` ganó `description` y `sortOrder`
// y este apaño se quedó sin ellos, así que `yarn type-check` de la web venía
// fallando aquí —y con él la puerta de validación del monorepo— sin que la
// prueba tuviera nada que ver.
const level: ProgressionLevel = {
  code: 'ACERO',
  name: 'Acero',
  tagline: 'Has empezado.',
  // El contrato sumó `description` y `sortOrder`; este fixture se quedó atrás y
  // dejaba el `type-check` del repo en rojo para todo el mundo.
  description: null,
  color: '#8899aa',
  icon: 'footsteps-outline',
  minPoints: 0,
  sortOrder: 0,
  unlocked: true,
  current: true,
};

/**
 * La cifra sube contando al entrar. Lo que se fija aquí no es la animación
 * —cuántos fotogramas tarda es un detalle— sino lo que la hace aceptable: que
 * un lector de pantalla reciba el total una sola vez en lugar de narrar la
 * cuenta entera.
 */
describe('RankHero', () => {
  it('anuncia el total una vez y oculta el número que va contando', () => {
    const view = within(
      render(
        <RankHero
          level={level}
          levelProgress={0.4}
          nextLevel={null}
          points={12400}
          pointsToNextLevel={null}
        />,
      ).container,
    );

    // El total, íntegro, para quien lo escucha. Con separador de miles: `es-ES`
    // no agrupa hasta los cinco dígitos, así que 12400 es la primera cifra que
    // demuestra que el formato es el mismo que el del resto de la pantalla.
    expect(view.getByText('12.400 puntos')).toBeInTheDocument();

    // Y el que se mueve, fuera del árbol de accesibilidad.
    const contador = view.getByText(
      (_, element) => element?.tagName === 'SPAN' && element.className.includes('text-4xl'),
    );
    expect(contador).toHaveAttribute('aria-hidden');
    // Ancho de dígito fijo: sin esto la cifra baila mientras cuenta.
    expect(contador.className).toContain('tabular-nums');
  });
});
