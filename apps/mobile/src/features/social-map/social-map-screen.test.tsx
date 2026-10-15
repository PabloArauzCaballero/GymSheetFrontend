import type {} from '../../../../web/node_modules/vitest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import SocialMapScreen from '../../../app/(app)/social-map';

const { mapAreas, mapGyms, mapPeople, publicBranches, region } = vi.hoisted(() => ({
  mapAreas: vi.fn(), mapGyms: vi.fn(), mapPeople: vi.fn(), publicBranches: vi.fn(),
  region: { latitude: -16.5, longitude: -68.15, latitudeDelta: 0.12, longitudeDelta: 0.12 },
}));

vi.mock('@/api/services', () => ({
  socialService: { mapAreas, mapGyms, mapPeople, searchMapCities: vi.fn(), sendConnection: vi.fn() },
  facilitiesService: { publicBranches },
}));
vi.mock('@/state/auth-store', () => ({ useAuthStore: () => 'viewer-1' }));
vi.mock('@/theme', () => ({ colors: {}, radii: {}, spacing: {} }));
vi.mock('@/notifications', () => ({ notify: { error: vi.fn() } }));
vi.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: vi.fn() }) }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock('@/components/layout', () => ({ Card: ({ children }: { children: ReactNode }) => <section>{children}</section> }));
vi.mock('@/components/ui', () => ({ Button: ({ label, onPress }: { label: string; onPress: () => void }) => <button onClick={onPress}>{label}</button> }));
vi.mock('react-native', () => ({
  View: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ScrollView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  TextInput: () => <input />,
  ActivityIndicator: () => <span role="status">Cargando</span>,
  Pressable: ({ children, onPress, accessibilityLabel }: { children: ReactNode; onPress: () => void; accessibilityLabel?: string }) => <button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
  Linking: { openURL: vi.fn() },
}));
vi.mock('react-native-maps', () => ({
  default: ({ children, onRegionChangeComplete }: { children: ReactNode; onRegionChangeComplete: (value: typeof region) => void }) => <div><button onClick={() => onRegionChangeComplete(region)}>Mover mapa</button>{children}</div>,
  Circle: () => null,
  Marker: ({ title, onPress }: { title: string; onPress: () => void }) => <button aria-label={`Marcador ${title}`} onClick={onPress}>{title}</button>,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const gymA = {
  kind: 'GYM', source: 'OPENSTREETMAP', sourceId: 'node/1', name: 'Gimnasio A',
  address: 'Dirección A', city: 'La Paz', region: 'La Paz', latitude: -16.5, longitude: -68.15,
  tags: { amenity: 'gym' }, license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors',
  registered: false, updatedAt: '2026-10-08T00:00:00.000Z',
};
const gymB = { ...gymA, sourceId: 'node/2', name: 'Gimnasio B', address: 'Dirección B', latitude: -17.39, longitude: -66.16 };
const areasA = { cells: [{ id: 'A', center: { latitude: -16.5, longitude: -68.15 }, count: 1 }] };
const areasB = { cells: [{ id: 'B', center: { latitude: -17.39, longitude: -66.16 }, count: 2 }] };

function renderMap() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><SocialMapScreen /></QueryClientProvider>);
}

function searchB() {
  region.latitude = -17.39;
  region.longitude = -66.16;
  fireEvent.click(screen.getByRole('button', { name: 'Mover mapa' }));
  fireEvent.click(screen.getByRole('button', { name: 'Buscar en esta zona' }));
}

describe('H6.S3.M6 — mapa móvil', () => {
  beforeEach(() => {
    region.latitude = -16.5;
    region.longitude = -68.15;
    mapAreas.mockReset();
    mapGyms.mockReset();
    mapPeople.mockReset().mockResolvedValue([]);
    publicBranches.mockReset().mockResolvedValue([]);
  });

  it('conserva solo los puntos B cuando áreas y gimnasios A terminan después de B', async () => {
    const slowAreas = deferred<typeof areasA>();
    const slowGyms = deferred<typeof gymA[]>();
    mapAreas.mockImplementation((bounds) => bounds.south > -17 ? slowAreas.promise : Promise.resolve(areasB));
    mapGyms.mockImplementation((bounds) => bounds.south > -17 ? slowGyms.promise : Promise.resolve([gymB]));
    renderMap();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar en esta zona' }));
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy());
    searchB();
    expect(await screen.findByRole('button', { name: 'Marcador Gimnasio B' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Marcador 2 personas' })).toBeTruthy();

    await act(async () => { slowAreas.resolve(areasA); slowGyms.resolve([gymA]); await slowAreas.promise; await slowGyms.promise; });
    expect(screen.getByRole('button', { name: 'Marcador Gimnasio B' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Marcador 2 personas' })).toBeTruthy();
    expect(screen.queryByText('Gimnasio A')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Marcador 1 persona' })).toBeNull();
  });

  it('descarta una sede registrada seleccionada A al consultar B', async () => {
    publicBranches.mockResolvedValue([{
      id: 'branch-A', nombre: 'Sede A', descripcion: null, latitud: -16.5, longitud: -68.15,
      servicios: [], imagenUrl: null, amenidades: [], marca: null,
    }]);
    mapAreas.mockResolvedValue(areasB);
    mapGyms.mockResolvedValue([gymB]);
    renderMap();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar en esta zona' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Marcador Sede A' }));
    expect(screen.getByRole('button', { name: 'Abrir navegación' })).toBeTruthy();
    searchB();
    expect(await screen.findByRole('button', { name: 'Marcador Gimnasio B' })).toBeTruthy();
    expect(screen.queryByText('Sede A')).toBeNull();
  });

  it('descarta la ficha seleccionada A al consultar B aunque las áreas A lleguen tarde', async () => {
    const slowAreas = deferred<typeof areasA>();
    mapAreas.mockImplementation((bounds) => bounds.south > -17 ? slowAreas.promise : Promise.resolve(areasB));
    mapGyms.mockImplementation((bounds) => Promise.resolve(bounds.south > -17 ? [gymA] : [gymB]));
    renderMap();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar en esta zona' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Marcador Gimnasio A' }));
    expect(screen.getByRole('button', { name: 'Abrir navegación' })).toBeTruthy();
    searchB();
    expect(await screen.findByRole('button', { name: 'Marcador Gimnasio B' })).toBeTruthy();
    await act(async () => { slowAreas.resolve(areasA); await slowAreas.promise; });
    expect(screen.queryByText('Gimnasio A')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Abrir navegación' })).toBeNull();
  });
});
