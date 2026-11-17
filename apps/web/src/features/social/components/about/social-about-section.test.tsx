import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SocialAbout } from '@/shared/api/schemas';
import { SocialAboutSection } from './social-about-section';

vi.mock('@/features/social/services/social-profile-service', () => ({
  socialProfileKeys: { interestCatalog: ['social', 'interest-catalog'] },
  socialProfileService: {
    interestCatalog: vi.fn().mockResolvedValue([
      { code: 'RUNNING', label: 'Correr' },
      { code: 'YOGA', label: 'Yoga' },
    ]),
  },
}));

const base: SocialAbout = {
  interests: ['RUNNING', 'RETIRED_CODE'],
  drinking: 'SOCIALLY',
  smoking: null,
  pets: 'DOG',
  bio: 'Entreno a las siete.',
};

function renderAbout(about: SocialAbout | undefined) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SocialAboutSection about={about} />
    </QueryClientProvider>,
  );
}

describe('SocialAboutSection', () => {
  it('shows bio, labelled interests and habits, hiding unknown codes and absent orientation', async () => {
    renderAbout(base);
    expect(await screen.findByText('Correr')).toBeInTheDocument();
    expect(screen.queryByText('RETIRED_CODE')).toBeNull();
    expect(screen.getByText('Entreno a las siete.')).toBeInTheDocument();
    expect(screen.getByText('En ocasiones sociales')).toBeInTheDocument();
    expect(screen.getByText('Perro')).toBeInTheDocument();
    expect(screen.queryByText('Bisexual')).toBeNull();
  });

  it('shows orientation only when its owner made it visible', () => {
    renderAbout({ ...base, orientation: 'BISEXUAL' });
    expect(screen.getByText('Bisexual')).toBeInTheDocument();
  });

  it('renders nothing when there is nothing answered', () => {
    const { container } = renderAbout({ interests: [], drinking: null, smoking: null, pets: null, bio: null });
    expect(container).toBeEmptyDOMElement();
  });
});
