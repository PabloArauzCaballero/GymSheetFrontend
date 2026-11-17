import { consentCopy, consentsSectionCopy } from '@gymsheet/domain';
import type { Consent } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';

/** One consent: what it is for, its state in words, and the one action that applies. */
export function ConsentRow({
  consent,
  busy,
  onGrant,
  onRevoke,
}: Readonly<{
  consent: Consent;
  busy: boolean;
  onGrant: (consent: Consent) => void;
  onRevoke: (consent: Consent) => void;
}>) {
  const copy = consentCopy[consent.kind];
  const outdated = consent.granted && !consent.upToDate;
  const titleId = `consent-${consent.kind}`;
  const state = outdated
    ? consentsSectionCopy.outdated
    : consent.granted
      ? consentsSectionCopy.granted
      : consentsSectionCopy.notGranted;

  return (
    <li aria-labelledby={titleId} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
      <div className="grid min-w-0 gap-1">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="t-headline" id={titleId}>
            {copy.title}
          </span>
          <span
            className={`t-footnote ${consent.granted && !outdated ? 'text-[var(--success-text)]' : 'text-[var(--text-muted)]'}`}
            data-testid={`consent-state-${consent.kind}`}
          >
            {state}
          </span>
        </p>
        <p className="t-subhead text-[var(--text-muted)]">{copy.purpose}</p>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {!consent.granted || outdated ? (
          <Button
            aria-label={`${outdated ? consentsSectionCopy.renew : consentsSectionCopy.grant}: ${copy.title}`}
            disabled={busy}
            onClick={() => onGrant(consent)}
            size="sm"
            variant="secondary"
          >
            {outdated ? consentsSectionCopy.renew : consentsSectionCopy.grant}
          </Button>
        ) : null}
        {consent.granted ? (
          <Button
            aria-label={`${consentsSectionCopy.revoke}: ${copy.title}`}
            disabled={busy}
            onClick={() => onRevoke(consent)}
            size="sm"
            variant="ghost"
          >
            {consentsSectionCopy.revoke}
          </Button>
        ) : null}
      </div>
    </li>
  );
}
