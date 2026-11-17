import { formatPrice, listingActions, listingFormCopy, listingFormErrors, listingFormOf, listingPatch, parsePriceInput, type ListingForm, type ListingFormErrors } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import type { EntityType, OwnListing } from '@gymsheet/schemas';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { Card } from '@/components/layout';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { businessService } from '@/features/business/business-service';
import { confirm } from '@/notifications';
import { spacing } from '@/theme';
import { ListingDetailFields, ListingTextFields } from './listing-fields';
import { listingsService } from './listings-service';
import { useListingWrite } from './use-listing-write';

/** «Datos»: name, text, benefits and the kind's detail. Frozen while REPP holds the listing. */
export function ListingContentSection({ listing, entityType, locked }: { listing: OwnListing; entityType: EntityType | null; locked: boolean }) {
  const [form, setForm] = useState<ListingForm>(() => listingFormOf(listing));
  const [errors, setErrors] = useState<ListingFormErrors>({});
  const save = useListingWrite(listing.id, (patch: NonNullable<ReturnType<typeof listingPatch>>) => listingsService.update(listing.id, patch), 'Cambios guardados.');
  const categories = useQuery({
    queryKey: queryKeys.business.categories(entityType ?? 'STORE'),
    queryFn: () => businessService.categories(entityType ?? 'STORE'),
    enabled: listing.offerKind === 'PRODUCT',
  });
  const disabled = locked || listing.status === 'ARCHIVED';
  const patch = (next: Partial<ListingForm>) => setForm((current) => ({ ...current, ...next }));
  function submit() {
    // The saved price stands in: this form does not change it.
    setErrors(listingFormErrors({ ...form, price: listing.price }));
    const body = listingPatch({ ...form, price: listing.price });
    if (body) save.mutate(body);
  }
  return (
    <Card>
      <Text accessibilityRole="header" variant="headline">
        Datos
      </Text>
      <ListingTextFields disabled={disabled} errors={errors} form={form} onChange={patch} withPrice={false} />
      <ListingDetailFields categories={categories.data ?? []} disabled={disabled} errors={errors} form={form} onChange={patch} withStock={false} />
      <Button disabled={disabled} label="Guardar cambios" loading={save.isPending} onPress={submit} variant="secondary" />
    </Card>
  );
}

/** Price (its own route, with history) and, for a product, the stock. */
export function ListingPriceSection({ listing, locked }: { listing: OwnListing; locked: boolean }) {
  const [price, setPrice] = useState(listing.price.replace(/\.00$/u, ''));
  const [stock, setStock] = useState(listing.stockQuantity === null ? '' : String(listing.stockQuantity));
  const [priceError, setPriceError] = useState<string | undefined>();
  const [stockError, setStockError] = useState<string | undefined>();
  const changePrice = useListingWrite(listing.id, (value: number) => listingsService.changePrice(listing.id, value), 'Precio actualizado.');
  const changeStock = useListingWrite(listing.id, (value: number | null) => listingsService.changeStock(listing.id, value), 'Stock actualizado.');
  const archived = listing.status === 'ARCHIVED';
  return (
    <Card>
      <Text accessibilityRole="header" variant="headline">
        {listing.offerKind === 'PRODUCT' ? 'Precio y stock' : 'Precio'}
      </Text>
      <Input editable={!locked && !archived} error={priceError} keyboardType="decimal-pad" label={`Precio en Bs (ahora ${formatPrice(listing.price, listing.currency)})`} onChangeText={setPrice} value={price} />
      <Button
        disabled={locked || archived}
        label="Cambiar precio"
        loading={changePrice.isPending}
        onPress={() => {
          const value = parsePriceInput(price);
          setPriceError(value === null ? listingFormCopy.priceInvalid : undefined);
          if (value !== null) changePrice.mutate(value);
        }}
        variant="secondary"
      />
      {listing.offerKind === 'PRODUCT' ? (
        <View style={{ gap: spacing.md }}>
          <Input
            editable={!archived}
            error={stockError}
            keyboardType="number-pad"
            label={listing.stockReserved > 0 ? `Unidades en stock (${listing.stockReserved} reservadas)` : 'Unidades en stock (vacío: sin control)'}
            onChangeText={setStock}
            value={stock}
          />
          <Button
            disabled={archived}
            label="Guardar stock"
            loading={changeStock.isPending}
            onPress={() => {
              const text = stock.trim();
              const valid = text === '' || /^\d{1,7}$/u.test(text);
              setStockError(valid ? undefined : listingFormCopy.stockInvalid);
              if (valid) changeStock.mutate(text === '' ? null : Number(text));
            }}
            variant="secondary"
          />
        </View>
      ) : null}
    </Card>
  );
}

/** Pause, resume and archive (terminal, confirmed first). Open even while REPP holds the listing. */
export function ListingStateSection({ listing }: { listing: OwnListing }) {
  const actions = listingActions(listing.status);
  const pause = useListingWrite(listing.id, () => listingsService.pause(listing.id), 'Pausada: nadie la ve hasta que la reanudes.');
  const resume = useListingWrite(listing.id, () => listingsService.resume(listing.id), 'Reanudada.');
  const archive = useListingWrite(listing.id, () => listingsService.archive(listing.id), 'Archivada.');
  const busy = pause.isPending || resume.isPending || archive.isPending;
  if (!actions.pause && !actions.resume && !actions.archive) return null;
  async function askArchive() {
    const answer = await confirm({
      title: '¿Archivar la publicación?',
      message: 'Sale del marketplace y ya no se puede volver a publicar ni editar.',
      confirmLabel: 'Archivar',
      severity: 'danger',
    });
    if (answer.confirmed) archive.mutate(undefined);
  }
  return (
    <View style={{ gap: spacing.sm }}>
      {actions.pause ? <Button disabled={busy} icon="pause" label="Pausar" loading={pause.isPending} onPress={() => pause.mutate(undefined)} variant="ghost" /> : null}
      {actions.resume ? <Button disabled={busy} icon="play" label="Reanudar" loading={resume.isPending} onPress={() => resume.mutate(undefined)} variant="ghost" /> : null}
      {actions.archive ? <Button disabled={busy} icon="archive-outline" label="Archivar" loading={archive.isPending} onPress={() => void askArchive()} variant="ghost" /> : null}
    </View>
  );
}
