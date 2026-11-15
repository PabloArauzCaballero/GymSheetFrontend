import { afterEach, describe, expect, it, vi } from 'vitest';
import { exerciseMediaListSchema, pageSchema, routineSchema } from '@gymsheet/schemas';
import legacyPage from './__fixtures__/routines-public-page.json';

// Media item captured from the local API; it was stored with provider 'e2e' by a raw e2e insert.
const video = {
  id: '5f8d12bc-bdf0-46e8-a72b-8a2bfcee38c7',
  exerciseId: '421bd79e-c82b-44b5-af8f-3aab1bebdc8a',
  mediaType: 'VIDEO',
  provider: 'EXTERNAL_URL',
  externalId: null,
  url: 'https://media.e2e.test/v.mp4',
  thumbnailUrl: 'https://media.e2e.test/poster.webp',
  mimeType: null,
  width: null,
  height: null,
  checksumSha256: null,
  altText: 'e2e',
  attribution: null,
  license: null,
  isPrimary: true,
  sortOrder: 0,
  status: 'ACTIVE',
  metadata: {},
};
const image = { ...video, id: '6a9e23cd-cef1-47f9-b0d8-94c7a0b5f1aa', mediaType: 'IMAGE', url: 'https://media.e2e.test/a.jpg', thumbnailUrl: null, isPrimary: false, sortOrder: 1 };
const invalid = { ...video, id: '7b0f34de-d0a2-48aa-81e9-a5d8b1c6a2bb', provider: 'e2e' };

function pageWithMedia(media: unknown[]) {
  const page = structuredClone(legacyPage.data) as { items: Array<{ ejercicios: Array<{ ejercicio: { media: unknown[] } }> }> };
  page.items[0]!.ejercicios[0]!.ejercicio.media = media;
  return page;
}

describe('exercise media · tolerant per item', () => {
  afterEach(() => vi.restoreAllMocks());

  it('drops only the invalid media item and keeps the routine page', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const page = pageSchema(routineSchema).parse(pageWithMedia([video, invalid, image]));
    const media = page.items[0]!.ejercicios[0]!.ejercicio?.media;
    expect(media?.map((m) => m.id)).toEqual([video.id, image.id]);
    expect(warn).toHaveBeenCalledTimes(1);
    const [event, context] = warn.mock.calls[0]!;
    expect(event).toBe('schema.exercise_media_dropped');
    expect(context).toMatchObject({ dropped: 1, kept: 2, issues: [{ index: 1, path: 'provider', code: 'invalid_value' }] });
    // Only counts and issue paths: no URLs or free text reach the log.
    expect(JSON.stringify(context)).not.toContain('https://');
  });

  it('keeps a fully valid list unchanged and stays silent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(exerciseMediaListSchema.parse([video, image])).toEqual([video, image]);
    const page = pageSchema(routineSchema).parse(pageWithMedia([video, image]));
    expect(page.items[0]!.ejercicios[0]!.ejercicio?.media).toEqual([video, image]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('still validates each kept item strictly and rejects a non-list', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(exerciseMediaListSchema.parse([{ ...video, url: 'not a url' }, { ...video, status: 'GONE' }])).toEqual([]);
    expect(exerciseMediaListSchema.safeParse({ 0: video }).success).toBe(false);
    expect(exerciseMediaListSchema.safeParse(null).success).toBe(false);
  });
});
