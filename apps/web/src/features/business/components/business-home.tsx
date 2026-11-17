import { BadgeCheck, ChevronRight, FileClock, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import {
  businessDestination,
  businessHomeCopy,
  businessNextStepCopy,
  businessTypeLabel,
  kycBanner,
} from '@gymsheet/domain';
import type { BusinessMe } from '@/shared/api/schemas';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/cn';

const BANNER_TONE = {
  success: 'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]',
  warning: 'border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]',
  danger: 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]',
  info: 'border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-text)]',
} as const;

/**
 * «Inicio» of the business portal (plan §4.2): who you are, the KYC banner
 * (with the way to continue or see the status, franja 8b) and what is still
 * missing. Counters, orders and messages join when their franjas ship;
 * nothing here is invented meanwhile.
 */
export function BusinessHome({ me }: Readonly<{ me: BusinessMe }>) {
  const handle = me.handle
    ? me.handle.status === 'ACTIVE'
      ? businessHomeCopy.handleActive(me.handle.handle)
      : businessHomeCopy.handlePending(me.handle.handle)
    : null;
  const banner = kycBanner(me.account.kycStatus, me.account.status);
  const BannerIcon = banner.tone === 'success' ? BadgeCheck : banner.tone === 'danger' ? ShieldAlert : FileClock;
  const bannerHref = me.account.kycStatus === 'DRAFT' ? businessDestination.web.signup : businessDestination.web.kyc;
  return (
    <>
      <header className="grid gap-1">
        <p className="data-label">{businessTypeLabel(me.entity.entityType)}</p>
        <h1 className="display-title text-balance break-words">{me.entity.name}</h1>
        {handle ? <p className="t-subhead text-[var(--text-muted)]">{handle}</p> : null}
      </header>

      <section
        aria-label="Estado de tu negocio"
        className={cn('flex flex-wrap items-start gap-3 rounded-[var(--radius-lg)] border px-4 py-3', BANNER_TONE[banner.tone])}
        role="status"
      >
        <BannerIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
        <p className="min-w-0 flex-1 text-[15px] font-semibold leading-6">{banner.text}</p>
        {banner.action ? (
          <Link
            className="inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
            href={bannerHref}
          >
            {banner.action}
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        ) : null}
      </section>

      <section aria-labelledby="business-pending" className="grid gap-3">
        <h2 className="t-headline" id="business-pending">
          {businessHomeCopy.pendingTitle}
        </h2>
        {me.nextSteps.length === 0 ? (
          <p className="t-subhead text-[var(--text-muted)]">{businessHomeCopy.allDone}</p>
        ) : (
          <ul className="m-0 grid list-none gap-2 p-0">
            {me.nextSteps.map((step) => {
              const copy = businessNextStepCopy[step];
              const body = (
                <>
                  <span className="grid min-w-0 gap-0.5">
                    <span className="font-semibold">{copy.title}</span>
                    <span className="t-subhead text-[var(--text-muted)]">{copy.description}</span>
                  </span>
                  {copy.available ? (
                    <ChevronRight aria-hidden className="size-5 shrink-0 text-[var(--text-muted)]" />
                  ) : (
                    <Badge>{businessHomeCopy.soon}</Badge>
                  )}
                </>
              );
              const row =
                'flex min-h-16 items-center justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-4 py-3';
              return (
                <li key={step}>
                  {copy.available ? (
                    <Link
                      className={`${row} transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]`}
                      href={businessDestination.web.signup}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className={row}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
