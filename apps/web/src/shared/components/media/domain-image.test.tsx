import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DomainImage, mediaProxyUrl } from './domain-image';

describe('DomainImage', () => {
  it('routes private chat media through the authenticated backend proxy', () => {
    expect(mediaProxyUrl(`/me/conversations/${'0190e2cb-a6d4-7ec3-8f91-a6c735631501'}/messages/${'0190e2cb-a6d4-7ec3-8f91-a6c735631502'}/media`))
      .toBe(`/api/backend/me/conversations/${'0190e2cb-a6d4-7ec3-8f91-a6c735631501'}/messages/${'0190e2cb-a6d4-7ec3-8f91-a6c735631502'}/media`);
  });

  it('routes private story media through the authenticated backend proxy', () => {
    const storyId = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
    expect(mediaProxyUrl(`/me/stories/${storyId}/media`)).toBe(`/api/backend/me/stories/${storyId}/media`);
    expect(mediaProxyUrl(`/api/v1/me/stories/${storyId}/media`)).toBe(`/api/backend/me/stories/${storyId}/media`);
  });

  it('shows an accessible fallback when the source fails', () => {
    const view = render(<DomainImage alt="Press de banca" src="https://example.test/broken.jpg" />);
    fireEvent.error(view.getByRole('img', { name: 'Press de banca' }));
    expect(
      view.getByRole('img', { name: 'Press de banca: imagen no disponible' }),
    ).toBeInTheDocument();
  });
});
