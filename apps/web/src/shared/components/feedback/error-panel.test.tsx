import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ListSurface } from '@/features/interactions/components/list-surface';
import { ApiError } from '@/shared/api/api-error';
import { ErrorPanel } from './error-panel';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const unverified = new ApiError({
  message: 'Confirma tu correo para usar las funciones sociales.',
  status: 403,
  kind: 'forbidden',
  code: 'EMAIL_VERIFICATION_REQUIRED',
});

describe('ErrorPanel', () => {
  it('turns a 403 EMAIL_VERIFICATION_REQUIRED into the «Verifica tu correo» step', () => {
    render(<ErrorPanel error={unverified} message={unverified.message} onRetry={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Verifica tu correo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verificar ahora' })).toHaveAttribute(
      'href',
      '/verificar-correo',
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('No se pudo cargar la información')).toBeNull();
  });

  it('keeps the generic error for any other failure', () => {
    const forbidden = new ApiError({ message: 'Sin permiso.', status: 403, kind: 'forbidden' });
    render(<ErrorPanel error={forbidden} message={forbidden.message} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar la información');
  });
});

describe('ListSurface (social lists)', () => {
  it('shows the verify step instead of the error state for an unverified account', () => {
    render(
      <ListSurface
        empty={false}
        emptyDescription="—"
        emptyTitle="—"
        error={unverified}
        errorMessage={unverified.message}
        loading={false}
        onRetry={vi.fn()}
      >
        <p>contenido</p>
      </ListSurface>,
    );
    expect(screen.getByRole('link', { name: 'Verificar ahora' })).toBeInTheDocument();
    expect(screen.queryByText('contenido')).toBeNull();
  });
});
