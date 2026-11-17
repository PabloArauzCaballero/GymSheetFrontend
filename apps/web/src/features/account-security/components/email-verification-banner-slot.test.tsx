import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailVerificationBannerSlot } from './email-verification-banner-slot';

const navigation = vi.hoisted(() => ({ pathname: '/comunidad' }));
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }));
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => (
    <a className={className} href={href}>
      {children}
    </a>
  ),
}));

describe('EmailVerificationBannerSlot', () => {
  beforeEach(() => {
    navigation.pathname = '/comunidad';
  });

  it('shows the persistent banner while the email is unverified, linking to the PIN screen', () => {
    render(<EmailVerificationBannerSlot emailVerified={false} />);
    expect(screen.getByRole('complementary', { name: 'Verifica tu correo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verificar ahora' })).toHaveAttribute(
      'href',
      '/verificar-correo',
    );
    expect(screen.queryByRole('button', { name: /cerrar/iu })).toBeNull();
  });

  it('stays hidden once verified, when the backend does not report it, and on the PIN screen', () => {
    const { rerender, container } = render(<EmailVerificationBannerSlot emailVerified />);
    expect(container).toBeEmptyDOMElement();
    rerender(<EmailVerificationBannerSlot />);
    expect(container).toBeEmptyDOMElement();
    navigation.pathname = '/verificar-correo';
    rerender(<EmailVerificationBannerSlot emailVerified={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
