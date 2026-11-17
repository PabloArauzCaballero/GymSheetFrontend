'use client';

import { publicEnv } from '@/shared/config/public-env';
import { TurnstileWidget } from './turnstile-widget';

/**
 * The visible-to-bots part of the signup protection.
 *
 * The honeypot uses the standard visually-hidden pattern (not `display:none`,
 * which some bots skip): off-screen, out of the tab order, out of the
 * accessibility tree and never autofilled. People leave it empty. It is
 * uncontrolled: the form reads it from the submitted `FormData`.
 */
export function SignupProtectionFields({
  turnstileKey,
  onTurnstileToken,
}: Readonly<{
  /** Changes after each attempt, so the widget renders a fresh token. */
  turnstileKey: number;
  onTurnstileToken: (token: string | null) => void;
}>) {
  const siteKey = publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return (
    <>
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="website">Sitio web</label>
        <input
          autoComplete="off"
          defaultValue=""
          id="website"
          name="website"
          tabIndex={-1}
          type="text"
        />
      </div>
      {siteKey ? (
        <TurnstileWidget key={turnstileKey} onToken={onTurnstileToken} siteKey={siteKey} />
      ) : null}
    </>
  );
}
