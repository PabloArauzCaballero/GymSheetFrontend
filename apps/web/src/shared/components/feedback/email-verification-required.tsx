import { emailVerificationCopy } from '@gymsheet/domain';
import { MailCheck } from 'lucide-react';
import { ButtonLink } from '@/shared/components/ui/button';

/**
 * What a social screen shows when the server answers 403
 * `EMAIL_VERIFICATION_REQUIRED`: not an error, the next step. Same centered
 * card as the empty and error states, with one primary action.
 */
export function EmailVerificationRequired() {
  return (
    <section
      aria-labelledby="email-verification-required-title"
      className="panel grid min-w-0 justify-items-center gap-2 px-6 py-8 text-center"
    >
      <MailCheck aria-hidden className="size-8 text-[var(--accent-ink)]" />
      <h2 className="t-headline" id="email-verification-required-title">
        {emailVerificationCopy.title}
      </h2>
      <p className="t-subhead max-w-md text-[var(--text-muted)]">{emailVerificationCopy.banner}</p>
      <ButtonLink className="mt-1" href="/verificar-correo" size="sm" variant="primary">
        {emailVerificationCopy.bannerAction}
      </ButtonLink>
    </section>
  );
}
