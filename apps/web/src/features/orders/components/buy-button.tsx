'use client';

import { orderCopy } from '@gymsheet/domain';
import { ShoppingBag } from 'lucide-react';
import type { PublicListing } from '@/shared/api/schemas';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import type { Viewer } from '@/features/business-listings/components/public/report-button';
import { CheckoutForm } from './checkout-form';

/**
 * «Comprar» on a public listing (franja 8d). A visitor signs in and comes back
 * here; a business account does not buy (the backend refuses it with 403); a
 * product without stock cannot be ordered.
 */
export function BuyButton({ listing, viewer }: Readonly<{ listing: PublicListing; viewer: Viewer }>) {
  if (viewer === 'anonymous') {
    return (
      <ButtonLink className="w-full" href={`/login?returnTo=${encodeURIComponent(`/publicacion/${listing.id}`)}`} size="lg" variant="primary">
        <ShoppingBag aria-hidden className="size-5" />
        {orderCopy.signIn}
      </ButtonLink>
    );
  }
  const blocked = viewer === 'business' ? orderCopy.businessOnly : listing.inStock === false ? 'Sin stock: no se puede pedir ahora.' : null;
  if (blocked) {
    return (
      <div className="grid gap-1">
        <Button aria-describedby="buy-blocked" className="w-full" disabled size="lg" variant="primary">
          <ShoppingBag aria-hidden className="size-5" />
          {orderCopy.buy}
        </Button>
        <p className="t-footnote text-center text-[var(--text-muted)]" id="buy-blocked">{blocked}</p>
      </div>
    );
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg" variant="primary">
          <ShoppingBag aria-hidden className="size-5" />
          {orderCopy.buy}
        </Button>
      </DialogTrigger>
      <DialogContent description="Revisa lo que compras y elige cómo pagas." title={orderCopy.confirmTitle}>
        <CheckoutForm listing={listing} />
      </DialogContent>
    </Dialog>
  );
}
