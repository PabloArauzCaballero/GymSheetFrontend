import { fireEvent, render, screen } from '@testing-library/react';
import { Eye, Share2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Progression } from '@/shared/api/schemas';
import { FitnessRow, fitnessNumbers } from './fitness-row';
import { ProfileActions } from './profile-actions';

vi.mock('next/link', () => ({ default: ({ children, href, className }: { children: ReactNode; href: string; className?: string }) => <a className={className} href={href}>{children}</a> }));

const progress = { points: 12500, streak: { current: 1 }, stats: { currentStreakDays: 0, totalSessions: 3 } } as unknown as Progression;

describe('profile hero identity', () => {
  it('shows points, streak and sessions under the name, live streak first', () => {
    expect(fitnessNumbers(progress)).toEqual({ points: 12500, streak: 1, sessions: 3 });
    render(<FitnessRow pending={false} progress={progress} />);
    expect(screen.getByText('12.500')).toBeInTheDocument();
    expect(screen.getByText('día de racha')).toBeInTheDocument();
    expect(screen.getByText('sesiones')).toBeInTheDocument();
    // Screen readers get the mobile wording, figure first.
    expect(screen.getByText('12.500 puntos')).toHaveClass('sr-only');
    expect(screen.getByText('3 sesiones')).toHaveClass('sr-only');
  });

  it('keeps its three slots while loading and after an error, so the hero never jumps', () => {
    const { rerender } = render(<FitnessRow pending progress={undefined} />);
    expect(screen.getByTestId('profile-fitness-row')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('puntos: cargando')).toBeInTheDocument();
    rerender(<FitnessRow pending={false} progress={undefined} />);
    expect(screen.getAllByText(/: no disponible$/)).toHaveLength(3);
  });

  it('renders link and button actions in equal columns', () => {
    const share = vi.fn();
    render(<ProfileActions actions={[{ key: 'preview', label: 'Vista previa', icon: Eye, href: '/profile/editar?tab=preview' }, { key: 'share', label: 'Compartir', icon: Share2, onClick: share }]} />);
    expect(screen.getByRole('link', { name: 'Vista previa' })).toHaveAttribute('href', '/profile/editar?tab=preview');
    fireEvent.click(screen.getByRole('button', { name: 'Compartir' }));
    expect(share).toHaveBeenCalledOnce();
    expect(screen.getByRole('navigation', { name: 'Acciones del perfil' })).toHaveClass('auto-cols-fr');
  });

  it('keeps a disabled slot in place and says why', () => {
    const share = vi.fn();
    render(<ProfileActions actions={[{ key: 'share', label: 'Compartir', icon: Share2, onClick: share, disabled: true, disabledLabel: 'Compartir: cargando tu senda' }]} />);
    const button = screen.getByRole('button', { name: 'Compartir: cargando tu senda' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(share).not.toHaveBeenCalled();
  });
});
