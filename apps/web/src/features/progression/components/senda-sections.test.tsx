import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { badge, challenge, prize, week } from '../testing/fixtures';
import { BadgeCollection } from './badge-collection';
import { PrizesCard } from './prize-tickets';
import { ChallengesList } from './weekly-challenges';

const chain = (step: number, earned: boolean) =>
  badge(`RACHA_${step}`, step > 2 ? 'EPICA' : 'COMUN', {
    name: `Racha ${step}`,
    earned,
    progress: earned ? null : 0.5,
    progressLabel: earned ? null : '4 / 8',
    chain: 'STREAK_DAYS',
    chainStep: step,
    chainLength: 4,
    threshold: step * 4,
  });

describe('colección en cadenas', () => {
  it('una cadena es una sola ficha «Nivel 2 de 4» con la siguiente meta', () => {
    const badges = [
      chain(1, true),
      chain(2, true),
      chain(3, false),
      chain(4, false),
      badge('SUELTA', 'RARA'),
    ];
    render(<BadgeCollection badges={badges} onCelebrate={vi.fn()} />);
    const tile = screen.getByRole('button', {
      name: /Racha 2\. Nivel 2 de 4\. Siguiente: Racha 3/,
    });
    expect(within(tile).getByText('Nivel 2 de 4')).toBeTruthy();
    expect(within(tile).getByText(/Siguiente: Racha 3/)).toBeTruthy();
    expect(screen.getByText('Tu colección · 3/5')).toBeTruthy();
  });

  it('abrir la cadena enseña sus pasos y uno conseguido se celebra', () => {
    const onCelebrate = vi.fn();
    render(
      <BadgeCollection badges={[chain(1, true), chain(2, false)]} onCelebrate={onCelebrate} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Racha 1\. Nivel 1 de 2/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Racha 2')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Celebrar la insignia Racha 1' }));
    expect(onCelebrate).toHaveBeenCalledWith(expect.objectContaining({ code: 'RACHA_1' }));
  });
});

describe('Mis premios', () => {
  it('sin premios no se pinta nada', () => {
    const { container } = render(<PrizesCard onOpen={vi.fn()} prizes={[]} />);
    expect(container.textContent).toBe('');
  });

  it('los disponibles primero, con su código y botón de copiar; el canjeado sin copiar', () => {
    const prizes = [
      prize('viejo', {
        status: 'CANJEADO',
        isNew: false,
        code: 'AAAAAA',
        redeemedAt: '2026-10-01T10:00:00Z',
      }),
      prize('nuevo'),
    ];
    render(<PrizesCard onOpen={vi.fn()} prizes={prizes} />);
    expect(screen.getByText('Mis premios · 1 por usar')).toBeTruthy();
    const tickets = screen.getAllByRole('article');
    expect(within(tickets[0] as HTMLElement).getByText('K7M 2QX')).toBeTruthy();
    expect(
      within(tickets[0] as HTMLElement).getByRole('button', { name: 'Copiar el código' }),
    ).toBeTruthy();
    expect(
      within(tickets[1] as HTMLElement).queryByRole('button', { name: 'Copiar el código' }),
    ).toBeNull();
    expect(within(tickets[1] as HTMLElement).getByText('Canjeado')).toBeTruthy();
  });
});

describe('retos de la semana', () => {
  it('marca el reto cumplido en esta sesión con «¡Hecho ahora!»', () => {
    const items = [
      challenge('F', 'FACIL'),
      challenge('M', 'MEDIO', { completed: false, progress: 0.5, progressLabel: '1 / 2' }),
      challenge('D', 'DIFICIL', { completed: false, progress: 0, progressLabel: '0 / 5' }),
    ];
    render(<ChallengesList highlight={new Set(['F'])} week={week(items)} />);
    expect(screen.getByText('¡Hecho ahora!')).toBeTruthy();
    expect(screen.getByText('1 de 3 retos')).toBeTruthy();
    expect(screen.getByText('Medio · +60 pts')).toBeTruthy();
  });
});
