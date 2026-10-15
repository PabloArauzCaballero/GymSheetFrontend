import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SocialMapClient } from './social-map-client';

const { mapAreas, mapPeople, mapGyms, searchMapCities, branches, mapHarness } = vi.hoisted(() => {
  let emitMoveEnd = () => {};
  let bounds = { south: -16.6, west: -68.3, north: -16.4, east: -68.0 };
  return {
    mapAreas: vi.fn(),
    mapPeople: vi.fn(),
    mapGyms: vi.fn(),
    searchMapCities: vi.fn(),
    branches: vi.fn(),
    mapHarness: {
      setBounds: (next: typeof bounds) => { bounds = next; },
      getBounds: () => bounds,
      connectMoveEnd: (handler: () => void) => { emitMoveEnd = handler; },
      emitMoveEnd: () => emitMoveEnd(),
    },
  };
});

vi.mock('@/features/social/services/social-service', () => ({
  socialService: { mapAreas, mapPeople, mapGyms, searchMapCities, sendConnection: vi.fn() },
}));

vi.mock('@/features/public-facilities/services/public-facilities-client', () => ({
  publicFacilitiesClient: { branches },
}));

vi.mock('react-leaflet', () => {
  const map = {
    getBounds: () => {
      const bounds = mapHarness.getBounds();
      return {
        getSouth: () => bounds.south,
        getWest: () => bounds.west,
        getNorth: () => bounds.north,
        getEast: () => bounds.east,
      };
    },
  };
  return {
    MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    TileLayer: () => null,
    useMapEvents: (handlers: { moveend: (event: { target: typeof map }) => void }) => {
      mapHarness.connectMoveEnd(() => handlers.moveend({ target: map }));
      return map;
    },
    useMap: () => ({ flyTo: vi.fn() }),
    CircleMarker: ({ children, eventHandlers }: { children: React.ReactNode; eventHandlers?: { click?: () => void } }) => (
      <button aria-label="map marker" data-testid="map-marker" onClick={eventHandlers?.click} type="button">{children}</button>
    ),
    Popup: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  };
});

function renderMap() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><SocialMapClient viewerId="viewer-1" /></QueryClientProvider>);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

describe('SocialMapClient', () => {
  beforeEach(() => {
    mapHarness.setBounds({ south: -16.6, west: -68.3, north: -16.4, east: -68.0 });
    mapAreas.mockReset().mockResolvedValue({ cells: [{ id: '123:456', center: { latitude: -16.5, longitude: -68.15 }, count: 2 }] });
    mapPeople.mockReset().mockResolvedValue([{
      userId: 'person-2', displayName: 'María L.', objetivo: null, branchId: null, branchName: null,
      connectionStatus: 'NONE', connectionId: null, socialStatus: null, photoUrl: null, photos: [],
      age: 29, gender: null, experienceLevel: null, points: null, levelCode: null,
    }]);
    branches.mockReset().mockResolvedValue([{
      id: 'branch-1', nombre: 'Gimnasio Centro', descripcion: null, latitud: -16.51, longitud: -68.14,
      servicios: [], imagenUrl: null, amenidades: [], marca: null,
    }]);
    mapGyms.mockReset().mockResolvedValue([{
      kind: 'GYM', source: 'OPENSTREETMAP', sourceId: 'node/900', name: 'Gym OSM', address: null,
      city: 'La Paz', region: 'La Paz', latitude: -16.52, longitude: -68.13, tags: { amenity: 'gym' },
      license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors', registered: false,
      updatedAt: '2026-10-08T00:00:00.000Z',
    }]);
    searchMapCities.mockReset().mockResolvedValue([{
      id: 'node/10', name: 'Cochabamba', region: 'Cochabamba', latitude: -17.39, longitude: -66.16,
      source: 'OPENSTREETMAP',
    }]);
  });

  it('opens a map zone and lists the eligible profiles returned by the API', async () => {
    renderMap();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar en esta zona' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'map marker' }))[0]!);

    expect(await screen.findByRole('link', { name: 'María L.' })).toHaveAttribute('href', '/perfil/person-2');
    expect(mapPeople).toHaveBeenCalledWith('123:456');
  });

  it('switches between person and registered gym layers', async () => {
    renderMap();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar en esta zona' }));
    await waitFor(() => expect(screen.getAllByTestId('map-marker')).toHaveLength(3));

    fireEvent.click(screen.getByRole('button', { name: 'Personas' }));
    await waitFor(() => expect(screen.getAllByTestId('map-marker')).toHaveLength(1));
    expect(screen.queryByText('Gimnasio Centro')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Gimnasios' }));
    await waitFor(() => expect(screen.getAllByTestId('map-marker')).toHaveLength(2));
    expect(screen.getAllByRole('link', { name: 'Gimnasio Centro' })).toHaveLength(2);
  });

  it('searches a city and shows external gyms with source attribution in the accessible list', async () => {
    renderMap();
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar ciudad' }), { target: { value: 'Cochabamba' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar ciudad' }));
    expect(await screen.findByRole('button', { name: /Cochabamba/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cochabamba/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Buscar en esta zona' }));

    expect((await screen.findAllByText('Gym OSM')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/© OpenStreetMap contributors/).length).toBeGreaterThan(0);
    expect(mapGyms).toHaveBeenCalled();
  });

  it('keeps zone B visible when the slower response for zone A arrives last', async () => {
    const zoneA = deferred<{ cells: Array<{ id: string; center: { latitude: number; longitude: number }; count: number }> }>();
    const zoneB = deferred<{ cells: Array<{ id: string; center: { latitude: number; longitude: number }; count: number }> }>();
    mapAreas.mockImplementation((bounds: { south: number }) => bounds.south === -16.6 ? zoneA.promise : zoneB.promise);

    renderMap();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar en esta zona' }));
    await waitFor(() => expect(mapAreas).toHaveBeenCalledTimes(1));

    act(() => {
      mapHarness.setBounds({ south: -34.7, west: -58.6, north: -34.5, east: -58.3 });
      mapHarness.emitMoveEnd();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar en esta zona' }));
    await waitFor(() => expect(mapAreas).toHaveBeenCalledTimes(2));

    zoneB.resolve({ cells: [{ id: 'zone-b', center: { latitude: -34.6, longitude: -58.45 }, count: 3 }] });
    expect(await screen.findByRole('button', { name: /3 personas elegibles/ })).toBeInTheDocument();

    zoneA.resolve({ cells: [{ id: 'zone-a', center: { latitude: -16.5, longitude: -68.15 }, count: 9 }] });
    await waitFor(() => expect(screen.getByRole('button', { name: /3 personas elegibles/ })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /9 personas elegibles/ })).not.toBeInTheDocument();
  });
});
