import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ProfileCompletion } from '@/shared/api/schemas';
import { CompletionNudge } from './completion-nudge';

vi.mock('next/link', () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));

const item = (code: string, points: number, done = false, awarded = false) => ({
  code,
  label: `Dato ${code}`,
  hint: `Pista ${code}`,
  points,
  done,
  awarded,
  awardedAt: awarded ? '2026-11-15T00:00:00.000Z' : null,
});

function completion(items: ProfileCompletion['items']): ProfileCompletion {
  const earned = items.filter((entry) => entry.awarded).reduce((sum, entry) => sum + entry.points, 0);
  const total = items.reduce((sum, entry) => sum + entry.points, 0);
  return {
    items,
    completed: items.filter((entry) => entry.done).length,
    total: items.length,
    percent: Math.floor((items.filter((entry) => entry.done).length / Math.max(items.length, 1)) * 100),
    pointsEarned: earned,
    pointsAvailable: total - earned,
    pointsTotal: total,
    awardedNow: [],
  };
}

describe('CompletionNudge', () => {
  it('promises exactly the points the server says are left, item by item, with a link to fix each', () => {
    render(<CompletionNudge completion={completion([item('FOTO', 50), item('BIO', 40), item('DATOS', 50, true, true)])} />);
    expect(screen.getByRole('heading', { name: 'Completa tu perfil y gana +90 puntos' })).toBeInTheDocument();
    // One progress number: items done, the same percent the ring shows (1 of 3 = 33 %).
    expect(screen.getByText('Perfil al 33 %: 1 de 3 datos. Cada dato suma una vez y no se pierde.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dato FOTO/ })).toHaveAttribute('href', '/profile/editar#fotos');
    expect(screen.getByRole('link', { name: /Dato BIO/ })).toHaveAttribute('href', '/profile/editar#sobre-ti');
    expect(screen.queryByText('Dato DATOS')).not.toBeInTheDocument();
  });

  it('shows at most three items and links to the rest', () => {
    render(<CompletionNudge completion={completion(['FOTO', 'BIO', 'NIVEL', 'GENERO'].map((code) => item(code, 20)))} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('link', { name: /Y 1 dato más/ })).toHaveAttribute('href', '/profile/editar');
  });

  it('renders nothing once every point is earned', () => {
    const { container } = render(<CompletionNudge completion={completion([item('FOTO', 50, true, true)])} />);
    expect(container).toBeEmptyDOMElement();
  });
});
