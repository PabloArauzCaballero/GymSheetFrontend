import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const CONV = '11111111-1111-4111-8111-111111111111';
const mocks = vi.hoisted(() => ({
  sendLocationMessage: vi.fn(),
  back: vi.fn(),
  notify: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
  requestPermission: vi.fn(),
  position: vi.fn(),
}));

vi.mock('react-native', async () => (await import('./rn-dom')).reactNativeMock());
vi.mock('@/theme', async () => (await import('./rn-dom')).themeMock());
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ conversationId: CONV }),
  useRouter: () => ({ back: mocks.back, canGoBack: () => true, replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: mocks.requestPermission,
  getCurrentPositionAsync: mocks.position,
  Accuracy: { Balanced: 3 },
}));
vi.mock('expo-image', async () => ({ Image: (await import('./rn-dom')).Box }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock('@/api/services', () => ({ chatService: { sendLocationMessage: mocks.sendLocationMessage } }));
vi.mock('@/components/ambient', () => ({ AmbientBackground: () => null }));
vi.mock('@/components/motion', async () => ({ PressableScale: (await import('./rn-dom')).Press }));
vi.mock('@/components/bottom-sheet', () => ({ BottomSheet: () => null }));
vi.mock('@/components/ui', () => ({
  Button: ({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) => (
    <button disabled={disabled} onClick={onPress} type="button">{label}</button>
  ),
}));
vi.mock('@/notifications', () => ({ notify: mocks.notify }));
// El selector de lugar es de otra sesión: aquí solo importa lo que entrega por `onChange`.
vi.mock('@/features/place-picker/place-picker', () => ({
  placeLabel: (place: { label: string; detail?: string }) => (place.detail ? `${place.label} · ${place.detail}` : place.label),
  PlacePicker: ({ onChange }: { onChange: (place: unknown) => void }) => (
    <div>
      <button onClick={() => onChange({ kind: 'GYM', key: 'osm-1', label: 'Gimnasio Sopocachi', detail: 'Av. 20 de Octubre', latitude: -16.51, longitude: -68.13 })} type="button">Elegir gimnasio</button>
      <button onClick={() => onChange({ kind: 'POINT', key: 'p', label: 'Buscando la dirección…', latitude: -16.5, longitude: -68.1 })} type="button">Tocar punto</button>
      <button onClick={() => onChange({ kind: 'TEXT', key: 'text', label: 'Plaza Abaroa' })} type="button">Escribir lugar</button>
    </div>
  ),
}));

import ChatPlaceScreen from '../../../../app/(app)/chat/lugar';

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><ChatPlaceScreen /></QueryClientProvider>);
}

beforeEach(() => vi.clearAllMocks());

describe('pantalla «Enviar ubicación» del chat', () => {
  it('envía el lugar elegido en el mapa con coordenadas y nombre, y vuelve al chat', async () => {
    mocks.sendLocationMessage.mockResolvedValue({});
    renderScreen();
    const send = screen.getByRole('button', { name: 'Enviar este lugar' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Elegir gimnasio' }));
    expect(screen.getByText('Gimnasio Sopocachi · Av. 20 de Octubre')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar este lugar' }));

    await waitFor(() => expect(mocks.sendLocationMessage).toHaveBeenCalledWith(CONV, {
      lat: -16.51, lng: -68.13, label: 'Gimnasio Sopocachi · Av. 20 de Octubre',
    }));
    await waitFor(() => expect(mocks.back).toHaveBeenCalled());
  });

  it('no envía un lugar escrito a mano (sin coordenadas) ni un punto cuya dirección aún se busca', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Escribir lugar' }));
    expect((screen.getByRole('button', { name: 'Enviar este lugar' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/no tiene un punto en el mapa/u)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tocar punto' }));
    expect((screen.getByRole('button', { name: 'Enviar este lugar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('«Mi ubicación actual» pide permiso y envía la posición sin nombre', async () => {
    mocks.requestPermission.mockResolvedValue({ granted: true });
    mocks.position.mockResolvedValue({ coords: { latitude: -16.49, longitude: -68.12 } });
    mocks.sendLocationMessage.mockResolvedValue({});
    renderScreen();
    fireEvent.click(screen.getByTestId('chat-place-current'));
    await waitFor(() => expect(mocks.sendLocationMessage).toHaveBeenCalledWith(CONV, { lat: -16.49, lng: -68.12 }));
  });
});
