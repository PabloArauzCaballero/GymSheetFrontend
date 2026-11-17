'use client';

import { usePathname } from 'next/navigation';
import { EmailVerificationBanner } from './email-verification-banner';

/**
 * Where the portal decides on the banner: only for an explicit `false` (an
 * older backend that does not report it shows nothing) and never on the PIN
 * screen itself.
 */
export function EmailVerificationBannerSlot({
  emailVerified,
}: Readonly<{ emailVerified?: boolean }>) {
  const pathname = usePathname();
  if (emailVerified !== false || pathname === '/verificar-correo') return null;
  return <EmailVerificationBanner />;
}
