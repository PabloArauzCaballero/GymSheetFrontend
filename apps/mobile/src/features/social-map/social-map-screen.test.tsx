import type {} from '../../../../web/node_modules/vitest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import SocialMapScreen from '../../../app/(app)/social-map';

type Props = { children?: ReactNode; onPress?: () => void; accessibilityLabel?: string };

const { mapAreas, mapGyms, mapNearby, publicBranches, getProfile, updateProfile, updateDiscoverySettings, region, Box, Press } = vi.hoisted(() => ({
  mapAreas: vi.fn(), mapGyms: vi.fn(), mapNearby: vi.fn(), publicBranches: vi.fn(),
  getProfile: vi.fn(), updateProfile: vi.fn(), updateDiscoverySettings: vi.fn(),
  region: { latitude: -16.5, longitude: -68.13, latitudeDelta: 0.09, longitudeDelta: 0.09 },
  Box: ({ children }: Props) => <div>{children}</div>,
  Press: ({ children, onPress, accessibilityLabel }: Props) => <button aria-label={accessibilityLabel} onClick={onPress}>{children}</button>,
}));

vi.mock('@/api/services', () => ({
  socialService: {
    mapAreas, mapGyms, mapNearby, searchMapCities: vi.fn(),
    getDiscoverySettings: vi.fn().mockResolvedValue({ profileEnabled: false, crossGymEnabled: false, mapEnabled: false, version: 1 }),
    saveMapLocation: vi.fn().mockResolvedValue({ saved: true }), updateDiscoverySettings,
  },
  profileService: { get: getProfile, update: updateProfile },
  facilitiesService: { publicBranches },
}));
vi.mock('expo-location', () => ({
  getForegroundPermissionsAsync: vi.fn().mockResolvedValue({ granted: false }),
  requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
  getCurrentPositionAsync: vi.fn().mockResolvedValue({ coords: { latitude: -16.5, longitude: -68.13 } }), Accuracy: { Balanced: 3 },
}));
vi.mock('@/state/auth-store', () => ({ useAuthStore: () => 'viewer-1' }));
vi.mock('@/theme', () => ({ colors: {}, radii: {}, spacing: {}, fontSizes: {}, iconSizes: {}, socialMapColors: {}, mediaChip: {}, heroScrim: {}, glideSpring: {}, shadows: {}, minTouchTarget: 44, semibold: '600', stagger: 45 }));
vi.mock('@/notifications', () => ({ notify: { error: vi.fn(), success: vi.fn() } }));
vi.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
vi.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
vi.mock('@/components/motion', () => ({ PressableScale: Press }));
vi.mock('@/components/bottom-sheet', () => ({ BottomSheet: ({ visible, children }: Props & { visible: boolean }) => (visible ? <div>{children}</div> : null) }));
vi.mock('@/components/social-status-editor', () => ({ DiscoveryPreferencesEditor: () => <div>Editor de preferencias</div> }));
vi.mock('@/components/feedback', () => ({ ErrorState: () => <div>Error</div> }));
vi.mock('@/components/media-image', () => ({ MediaImage: Box }));
vi.mock('@/components/person-avatar', () => ({ PersonAvatar: () => null }));
vi.mock('@/components/ui', () => ({
  Button: ({ label, onPress }: { label: string; onPress: () => void }) => <button onClick={onPress}>{label}</button>,
  Input: ({ label, value, onChangeText }: { label: string; value: string; onChangeText: (text: string) => void }) => (
    <input aria-label={label} onChange={(event) => onChangeText(event.target.value)} value={value} />
  ),
}));
vi.mock('@/components/keyboard', () => ({ numericInputProps: {} }));
vi.mock('react-native-reanimated', () => {
  const chain = { duration: () => chain, delay: () => chain, springify: () => chain, damping: () => chain, stiffness: () => chain };
  return { default: { View: Box }, FadeIn: chain, FadeOut: chain, SlideInDown: chain, SlideOutDown: chain };
});
vi.mock('react-native', () => ({
  View: Box, ScrollView: Box,
  Text: ({ children }: Props) => <span>{children}</span>,
  TextInput: () => <input />,
  Linking: { openURL: vi.fn() },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
}));
vi.mock('react-native-maps', async () => {
  const { forwardRef, useImperativeHandle } = await import('react');
  const MapView = forwardRef(({ children, onRegionChangeComplete }: { children: ReactNode; onRegionChangeComplete: (value: typeof region) => void }, ref) => {
    useImperativeHandle(ref, () => ({ animateToRegion: vi.fn() }));
    return <div><button onClick={() => onRegionChangeComplete({ ...region })}>Mover mapa</button>{children}</div>;
  });
  return { default: MapView, Marker: Press };
});

