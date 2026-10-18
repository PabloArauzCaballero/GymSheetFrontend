import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  badge,
  challenge,
  prize,
  sessionReward,
  week,
} from '@/features/progression/testing/fixtures';
import { SessionSummary } from './session-summary';

vi.mock('@/features/progression/services/progression-service', () => ({
  progressionService: { acknowledge: vi.fn(() => Promise.resolve({ acknowledged: 0 })) },
}));

describe('resumen de sesión con premios', () => {
  it('enseña la fila de retos, los retos con «¡Hecho ahora!», lo más cerca, la racha y las cartas', () => {
    const items = [
      challenge('F', 'FACIL'),
      challenge('M', 'MEDIO', { completed: false, progress: 0.5, progressLabel: '1 / 2' }),
      challenge('D', 'DIFICIL', { completed: false, progress: 0, progressLabel: '0 / 5' }),
    ];
    const reward = sessionReward({
      breakdown: {
        session: 50,
        sets: 40,
        volume: 10,
        streak: 0,
        badges: 0,
        modes: 0,
        challenges: 60,
      },
      challenges: week(items),
      challengesCompletedNow: [items[0]!],
      prizesNow: [prize('p1', { title: 'Batido gratis' })],
      streak: { current: 14, freezes: 1, freezeEarnedNow: false, milestoneNow: 14 },
      nearest: [
        badge('MEDIO', 'RARA', {
          name: 'Medio centenar',
          earned: false,
          progress: 0.96,
          threshold: 50,
        }),
      ],
    });
    render(<SessionSummary duration="45 min" onClose={vi.fn()} reward={reward} sets={12} />);
    expect(screen.getByText('Por tus retos de la semana')).toBeTruthy();
    expect(screen.getByText('¡Hecho ahora!')).toBeTruthy();
    expect(screen.getByText('Te faltan 2 para Medio centenar')).toBeTruthy();
    expect(screen.getByText('14 días · 1 comodín · ¡hito de 14!')).toBeTruthy();
    expect(screen.getByText('Te esperan 2 cartas')).toBeTruthy();
    expect(screen.getByText(/Reto F · Batido gratis/)).toBeTruthy();
  });
});
