import { socialMapDisabledCopy } from '@gymsheet/domain';
import { EyeOff } from 'lucide-react';
import { ButtonLink } from '@/shared/components/ui/button';

/** 403 SOCIAL_MAP_DISABLED: «if you don't share, you don't see». Not an error, the next step. */
export function SocialMapDisabled() {
  return (
    <section
      aria-labelledby="social-map-disabled-title"
      className="grid min-w-0 justify-items-center gap-2 px-2 py-6 text-center"
    >
      <EyeOff aria-hidden className="size-8 text-[var(--text-muted)]" />
      <h2 className="t-headline" id="social-map-disabled-title">
        {socialMapDisabledCopy.title}
      </h2>
      <p className="t-subhead max-w-xs text-[var(--text-muted)]">{socialMapDisabledCopy.description}</p>
      <ButtonLink className="mt-1" href="/profile#perfil-social" size="sm" variant="primary">
        {socialMapDisabledCopy.action}
      </ButtonLink>
    </section>
  );
}
