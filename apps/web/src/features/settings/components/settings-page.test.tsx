import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { setTheme } = vi.hoisted(() => ({ setTheme: vi.fn() }));
vi.mock('@/shared/theme/theme-provider', () => ({
  useTheme: () => ({ theme: 'dark', setTheme }),
}));
vi.mock('@/shared/components/layout/logout-button', () => ({
  LogoutButton: () => <button type="button">Cerrar sesión</button>,
}));

import { SettingsPage } from './settings-page';

describe('SettingsPage', () => {
  it('muestra la cuenta y permite cambiar de tema', () => {
    render(<SettingsPage email="socia@example.com" name="Ana" role="CLIENTE" version="1.2.3" />);
    expect(screen.getByText('socia@example.com')).toBeInTheDocument();
    expect(screen.getByText('1.2.3')).toBeInTheDocument();
    expect(screen.getByText('Socio')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Claro' }));
    expect(setTheme).toHaveBeenCalledWith('light');
  });
});
