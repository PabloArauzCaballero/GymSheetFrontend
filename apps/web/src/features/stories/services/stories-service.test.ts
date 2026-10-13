import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiUploadMock = vi.hoisted(() => vi.fn());
const apiRequestMock = vi.hoisted(() => vi.fn());
vi.mock('@/shared/api/api-client', () => ({ apiRequest: apiRequestMock, apiUpload: apiUploadMock }));

import { storiesService } from './stories-service';

describe('storiesService.upload', () => {
  beforeEach(() => apiUploadMock.mockReset());

  it('sends an explicit, selected recipient list with the multipart upload', async () => {
    apiUploadMock.mockResolvedValue({});
    const file = new File(['story'], 'story.jpg', { type: 'image/jpeg' });
    const recipientId = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';

    const requestId = '9fb2d57e-6d27-4eef-9efe-6a76270b03e7';
    await storiesService.upload(file, { mode: 'SELECTED_CONNECTIONS', recipientIds: [recipientId], requestId });

    const form = apiUploadMock.mock.calls[0]?.[2] as FormData;
    expect(form.get('file')).toBe(file);
    expect(form.get('audienceMode')).toBe('SELECTED_CONNECTIONS');
    expect(form.get('recipientIds')).toBe(JSON.stringify([recipientId]));
    expect(form.get('requestId')).toBe(requestId);
  });

  it('keeps legacy callers on the all-connections backend default', async () => {
    apiUploadMock.mockResolvedValue({});
    const file = new File(['story'], 'story.jpg', { type: 'image/jpeg' });

    await storiesService.upload(file);

    const form = apiUploadMock.mock.calls[0]?.[2] as FormData;
    expect(form.get('file')).toBe(file);
    expect(form.get('audienceMode')).toBeNull();
    expect(form.get('recipientIds')).toBeNull();
  });
});

describe('storiesService.reply', () => {
  beforeEach(() => apiRequestMock.mockReset());

  it('posts only text and a stable idempotency key to the story reply route', async () => {
    apiRequestMock.mockResolvedValue({});
    const storyId = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
    const requestId = '7190e2cb-a6d4-7ec3-8f91-a6c735631502';

    await storiesService.reply(storyId, '¡Bien hecho!', requestId);

    expect(apiRequestMock).toHaveBeenCalledWith(
      `/me/stories/${storyId}/replies`,
      expect.anything(),
      { method: 'POST', body: { text: '¡Bien hecho!', requestId } },
    );
  });
});
