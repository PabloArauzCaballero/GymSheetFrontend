import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/shared/api/api-error';

// next/navigation is not available under jsdom.
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Force the backend to be "unavailable" so progress persists to the in-memory
// fallback synchronously (no network in tests).
vi.mock('@/features/tutorials/storage/tutorial-progress-service', () => ({
  tutorialProgressService: {
    list: vi.fn().mockRejectedValue(new ApiError({ message: 'x', status: 404, kind: 'not-found' })),
    upsert: vi.fn().mockRejectedValue(new ApiError({ message: 'x', status: 0, kind: 'network' })),
    reset: vi.fn().mockRejectedValue(new ApiError({ message: 'x', status: 0, kind: 'network' })),
  },
}));

import { TutorialProvider } from '../engine/tutorial-provider';
import { useTutorial } from '../engine/tutorial-context';
import { TutorialOverlay } from './tutorial-overlay';
import { TutorialRegistry } from '../registry/tutorial-registry';
import { clearLocalProgress, readLocalProgress } from '../storage/local-progress-store';
import type { TutorialDefinition } from '../model/types';

const RECT = { width: 100, height: 20, top: 10, left: 10, right: 110, bottom: 30, x: 10, y: 10 };

beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', () => 0);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  // jsdom has no layout; make elements report a non-empty rect so they resolve.
  HTMLElement.prototype.getBoundingClientRect = () => ({ ...RECT, toJSON() {} }) as DOMRect;
  HTMLElement.prototype.scrollIntoView = () => {};
});

const flow: TutorialDefinition = {
  id: 'flow',
  version: '1.0.0',
  title: 'Flujo',
  description: 'd',
  category: 'TRAINING',
  difficulty: 'BEGINNER',
  estimatedMinutes: 1,
  steps: [
    { id: 'welcome', title: 'Bienvenido', description: 'Empecemos', placement: 'center' },
    { id: 'target', title: 'Elemento', description: 'Mira esto', target: 't1', placement: 'bottom' },
    {
      id: 'action',
      title: 'Acción',
      description: 'Haz clic',
      target: 't1',
      requireAction: true,
      advanceOn: { type: 'click' },
      advanceHint: 'Haz clic en el elemento',
    },
  ],
};

function Harness({ registry }: { registry: TutorialRegistry }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TutorialProvider role="CLIENTE" userId="user-1" registry={registry}>
        <StartButton />
        <button type="button" data-tutorial-id="t1">
          Objetivo
        </button>
        <TutorialOverlay />
      </TutorialProvider>
    </QueryClientProvider>
  );
}

function StartButton() {
  const { start } = useTutorial();
  return (
    <button type="button" onClick={() => start('flow')}>
      iniciar
    </button>
  );
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => clearLocalProgress());

describe('tutorial flow (integration)', () => {
  it('starts, advances through steps and finishes', async () => {
    render(<Harness registry={new TutorialRegistry([flow])} />);
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByText('iniciar'));
    expect(await screen.findByText('Bienvenido')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(await screen.findByText('Elemento')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    expect(await screen.findByText('Acción')).toBeInTheDocument();

    // requireAction: Next is a finish here and disabled until the action happens.
    const finish = screen.getByRole('button', { name: /Finalizar/ });
    expect(finish).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Objetivo' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Finalizar/ })).not.toBeDisabled(),
    );

    fireEvent.click(screen.getByRole('button', { name: /Finalizar/ }));
    await waitFor(() => expect(screen.queryByText('Acción')).toBeNull());

    expect(readLocalProgress('user-1')[0]).toMatchObject({
      tutorialId: 'flow',
      status: 'COMPLETED',
    });
  });

  it('advances with the ArrowRight key', async () => {
    render(<Harness registry={new TutorialRegistry([flow])} />);
    fireEvent.click(screen.getByText('iniciar'));
    await screen.findByText('Bienvenido');
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(await screen.findByText('Elemento')).toBeInTheDocument();
  });

  it('closes on Escape at the first step without confirmation', async () => {
    render(<Harness registry={new TutorialRegistry([flow])} />);
    fireEvent.click(screen.getByText('iniciar'));
    await screen.findByText('Bienvenido');
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Bienvenido')).toBeNull());
  });

  it('asks for confirmation before exiting mid-tour', async () => {
    render(<Harness registry={new TutorialRegistry([flow])} />);
    fireEvent.click(screen.getByText('iniciar'));
    await screen.findByText('Bienvenido');
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    await screen.findByText('Elemento');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(await screen.findByText('¿Salir del tutorial?')).toBeInTheDocument();
  });

  it('persists SKIPPED when the user omits the tutorial', async () => {
    render(<Harness registry={new TutorialRegistry([flow])} />);
    fireEvent.click(screen.getByText('iniciar'));
    await screen.findByText('Bienvenido');
    fireEvent.click(screen.getByRole('button', { name: /Omitir/ }));
    await waitFor(() => expect(readLocalProgress('user-1')[0]?.status).toBe('SKIPPED'));
  });

  it('shows a recoverable error when the target never appears', async () => {
    const missing: TutorialDefinition = {
      ...flow,
      id: 'missing',
      steps: [
        {
          id: 'ghost',
          title: 'Fantasma',
          description: 'No existe',
          target: 'does-not-exist',
          waitForTargetMs: 50,
        },
      ],
    };
    function MissingHarness() {
      const { start } = useTutorial();
      return (
        <button type="button" onClick={() => start('missing')}>
          go
        </button>
      );
    }
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <TutorialProvider role="CLIENTE" userId="user-1" registry={new TutorialRegistry([missing])}>
          <MissingHarness />
          <TutorialOverlay />
        </TutorialProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByText('go'));
    expect(await screen.findByText(/No encontramos este elemento/)).toBeInTheDocument();
  });
});
