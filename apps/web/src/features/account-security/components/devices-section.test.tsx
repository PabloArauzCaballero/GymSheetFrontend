import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserDevice } from '@/shared/api/schemas';
import { DevicesSection } from './devices-section';

const { devices, revokeDevice, revokeOtherDevices, confirm } = vi.hoisted(() => ({
  devices: vi.fn(),
  revokeDevice: vi.fn(),
  revokeOtherDevices: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock('../services/account-client', () => ({
  accountKeys: { devices: ['account', 'devices'] },
  accountService: { devices, revokeDevice, revokeOtherDevices },
}));
vi.mock('@/shared/notifications', () => ({
  confirm,
  notify: { success: vi.fn(), error: vi.fn() },
}));

const recently = new Date(Date.now() - 2 * 60 * 60_000).toISOString();
const device = (overrides: Partial<UserDevice>): UserDevice => ({
  id: '00000000-0000-4000-8000-000000000001',
  platform: 'WEB',
  osVersion: null,
  appVersion: '1.0.0',
  deviceModel: null,
  firstSeenAt: recently,
  lastSeenAt: recently,
  current: false,
  ...overrides,
});
const thisBrowser = device({ current: true });
const phone = device({
  id: '00000000-0000-4000-8000-000000000002',
  platform: 'ANDROID',
  deviceModel: 'Pixel 8',
  osVersion: '15',
});

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DevicesSection />
    </QueryClientProvider>,
  );
}

describe('DevicesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    devices.mockResolvedValue([thisBrowser, phone]);
  });

  it('lists each device with its label, the current badge and the last activity', async () => {
    renderSection();
    const list = await screen.findByRole('list', { name: 'Dispositivos' });
    const [first, second] = within(list).getAllByRole('listitem');
    expect(first).toHaveTextContent('Navegador');
    expect(first).toHaveTextContent('Este dispositivo');
    expect(within(first!).queryByRole('button')).toBeNull();
    expect(second).toHaveTextContent('Pixel 8 · Android 15');
    expect(second).toHaveTextContent('Última actividad: hace 2 horas');
  });

  it('signs one device out only after confirming, then reloads the list', async () => {
    confirm
      .mockResolvedValueOnce({ confirmed: false, action: 'cancel' })
      .mockResolvedValueOnce({ confirmed: true, action: 'confirm' });
    revokeDevice.mockResolvedValue(null);
    renderSection();
    const button = await screen.findByRole('button', {
      name: 'Cerrar sesión: Pixel 8 · Android 15',
    });

    fireEvent.click(button);
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(revokeDevice).not.toHaveBeenCalled();

    fireEvent.click(button);
    await waitFor(() => expect(revokeDevice).toHaveBeenCalledWith(phone.id));
    await waitFor(() => expect(devices).toHaveBeenCalledTimes(2));
  });

  it('closes every other session after confirming', async () => {
    confirm.mockResolvedValue({ confirmed: true, action: 'confirm' });
    revokeOtherDevices.mockResolvedValue(null);
    renderSection();
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión en los demás' }));
    await waitFor(() => expect(revokeOtherDevices).toHaveBeenCalledTimes(1));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Se cerrará tu sesión en todos los demás dispositivos.',
        severity: 'danger',
      }),
    );
  });

  it('hides «Cerrar sesión en los demás» when this is the only device', async () => {
    devices.mockResolvedValue([thisBrowser]);
    renderSection();
    await screen.findByText('Este dispositivo');
    expect(screen.queryByRole('button', { name: 'Cerrar sesión en los demás' })).toBeNull();
  });
});
