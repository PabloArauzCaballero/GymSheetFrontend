import { ArrowRight } from 'lucide-react';
import { kycCopy } from '@gymsheet/domain';
import { Button } from '@/shared/components/ui/button';

/**
 * «Atrás» and «Seguir» of a KYC step: the primary action is the wide one.
 * A disabled «Seguir» always says why, in `blocked`, right above it.
 */
export function KycNav({
  onBack,
  onNext,
  nextLabel = kycCopy.continue,
  nextType = 'button',
  loading = false,
  blocked,
}: Readonly<{
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextType?: 'button' | 'submit';
  loading?: boolean;
  blocked?: string | null;
}>) {
  return (
    <div className="grid gap-3">
      {blocked ? (
        <p className="t-footnote text-center text-[var(--text-muted)]" id="kyc-next-blocked">
          {blocked}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {onBack ? (
          <Button className="sm:w-auto" disabled={loading} onClick={onBack} size="lg" type="button" variant="ghost">
            {kycCopy.back}
          </Button>
        ) : null}
        <Button
          aria-describedby={blocked ? 'kyc-next-blocked' : undefined}
          className="w-full sm:flex-1"
          disabled={Boolean(blocked)}
          loading={loading}
          onClick={nextType === 'button' ? onNext : undefined}
          size="lg"
          type={nextType}
          variant="primary"
        >
          {nextLabel}
          {loading ? null : <ArrowRight aria-hidden className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
