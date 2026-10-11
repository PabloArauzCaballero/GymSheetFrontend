import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeniedNotice } from './denied-notice';

const { error } = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock('@/shared/notifications', () => ({ notify: { error } }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams('denied=1') }));

describe('DeniedNotice', () => {
  beforeEach(() => error.mockReset());

  it('avisa de la falta de permiso con título y texto propios, no con el error genérico', () => {
    render(<DeniedNotice />);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith({
      title: 'Acceso denegado',
      message: 'No tienes permiso para acceder a esa sección.',
    });
  });
});
