'use client';

import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

/**
 * Back, skip and continue. Skipping is always one tap away and never looks
 * like an error: the whole Conocer step is optional.
 */
export function ConocerFooter({
  canGoBack,
  continueDisabled = false,
  hideContinue = false,
  isLast,
  onBack,
  onContinue,
  onSkip,
  pending,
  skipping,
}: Readonly<{
  canGoBack: boolean;
  continueDisabled?: boolean;
  /** The preferences substep brings its own save button. */
  hideContinue?: boolean;
  isLast: boolean;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
  pending: boolean;
  skipping: boolean;
}>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button disabled={!canGoBack} onClick={onBack} variant="ghost">
        <ChevronLeft aria-hidden className="size-4" />
        Atrás
      </Button>
      <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
        <Button loading={skipping} onClick={onSkip} variant="secondary">
          Saltar por ahora
        </Button>
        {hideContinue ? null : (
          <Button disabled={continueDisabled} loading={pending} onClick={onContinue} variant="primary">
            {isLast ? <Check aria-hidden className="size-4" /> : null}
            {isLast ? 'Terminar' : 'Continuar'}
            {isLast ? null : <ChevronRight aria-hidden className="size-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
