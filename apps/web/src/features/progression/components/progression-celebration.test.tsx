import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { prize } from '../testing/fixtures';
import { ProgressionCelebration } from './progression-celebration';

describe('carta-ticket del premio', () => {
  it('enseña el código grande, en dos grupos, con botón de copiar', () => {
    render(
      <ProgressionCelebration
        onClose={vi.fn()}
        subjects={[{ kind: 'prize', prize: prize('p1'), fresh: true }]}
      />,
    );
    expect(screen.getByRole('dialog', { name: '¡Premio desbloqueado!' })).toBeTruthy();
    expect(screen.getAllByText('K7M 2QX').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Copiar el código' })).toBeTruthy();
    expect(screen.getAllByText('Premio p1').length).toBeGreaterThan(0);
  });

  it('con varias cartas dice cuántas quedan', () => {
    render(
      <ProgressionCelebration
        onClose={vi.fn()}
        subjects={[
          { kind: 'freeze', streakDays: 7, freezes: 1, fresh: true },
          { kind: 'prize', prize: prize('p1'), fresh: true },
        ]}
      />,
    );
    expect(screen.getByText('1 de 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeTruthy();
  });
});
