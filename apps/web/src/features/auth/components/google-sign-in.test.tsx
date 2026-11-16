import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleSignIn } from './google-sign-in';

const env = vi.hoisted(() => ({ publicEnv: {} as Record<string, string | undefined> }));
vi.mock('@/shared/config/public-env', () => env);
vi.mock('@/shared/theme/theme-provider', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next/script', () => ({
  default: ({ src }: { src: string }) => <script data-testid="gis" data-src={src} />,
}));

describe('GoogleSignIn', () => {
  beforeEach(() => {
    env.publicEnv = {};
  });

  it('renders nothing (and loads no script) without NEXT_PUBLIC_GOOGLE_CLIENT_ID', () => {
    const { container } = render(<GoogleSignIn />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('gis')).toBeNull();
  });

  it('loads Google Identity Services and reserves the button slot when configured', () => {
    env.publicEnv = { NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'client.apps.googleusercontent.com' };
    render(<GoogleSignIn />);
    expect(screen.getByTestId('gis')).toHaveAttribute(
      'data-src',
      'https://accounts.google.com/gsi/client',
    );
    expect(screen.getByRole('group', { name: 'Continuar con Google' })).toBeInTheDocument();
  });
});
