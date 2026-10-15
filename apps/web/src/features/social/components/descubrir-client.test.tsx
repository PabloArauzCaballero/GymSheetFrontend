import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import type { GymDirectoryEntry } from '@/shared/api/schemas';
import { DescubrirClient } from './descubrir-client';

const { deck, swipe, undoSwipe, notifyError } = vi.hoisted(() => ({
  deck: vi.fn(),
  swipe: vi.fn(),
  undoSwipe: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock('@/features/social/services/discovery-service', () => ({
  discoveryService: { deck, swipe, undoSwipe },
}));
vi.mock('@/shared/notifications', () => ({ notify: { error: notifyError, success: vi.fn() } }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('./directory-swipe-deck', () => ({
  DirectorySwipeDeck: ({
    entries,
    onDecide,
    onUndo,
  }: {
    entries: GymDirectoryEntry[];
    onDecide: (entry: GymDirectoryEntry, direction: 'LIKE' | 'PASS') => void;
    onUndo: () => void;
  }) => (
    <div>
      {entries.map((candidate) => (
        <div data-testid={`candidate-${candidate.userId}`} key={candidate.userId}>
          <button aria-label={`Me interesa ${candidate.displayName}`} onClick={() => onDecide(candidate, 'LIKE')}>
            Me interesa
          </button>
          <button aria-label={`Pasar de ${candidate.displayName}`} onClick={() => onDecide(candidate, 'PASS')}>
            Pasar
          </button>
        </div>
      ))}
      <button aria-label="Deshacer decisión" onClick={onUndo}>Deshacer decisión</button>
    </div>
  ),
}));
vi.mock('./match-celebration', () => ({ MatchCelebration: () => null }));
vi.mock('./member-detail-sheet', () => ({ MemberDetailSheet: () => null }));

function entry(userId: string, displayName: string): GymDirectoryEntry {
  return {
    userId,
    displayName,
    objetivo: 'TRAINING',
    branchId: null,
    branchName: null,
    connectionStatus: 'NONE',
    connectionId: null,
    socialStatus: null,
    photoUrl: null,
    photos: [],
    age: 28,
    gender: 'FEMALE',
    experienceLevel: 'BEGINNER',
    points: 0,
    levelCode: null,
  };
}

const ana = entry('00000000-0000-4000-8000-000000000001', 'Ana');
const bea = entry('00000000-0000-4000-8000-000000000002', 'Bea');
const carla = entry('00000000-0000-4000-8000-000000000003', 'Carla');

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function renderDeck(genero = 'FEMALE') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const ui = (filter: string) => <QueryClientProvider client={queryClient}>
    <DescubrirClient genero={filter} objetivo="TRAINING" sucursalId="" />
  </QueryClientProvider>;
  const rendered = render(ui(genero));
  return { ...rendered, rerenderForFilter: (filter: string) => rendered.rerender(ui(filter)) };
}

describe('DescubrirClient swipe recovery', () => {
  beforeEach(() => {
    deck.mockReset().mockImplementation(async (filters: { genero?: string }) => filters.genero === 'MALE' ? [carla] : [ana, bea]);
    swipe.mockReset().mockResolvedValue({ matched: false, connectionId: null });
    undoSwipe.mockReset().mockResolvedValue({ undone: 'PASS', targetId: ana.userId, connectionId: null, unmatched: false });
    notifyError.mockReset();
  });

  it('reconciles a 409 swipe response from the authoritative deck without restoring the candidate', async () => {
    const failedSwipe = deferred<{ matched: boolean; connectionId: string | null }>();
    swipe.mockReturnValueOnce(failedSwipe.promise);
    renderDeck();

    fireEvent.click(await screen.findByRole('button', { name: 'Me interesa Ana' }));
    expect(await screen.findByRole('button', { name: 'Me interesa Bea' })).toBeTruthy();
    deck.mockResolvedValueOnce([bea]);

    await act(async () => {
      failedSwipe.reject(new ApiError({ message: 'La decisión ya fue registrada.', status: 409, kind: 'conflict' }));
    });

    await waitFor(() => expect(deck).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', { name: 'Me interesa Ana' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Me interesa Bea' })).toBeTruthy();
  });

  it('does not let a late old-filter swipe rejection insert a card into the new deck', async () => {
    const failedSwipe = deferred<{ matched: boolean; connectionId: string | null }>();
    swipe.mockReturnValueOnce(failedSwipe.promise);
    const view = renderDeck();

    fireEvent.click(await screen.findByRole('button', { name: 'Me interesa Ana' }));
    view.rerenderForFilter('MALE');
    expect(await screen.findByRole('button', { name: 'Me interesa Carla' })).toBeTruthy();

    await act(async () => { failedSwipe.reject(new Error('network unavailable')); });

    expect(screen.queryByRole('button', { name: 'Me interesa Ana' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Me interesa Carla' })).toBeTruthy();
  });

  it('does not duplicate a candidate when filters change away and back before a transient rejection', async () => {
    const failedSwipe = deferred<{ matched: boolean; connectionId: string | null }>();
    swipe.mockReturnValueOnce(failedSwipe.promise);
    const view = renderDeck();

    fireEvent.click(await screen.findByRole('button', { name: 'Me interesa Ana' }));
    view.rerenderForFilter('MALE');
    expect(await screen.findByRole('button', { name: 'Me interesa Carla' })).toBeTruthy();
    view.rerenderForFilter('FEMALE');
    expect(await screen.findByRole('button', { name: 'Me interesa Ana' })).toBeTruthy();

    await act(async () => { failedSwipe.reject(new Error('network unavailable')); });

    expect(screen.getAllByTestId(`candidate-${ana.userId}`)).toHaveLength(1);
  });

  it('restores a transiently failed swipe once while the originating filter is still active', async () => {
    const failedSwipe = deferred<{ matched: boolean; connectionId: string | null }>();
    swipe.mockReturnValueOnce(failedSwipe.promise);
    renderDeck();

    fireEvent.click(await screen.findByRole('button', { name: 'Me interesa Ana' }));
    expect(await screen.findByRole('button', { name: 'Me interesa Bea' })).toBeTruthy();
    await act(async () => { failedSwipe.reject(new Error('network unavailable')); });

    expect(await screen.findByRole('button', { name: 'Me interesa Ana' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Me interesa Ana' })).toHaveLength(1);
  });

  it('keeps the active deck history available to undo after a successful pass', async () => {
    deck.mockResolvedValueOnce([ana]).mockResolvedValue([]);
    renderDeck();

    fireEvent.click(await screen.findByRole('button', { name: 'Pasar de Ana' }));

    expect(await screen.findByRole('button', { name: 'Deshacer la última' })).toBeTruthy();
    expect(deck).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer la última' }));

    await waitFor(() => expect(undoSwipe).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'Me interesa Ana' })).toBeTruthy();
  });
});
