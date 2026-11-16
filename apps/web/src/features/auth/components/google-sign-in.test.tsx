import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { GoogleSignIn } from './google-sign-in';

const auth = vi.hoisted(() => ({ requestGoogleNonce: vi.fn(), signInWithGoogle: vi.fn() }));
vi.mock('@/features/auth/services/auth-client', () => auth);

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
    delete window.google;
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

  it('says an expulsion by its code when Google proved the owner (403 ACCOUNT_BANNED)', async () => {
    env.publicEnv = { NEXT_PUBLIC_GOOGLE_CLIENT_ID: 'client.apps.googleusercontent.com' };
    let callback: ((answer: { credential: string }) => void) | undefined;
    window.google = {
      accounts: {
        id: {
          initialize: (options) => {
            callback = options.callback as typeof callback;
          },
          renderButton: vi.fn(),
        },
      },
    };
    auth.requestGoogleNonce.mockResolvedValue('nonce-1');
    auth.signInWithGoogle.mockRejectedValue(
      new ApiError({
        message: 'Cerramos tu cuenta por incumplir las normas de la comunidad.',
        status: 403,
        kind: 'forbidden',
        code: 'ACCOUNT_BANNED',
        details: { reason: { code: 'SPAM', label: 'Spam', text: 'publicidad o mensajes repetidos que nadie pidió' } },
      }),
    );
    render(<GoogleSignIn />);
    await waitFor(() => expect(callback).toBeDefined());
    await act(async () => callback?.({ credential: 'id-token' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta fue expulsada por incumplir varias veces las normas de la comunidad. Motivo: Spam (publicidad o mensajes repetidos que nadie pidió). Para tus datos, escribe a {{REPP_CONTACTO_PRIVACIDAD}}.',
    );
  });
});
