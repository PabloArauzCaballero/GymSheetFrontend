import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DiscoveryReadinessCard } from './discovery-readiness-card';

const { readiness } = vi.hoisted(() => ({ readiness: vi.fn() }));
vi.mock('../services/social-profile-service', () => ({
  socialProfileKeys: { readiness: ['social', 'discovery-readiness'] },
  socialProfileService: { readiness },
}));
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: ReactNode; href: string; className?: string }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

function renderCard(props: Parameters<typeof DiscoveryReadinessCard>[0] = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DiscoveryReadinessCard {...props} />
    </QueryClientProvider>,
  );
}

describe('DiscoveryReadinessCard', () => {
  beforeEach(() => readiness.mockReset());

  it('lists the known gaps with their call to action and skips unknown codes', async () => {
    readiness.mockResolvedValue({ ready: false, missing: ['PREFERENCES', 'SELFIE_CHECK', 'PHOTOS'] });
    renderCard();

    expect(await screen.findByRole('region', { name: 'Para aparecer en Conocer' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Elegir preferencias' })).toHaveAttribute('href', '/onboarding/conocer');
    expect(screen.getByRole('link', { name: 'Subir fotos' })).toHaveAttribute('href', '/profile#fotos');
    expect(screen.queryByText(/SELFIE_CHECK/u)).toBeNull();
  });

  it('renders nothing once you are ready or when only unknown gaps remain', async () => {
    readiness.mockResolvedValue({ ready: false, missing: ['SOMETHING_NEW'] });
    const { container, unmount } = renderCard();
    await vi.waitFor(() => expect(readiness).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
    unmount();

    readiness.mockResolvedValue({ ready: true, missing: [] });
    const second = renderCard();
    await vi.waitFor(() => expect(readiness).toHaveBeenCalledTimes(2));
    expect(second.container).toBeEmptyDOMElement();
  });

  it('leaves out the gaps another component on the page already resolves', async () => {
    readiness.mockResolvedValue({ ready: false, missing: ['PREFERENCES', 'PHOTOS'] });
    renderCard({ omit: ['PREFERENCES'] });

    expect(await screen.findByRole('link', { name: 'Subir fotos' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Elegir preferencias' })).toBeNull();
  });
});
