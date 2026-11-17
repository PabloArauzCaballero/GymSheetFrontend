'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock3, ShieldAlert, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { businessDestination, kycFailure, type KycOutcome, type KycOutcomeAction } from '@gymsheet/domain';
import { queryKeys } from '@/shared/api/query-keys';
import { AuthAlert } from '@/features/auth/components/auth-alert';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/cn';
import { businessKycService } from '../../services/business-kyc-client';

const TONE = {
  success: { icon: CheckCircle2, className: 'text-[var(--success-text)]' },
  info: { icon: Clock3, className: 'text-[var(--info-text)]' },
  warning: { icon: TriangleAlert, className: 'text-[var(--warning-text)]' },
  danger: { icon: ShieldAlert, className: 'text-[var(--danger-text)]' },
} as const;

/**
 * The KYC result (plan §4.1): published, in review, to correct or final. The
 * first listing opens the creation (franja 8c); QR payments (8d) shows disabled with
 * «Llega pronto» instead of linking to a screen that does not exist.
 * `heading` renders the title here; the wizard's frame renders it otherwise.
 */
export function KycResultView({ outcome, heading = false }: Readonly<{ outcome: KycOutcome; heading?: boolean }>) {
  const router = useRouter();
  const client = useQueryClient();
  const tone = TONE[outcome.tone];
  const Icon = tone.icon;
  const reopen = useMutation({
    mutationFn: (key: 'resubmit' | 'startChange') => (key === 'resubmit' ? businessKycService.resubmit() : businessKycService.startChange()),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: queryKeys.business.me });
      router.push(businessDestination.web.signup);
      router.refresh();
    },
  });

  function action(item: KycOutcomeAction, primary: boolean) {
    const variant = primary ? 'primary' : 'ghost';
    if (!item.available) {
      return (
        <Button aria-describedby={`kyc-soon-${item.key}`} disabled key={item.key} size="lg" type="button" variant="ghost">
          {item.label}
          <span className="t-footnote text-[var(--text-muted)]" id={`kyc-soon-${item.key}`}>
            · {item.hint}
          </span>
        </Button>
      );
    }
    if (item.key === 'firstListing') return <ButtonLink href={businessDestination.web.newListing} key={item.key} size="lg" variant={variant}>{item.label}</ButtonLink>;
    if (item.key === 'portal') return <ButtonLink href={businessDestination.web.home} key={item.key} size="lg" variant={variant}>{item.label}</ButtonLink>;
    if (item.key === 'publicProfile' && outcome.handle) {
      return <ButtonLink href={`/@${outcome.handle}`} key={item.key} size="lg" variant={variant}>{item.label}</ButtonLink>;
    }
    if (item.key === 'resubmit' || item.key === 'startChange') {
      const key = item.key;
      return (
        <Button key={key} loading={reopen.isPending && reopen.variables === key} onClick={() => reopen.mutate(key)} size="lg" type="button" variant={variant}>
          {item.label}
        </Button>
      );
    }
    return null;
  }

  return (
    <div className="grid gap-5" data-testid="kyc-result">
      <div className="flex items-start gap-3">
        <Icon aria-hidden className={cn('mt-1 size-7 shrink-0', tone.className)} />
        <div className="grid gap-1">
          {heading ? <h1 className="title-text text-balance">{outcome.title}</h1> : null}
          <p className="t-subhead text-[var(--text-muted)]">{outcome.body}</p>
        </div>
      </div>
      {outcome.notes.length > 0 ? (
        <ul className="m-0 grid list-disc gap-1.5 rounded-[var(--radius-lg)] bg-[var(--surface)] py-3 pl-9 pr-4 text-[15px]">
          {outcome.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
      {reopen.error ? <AuthAlert message={kycFailure(reopen.error).message} /> : null}
      {outcome.actions.length > 0 ? (
        <div className="grid gap-3">{outcome.actions.map((item, index) => action(item, index === 0))}</div>
      ) : null}
    </div>
  );
}
