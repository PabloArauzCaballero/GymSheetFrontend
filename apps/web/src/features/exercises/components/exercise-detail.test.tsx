import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Exercise, ExerciseMedia } from '@/shared/api/contracts';

/**
 * Lo que se fija aquí es la degradación: hoy casi ningún ejercicio tiene vídeo,
 * y esa ficha tiene que verse exactamente igual que antes —sin reproductor,
 * sin marco vacío—. La otra mitad, que el vídeo aparezca cuando existe, se
 * comprueba en el mismo sitio para que nadie lo rompa al tocar el marco.
 */

const { getExercise, listFavorites, getUser } = vi.hoisted(() => ({
  getExercise: vi.fn(),
  listFavorites: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/features/exercises/services/exercise-service', () => ({
  exerciseService: {
    get: getExercise,
    listFavorites,
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    inactivatePersonal: vi.fn(),
  },
}));

vi.mock('@/features/profile/services/profile-service', () => ({
  profileService: { getUser },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/shared/notifications', () => ({
  confirm: vi.fn(),
  notify: { success: vi.fn(), error: vi.fn() },
}));

// La mediateca administrada es otra pantalla y arrastra sus propias consultas.
vi.mock('@/features/exercises/components/exercise-media-manager', () => ({
  ExerciseMediaManager: () => null,
}));

const { ExerciseDetail } = await import('./exercise-detail');

function media(overrides: Partial<ExerciseMedia>): ExerciseMedia {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    mediaType: 'IMAGE',
    provider: 'S3',
    externalId: null,
    url: 'https://media.test/lamina.jpg',
    thumbnailUrl: null,
    mimeType: 'image/jpeg',
    width: null,
    height: null,
    altText: 'Lámina del ejercicio',
    attribution: null,
    license: null,
    isPrimary: true,
    sortOrder: 0,
    status: 'ACTIVE',
    ...overrides,
  } as ExerciseMedia;
}

function exercise(mediaItems: ExerciseMedia[]): Exercise {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    nombre: 'Sentadilla con barra',
    grupoMuscular: 'quadriceps',
    descripcion: 'Descripción',
    tipoEjercicio: 'GLOBAL',
    createdByUsuarioId: null,
    estado: 'ACTIVO',
    dataSource: 'EXERCISES_DATASET',
    category: 'strength',
    bodyPart: 'upper legs',
    requiredEquipment: 'barbell',
    targetMuscle: 'quadriceps',
    synergistMuscleGroup: 'glutes',
    secondaryMuscles: ['glutes'],
    instructions: { es: 'Baja y sube.' },
    instructionSteps: { es: ['Baja', 'Sube'] },
    metadata: {},
    equipment: [],
    media: mediaItems,
  } as unknown as Exercise;
}

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(
    <ExerciseDetail
      currentUserId="33333333-3333-4333-8333-333333333333"
      id="22222222-2222-4222-8222-222222222222"
      role="CLIENTE"
    />,
    { wrapper },
  );
}

describe('ExerciseDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFavorites.mockResolvedValue([]);
    getUser.mockResolvedValue({ genero: 'FEMALE' });
  });

  it('sin vídeo no monta reproductor', async () => {
    getExercise.mockResolvedValue(exercise([media({})]));
    const { container } = renderDetail();

    await screen.findByText('Sentadilla con barra');
    expect(container.querySelector('video')).toBeNull();
  });

  it('sin ningún medio tampoco monta reproductor', async () => {
    getExercise.mockResolvedValue(exercise([]));
    const { container } = renderDetail();

    await screen.findByText('Sentadilla con barra');
    expect(container.querySelector('video')).toBeNull();
  });

  /**
   * Con vídeo sí aparece, con la variante del perfil y sin descargar nada hasta
   * que se pulsa: `preload="none"` es lo que mantiene la ficha en 0,12 MB.
   */
  it('con vídeo sirve la variante del perfil, en póster y sin precarga', async () => {
    getExercise.mockResolvedValue(
      exercise([
        media({
          id: '44444444-4444-4444-8444-444444444444',
          mediaType: 'VIDEO',
          url: 'https://media.test/hombre.mp4',
          mimeType: 'video/mp4',
          thumbnailUrl: 'https://media.test/hombre.webp',
          altText: 'Demostración en hombre',
          isPrimary: true,
          metadata: { variant: 'hombre' },
        } as Partial<ExerciseMedia>),
        media({
          id: '55555555-5555-4555-8555-555555555555',
          mediaType: 'VIDEO',
          url: 'https://media.test/mujer.mp4',
          mimeType: 'video/mp4',
          thumbnailUrl: 'https://media.test/mujer.webp',
          altText: 'Demostración en mujer',
          isPrimary: false,
          sortOrder: 10,
          metadata: { variant: 'mujer' },
        } as Partial<ExerciseMedia>),
      ]),
    );
    const { container } = renderDetail();

    await screen.findByText('Sentadilla con barra');
    await waitFor(() => expect(container.querySelector('video')).not.toBeNull());

    const player = container.querySelector('video');
    expect(player?.getAttribute('preload')).toBe('none');
    expect(player?.getAttribute('poster')).toBe('https://media.test/mujer.webp');
    expect(player?.getAttribute('aria-label')).toBe('Demostración en mujer');
    // Sin reproducción automática: la pide quien mira.
    expect(player?.hasAttribute('autoplay')).toBe(false);
    expect(container.querySelector('source')?.getAttribute('src')).toBe(
      'https://media.test/mujer.mp4',
    );
  });
});
