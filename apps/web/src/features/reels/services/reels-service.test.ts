import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiUploadMock = vi.hoisted(() => vi.fn());
const apiRequestMock = vi.hoisted(() => vi.fn());
vi.mock('@/shared/api/api-client', () => ({
  apiRequest: apiRequestMock,
  apiUpload: apiUploadMock,
}));

import { reelSchema, reelsFeedSchema } from '@gymsheet/schemas';
import { reelsService } from './reels-service';

const reel = {
  id: '0190e2cb-a6d4-7ec3-8f91-a6c735631501',
  userId: '0190e2cb-a6d4-7ec3-8f91-a6c735631502',
  mediaUrl: '/me/reels/0190e2cb-a6d4-7ec3-8f91-a6c735631501/media',
  durationSeconds: 60,
  status: 'READY',
  createdAt: '2026-10-10T12:00:00.000Z',
} as const;

describe('reelsService', () => {
  beforeEach(() => {
    apiUploadMock.mockReset();
    apiRequestMock.mockReset();
  });

  it('requests the feed using the shared page schema', async () => {
    apiRequestMock.mockResolvedValue({ items: [reel], nextCursor: null });

    await reelsService.feed();

    expect(apiRequestMock).toHaveBeenCalledWith('/me/reels/feed', reelsFeedSchema);
  });

  it('uploads only the selected file as multipart field `file`', async () => {
    apiUploadMock.mockResolvedValue(reel);
    const file = new File(['reel'], 'reel.mp4', { type: 'video/mp4' });

    await reelsService.upload(file);

    expect(apiUploadMock).toHaveBeenCalledTimes(1);
    expect(apiUploadMock).toHaveBeenCalledWith('/me/reels', reelSchema, expect.any(FormData));
    const form = apiUploadMock.mock.calls[0]?.[2] as FormData;
    expect([...form.keys()]).toEqual(['file']);
    expect(form.get('file')).toBe(file);
  });

  it('accepts only READY reels with the agreed DTO shape', () => {
    expect(reelSchema.safeParse(reel).success).toBe(true);
    expect(reelSchema.safeParse({ ...reel, status: 'PROCESSING' }).success).toBe(false);
    expect(reelSchema.safeParse({ ...reel, unexpected: true }).success).toBe(false);
  });

  it('parses the agreed feed envelope data and rejects a non-null cursor', () => {
    expect(reelsFeedSchema.safeParse({ items: [reel], nextCursor: null }).success).toBe(true);
    expect(reelsFeedSchema.safeParse({ items: [reel], nextCursor: 'next-page' }).success).toBe(
      false,
    );
  });
});
