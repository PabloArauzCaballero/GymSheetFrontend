'use client';

import { formatPrice, listingFormCopy, parsePriceInput } from '@gymsheet/domain';
import { useState } from 'react';
import type { OwnListing } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { useListingWrite } from '../hooks/use-listing-write';
import { businessListingsService } from '../services/listings-client';

/** Price (its own route, with history) and, for a product, the stock. Numeric keyboards. */
export function ListingPriceStock({ listing, locked }: Readonly<{ listing: OwnListing; locked: boolean }>) {
  const [price, setPrice] = useState(listing.price.replace(/\.00$/u, ''));
  const [stock, setStock] = useState(listing.stockQuantity === null ? '' : String(listing.stockQuantity));
  const [priceError, setPriceError] = useState<string | undefined>();
  const [stockError, setStockError] = useState<string | undefined>();
  const changePrice = useListingWrite(listing.id, (value: number) => businessListingsService.changePrice(listing.id, value), 'Precio actualizado.');
  const changeStock = useListingWrite(
    listing.id,
    (value: number | null) => businessListingsService.changeStock(listing.id, value),
    'Stock actualizado.',
  );
  const archived = listing.status === 'ARCHIVED';

  function savePrice() {
    const value = parsePriceInput(price);
    setPriceError(value === null ? listingFormCopy.priceInvalid : undefined);
    if (value !== null) changePrice.mutate(value);
  }
  function saveStock() {
    const text = stock.trim();
    const valid = text === '' || /^\d{1,7}$/u.test(text);
    setStockError(valid ? undefined : listingFormCopy.stockInvalid);
    if (valid) changeStock.mutate(text === '' ? null : Number(text));
  }

  return (
    <section aria-labelledby="listing-price" className="grid gap-4">
      <h2 className="t-headline" id="listing-price">
        Precio{listing.offerKind === 'PRODUCT' ? ' y stock' : ''}
      </h2>
      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field error={priceError} hint={`Ahora: ${formatPrice(listing.price, listing.currency)}.`} label="Precio en bolivianos">
          <Input autoComplete="off" disabled={locked || archived} inputMode="decimal" onChange={(event) => setPrice(event.target.value)} value={price} />
        </Field>
        <Button disabled={locked || archived} loading={changePrice.isPending} onClick={savePrice} type="button">
          Cambiar precio
        </Button>
      </div>
      {listing.offerKind === 'PRODUCT' ? (
        <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Field
            error={stockError}
            hint={listing.stockReserved > 0 ? `${listing.stockReserved} reservadas en pedidos.` : 'Vacío: no llevas la cuenta.'}
            label="Unidades en stock"
          >
            <Input autoComplete="off" disabled={archived} inputMode="numeric" onChange={(event) => setStock(event.target.value)} value={stock} />
          </Field>
          <Button disabled={archived} loading={changeStock.isPending} onClick={saveStock} type="button">
            Guardar stock
          </Button>
        </div>
      ) : null}
    </section>
  );
}
