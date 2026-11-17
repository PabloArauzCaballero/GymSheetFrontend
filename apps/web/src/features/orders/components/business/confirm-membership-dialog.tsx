'use client';

import { orderCopy, subscriptionCopy } from '@gymsheet/domain';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';

/**
 * Confirming a gym's MEMBERSHIP (ADR-0026): the payment and, checked by
 * default, «También confirmo que es socio» in the same transaction. A gym
 * REPP suspended answers 409 GYM_NOT_ACTIVE: we say why and offer the
 * payment alone.
 */
export function ConfirmMembershipDialog({
  open,
  pending,
  gymNotActive,
  onConfirm,
  onClose,
}: Readonly<{ open: boolean; pending: boolean; gymNotActive: boolean; onConfirm: (alsoConfirmAffiliation: boolean) => void; onClose: () => void }>) {
  const [alsoSocio, setAlsoSocio] = useState(true);
  const socio = alsoSocio && !gymNotActive;
  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogContent className="max-w-lg" description={orderCopy.confirmBody} title={orderCopy.confirmQuestion}>
        <div className="grid gap-5">
          {gymNotActive ? (
            <p className="rounded-[var(--radius-lg)] bg-[var(--warning-bg)] p-4 text-[var(--warning-text)]" role="alert">
              {subscriptionCopy.gymNotActive}
            </p>
          ) : (
            <div className="grid gap-1">
              <Checkbox checked={alsoSocio} label={<span className="text-[15px] font-semibold text-[var(--text)]">{subscriptionCopy.alsoConfirm}</span>} name="alsoConfirmAffiliation" onChange={(event) => setAlsoSocio(event.target.checked)} />
              <p className="t-footnote pl-8 text-[var(--text-muted)]">{subscriptionCopy.alsoConfirmHint}</p>
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={onClose} type="button" variant="ghost">
              Todavía no
            </Button>
            <Button loading={pending} onClick={() => onConfirm(socio)} type="button" variant="primary">
              {gymNotActive ? subscriptionCopy.confirmPaymentOnly : orderCopy.confirmPayment}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
