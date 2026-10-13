import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReelDTO } from '@gymsheet/schemas';
import { reelsService } from '../services/reels-service';
import { ReelsPageClient } from './reels-page-client';

vi.mock('../services/reels-service', () => ({
  reelsService: { feed: vi.fn(), upload: vi.fn() },
}));

const reel: ReelDTO = {
  id: '0190e2cb-a6d4-7ec3-8f91-a6c735631501',
  userId: '0190e2cb-a6d4-7ec3-8f91-a6c735631502',
  mediaUrl: '/me/reels/0190e2cb-a6d4-7ec3-8f91-a6c735631501/media',
  durationSeconds: 60,
  status: 'READY',
  createdAt: '2026-10-10T12:00:00.000Z',
};
const secondReel: ReelDTO = {
  ...reel,
  id: '0190e2cb-a6d4-7ec3-8f91-a6c735631503',
  mediaUrl: '/me/reels/0190e2cb-a6d4-7ec3-8f91-a6c735631503/media',
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReelsPageClient />
    </QueryClientProvider>,
  );
}

describe('ReelsPageClient', () => {
  beforeEach(() => {
    vi.mocked(reelsService.feed).mockReset().mockResolvedValue({ items: [], nextCursor: null });
    vi.mocked(reelsService.upload).mockReset();
  });

  it('uploads one selected video and shows the READY reel in the protected feed', async () => {
    let resolveUpload!: (value: ReelDTO) => void;
    vi.mocked(reelsService.upload).mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    renderPage();

    const file = new File(['video'], 'training.mp4', { type: 'video/mp4' });
    fireEvent.change(await screen.findByLabelText('Elegir un vídeo del dispositivo'), {
      target: { files: [file] },
    });
    const submit = screen.getByRole('button', { name: 'Publicar reel' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(reelsService.upload).toHaveBeenCalledTimes(1));
    expect(vi.mocked(reelsService.upload).mock.calls[0]?.[0]).toBe(file);
    vi.mocked(reelsService.feed).mockResolvedValue({ items: [reel], nextCursor: null });
    resolveUpload(reel);

    expect(await screen.findByRole('status')).toHaveTextContent('Reel publicado.');
    expect(document.querySelector('video')).toHaveAttribute('src', `/api/backend${reel.mediaUrl}`);
    expect(screen.getByText('Duración: 1:00')).toBeInTheDocument();
  });

  it('rejects unsupported media before calling the upload service', async () => {
    renderPage();
    const file = new File(['not video'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(await screen.findByLabelText('Elegir un vídeo del dispositivo'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar reel' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El archivo debe ser MP4 o QuickTime.',
    );
    expect(reelsService.upload).not.toHaveBeenCalled();
  });

  it('asks for a feed refresh after an uncertain upload error before another attempt', async () => {
    vi.mocked(reelsService.upload).mockRejectedValue(new Error('network error'));
    renderPage();
    const file = new File(['video'], 'training.mp4', { type: 'video/mp4' });
    fireEvent.change(await screen.findByLabelText('Elegir un vídeo del dispositivo'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar reel' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Actualiza tu lista antes de volver a enviarlo.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar mis reels' }));

    await waitFor(() => expect(reelsService.feed).toHaveBeenCalledTimes(2));
    expect(reelsService.upload).toHaveBeenCalledTimes(1);
  });

  it('pauses the previous reel when another one starts', async () => {
    vi.mocked(reelsService.feed).mockResolvedValue({ items: [reel, secondReel], nextCursor: null });
    renderPage();
    const videos = await screen.findAllByLabelText(/Reel publicado/u);
    const pause = vi
      .spyOn(videos[0] as HTMLVideoElement, 'pause')
      .mockImplementation(() => undefined);

    fireEvent.play(videos[0] as HTMLVideoElement);
    fireEvent.play(videos[1] as HTMLVideoElement);

    expect(pause).toHaveBeenCalledOnce();
  });
});
