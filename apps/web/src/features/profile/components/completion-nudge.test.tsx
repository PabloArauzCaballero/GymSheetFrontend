import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ProfileCompletion } from '@/shared/api/schemas';
import { CompletionAvatar } from './completion-avatar';
import { CompletionError, CompletionNudge } from './completion-nudge';

vi.mock('next/link', () => ({
  default: ({ children, href, 'aria-label': label }: { children: ReactNode; href: string; 'aria-label'?: string }) => <a aria-label={label} href={href}>{children}</a>,
}));

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
    expect(screen.getByRole('heading', { name: /^Completa tu perfil y gana \+90\spuntos$/ })).toBeInTheDocument();
    // One progress number: items done, the same percent the ring shows (1 of 3 = 33 %).
    expect(screen.getByText('Perfil al 33 %: 1 de 3 datos. Cada dato suma una vez y no se pierde.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dato FOTO/ })).toHaveAttribute('href', '/profile/editar#fotos');
    expect(screen.getByRole('link', { name: /Dato BIO/ })).toHaveAttribute('href', '/profile/editar#sobre-ti');
    expect(screen.queryByText('Dato DATOS')).not.toBeInTheDocument();
  });

  it('shows at most three items and links to the rest', () => {
    render(<CompletionNudge completion={completion(['FOTO', 'BIO', 'NIVEL', 'GENERO'].map((code) => item(code, 20)))} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('link', { name: /Ver 1 dato más/ })).toHaveAttribute('href', '/profile/editar');
  });

  it('turns into the reward at 100 %: what completing it earned and a link to how others see you', () => {
    render(<CompletionNudge completion={completion([item('FOTO', 50, true, true), item('BIO', 40, true, true)])} />);
    expect(screen.queryByRole('heading', { name: /Completa tu perfil/ })).not.toBeInTheDocument();
    const reward = screen.getByRole('link', { name: /Perfil completo/ });
    expect(reward).toHaveAttribute('href', '/profile/editar?tab=preview');
    expect(reward).toHaveTextContent('Ganaste 90 puntos completándolo.');
  });
});

describe('completion read failed', () => {
  it('says so where the card would be and retries on demand', () => {
    const onRetry = vi.fn();
    render(<CompletionError onRetry={onRetry} retrying={false} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar tu progreso');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('marks the ring as not loaded without a second retry button', () => {
    render(<CompletionAvatar failed initials="LP" percent={null} photoUrl={null} />);
    // One «Reintentar» per failure: it lives in the error card, the ring only says what happened.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Tu perfil. Progreso sin cargar' })).toHaveTextContent('Sin cargar');
  });

  it('keeps the plain ring while the percent is known', () => {
    render(<CompletionAvatar failed initials="LP" percent={25} photoUrl={null} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Tu perfil, 25 % completo' })).toBeInTheDocument();
  });

  it('becomes a link that says where it goes when given an href', () => {
    render(<CompletionAvatar hint="Añadir una foto" href="/profile/editar#fotos" initials="LP" percent={25} photoUrl={null} />);
    expect(screen.getByRole('link', { name: 'Tu perfil, 25 % completo. Añadir una foto' })).toHaveAttribute('href', '/profile/editar#fotos');
  });
});