const gym = {
  kind: 'GYM', source: 'OPENSTREETMAP', sourceId: 'node/1', name: 'Gimnasio Sopocachi',
  address: 'Av. 20 de Octubre', city: 'La Paz', region: 'La Paz', latitude: -16.51, longitude: -68.13,
  tags: { amenity: 'gym' }, license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors',
  registered: false, updatedAt: '2026-10-15T00:00:00.000Z',
};
const person = {
  userId: '11111111-1111-4111-8111-111111111111', displayName: 'Ana P.', objetivo: null, branchId: null, branchName: null,
  connectionStatus: 'NONE', connectionId: null, socialStatus: null, photoUrl: null, photos: [], age: 27, gender: 'FEMALE',
  experienceLevel: null, points: null, levelCode: null, distanceKm: 2,
};

function renderMap() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><SocialMapScreen /></QueryClientProvider>);
}

const savedProfile = {
  id: '22222222-2222-4222-8222-222222222222', usuarioId: '33333333-3333-4333-8333-333333333333',
  edad: null, fechaNacimiento: null, pesoKg: 80, estaturaCm: 178, objetivo: 'HIPERTROFIA',
};

beforeEach(() => {
  vi.clearAllMocks();
  getProfile.mockResolvedValue(savedProfile);
  updateProfile.mockImplementation(async (input) => ({ ...savedProfile, ...input, edad: 30 }));
  updateDiscoverySettings.mockResolvedValue({});
  Object.assign(region, { latitudeDelta: 0.09, longitudeDelta: 0.09 });
  mapGyms.mockResolvedValue([gym]);
  mapAreas.mockResolvedValue({ cells: [] });
  publicBranches.mockResolvedValue([]);
  mapNearby.mockResolvedValue({ preferencesApplied: true, people: [person] });
});

describe('SocialMapScreen', () => {
  it('pinta los gimnasios de la zona sin tener que pulsar buscar', async () => {
    renderMap();
    expect(await screen.findByLabelText('Gimnasio Sopocachi')).toBeTruthy();
    expect(mapGyms).toHaveBeenCalledTimes(1);
    // Sobre el mapa no flota ninguna tarjeta: ni el conteo ni el aviso de la fecha.
    expect(screen.queryByText(/en esta zona/)).toBeNull();
    expect(screen.queryByText('Añadir fecha de nacimiento')).toBeNull();
  });

  it('al tocar un gimnasio muestra la cuadrícula de personas cercanas según preferencias', async () => {
    renderMap();
    fireEvent.click(await screen.findByLabelText('Gimnasio Sopocachi'));
    await waitFor(() => expect(mapNearby).toHaveBeenCalledWith({ latitude: gym.latitude, longitude: gym.longitude }));
    expect(await screen.findByLabelText('Ana P., 27 años, a 2 km')).toBeTruthy();
    expect(screen.getByText('1 persona cerca')).toBeTruthy();
    expect(screen.getByText('Según tus preferencias')).toBeTruthy();
  });

  it('con el mapa demasiado alejado no consulta gimnasios y pide acercarse', async () => {
    renderMap();
    await screen.findByLabelText('Gimnasio Sopocachi');
    Object.assign(region, { latitudeDelta: 8, longitudeDelta: 8 });
    fireEvent.click(screen.getByText('Mover mapa'));
    expect(await screen.findByText('Acerca el mapa para ver los gimnasios')).toBeTruthy();
    expect(mapGyms).toHaveBeenCalledTimes(1);
  });

  it('no dibuja a las personas en el mapa: solo aparecen al tocar una zona', async () => {
    mapAreas.mockResolvedValue({ cells: [{ id: 'c1', count: 3, center: { latitude: -16.5, longitude: -68.13 } }] });
    renderMap();
    await screen.findByLabelText('Gimnasio Sopocachi');
    expect(mapAreas).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/personas en esta zona/)).toBeNull();
    expect(screen.queryByText('Personas')).toBeNull();
  });

  it('desde Preferencias pide solo la fecha de nacimiento y te hace aparecer', async () => {
    renderMap();
    fireEvent.click(await screen.findByLabelText('Preferencias'));
    fireEvent.click(await screen.findByText('Añadir fecha de nacimiento'));
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: '1996' } });
    fireEvent.click(screen.getByText('Guardar y aparecer en el mapa'));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ pesoKg: 80, estaturaCm: 178, objetivo: 'HIPERTROFIA', fechaNacimiento: '1996-03-15' }));
    await waitFor(() => expect(updateDiscoverySettings).toHaveBeenCalledWith(expect.objectContaining({ profileEnabled: true, mapEnabled: true })));
  });

  it('no deja aparecer a un menor de edad', async () => {
    renderMap();
    fireEvent.click(await screen.findByLabelText('Preferencias'));
    fireEvent.click(await screen.findByText('Añadir fecha de nacimiento'));
    const year = String(new Date().getFullYear() - 15);
    fireEvent.change(screen.getByLabelText('Día'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: year } });
    fireEvent.click(screen.getByText('Guardar y aparecer en el mapa'));
    expect(await screen.findByText('El mapa es solo para mayores de 18 años.')).toBeTruthy();
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
