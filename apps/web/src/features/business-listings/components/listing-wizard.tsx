'use client';

import { EMPTY_LISTING_FORM, hasListingDetail, listingChip, listingPayload, stepErrors, type ListingForm, type ListingFormErrors } from '@gymsheet/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { EntityType } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { businessService } from '@/features/business/services/business-client';
import { listingErrorText } from '../lib/listing-errors';
import { businessListingsService, photoForm } from '../services/listings-client';
import { ListingDetailFields, ListingTextFields } from './listing-fields';
import { ListingKindStep } from './listing-kind-step';
import { PhotoPicker } from './photo-picker';

type Step = 1 | 2 | 3 | 4;
const TITLES: Readonly<Record<Step, { title: string; description: string }>> = {
  1: { title: '¿Qué vas a publicar?', description: 'Elige el tipo: decide qué datos te pedimos.' },
  2: { title: 'Añade fotos', description: 'Una buena portada vende más. Puedes saltarlo y subirlas después.' },
  3: { title: 'Nombre y precio', description: 'Lo primero que lee quien compra.' },
  4: { title: 'Detalle', description: 'Lo que dura o incluye.' },
};

/**
 * «Nueva publicación» in four steps (plan §4.2): tipo → fotos → nombre y
 * precio → detalle → Publicar. Photos wait in the browser until the listing
 * exists, then go one by one; a failed photo never loses the listing.
 */
export function ListingWizard({ entityType }: Readonly<{ entityType: EntityType | null }>) {
  const router = useRouter();
  const client = useQueryClient();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<ListingForm>(EMPTY_LISTING_FORM);
  const [photos, setPhotos] = useState<File[]>([]);
  const [errors, setErrors] = useState<ListingFormErrors>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const lastStep: Step = form.offerKind && !hasListingDetail(form.offerKind) ? 3 : 4;
  const categories = useQuery({
    queryKey: queryKeys.business.categories(entityType ?? 'STORE'),
    queryFn: () => businessService.categories(entityType ?? 'STORE'),
    enabled: form.offerKind === 'PRODUCT',
  });

  // A new step moves the focus to its title: keyboard and screen reader users start there.
  useEffect(() => {
    if (mounted.current) heading.current?.focus();
    mounted.current = true;
  }, [step]);

  const publish = useMutation({
    mutationFn: async () => {
      const payload = listingPayload(form);
      if (!payload) throw new Error('Revisa los datos de la publicación.');
      let listing = await businessListingsService.create(payload);
      let failed = 0;
      for (const file of photos) {
        try {
          listing = await businessListingsService.addPhoto(listing.id, photoForm(file));
        } catch {
          failed += 1;
        }
      }
      return { listing, failed };
    },
    onSuccess: async ({ listing, failed }) => {
      await client.invalidateQueries({ queryKey: queryKeys.business.listings });
      const chip = listingChip(listing);
      notify.success(listing.visibility === 'PUBLIC' ? 'Publicada. Ya se ve en el marketplace.' : `Guardada: ${chip.label}.`);
      if (failed > 0) notify.warning(failed === 1 ? 'Una foto no se pudo subir. Súbela de nuevo.' : `${failed} fotos no se pudieron subir. Súbelas de nuevo.`);
      router.push(`/negocio/publicaciones/${listing.id}`);
    },
    onError: (error) => notify.error(listingErrorText(error)),
  });

  const patch = (next: Partial<ListingForm>) => setForm((current) => ({ ...current, ...next }));
  function next() {
    const found = stepErrors(form, step);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (step === lastStep) publish.mutate();
    else setStep((step + 1) as Step);
  }

  return (
    <form
      aria-labelledby="listing-step-title"
      className="grid gap-6 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-6 shadow-[var(--shadow-md)] sm:p-8"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        next();
      }}
    >
      <header className="grid gap-1">
        <p aria-live="polite" className="data-label">
          Paso {step} de {lastStep}
        </p>
        <h1 className="title-text outline-none" id="listing-step-title" ref={heading} tabIndex={-1}>
          {TITLES[step].title}
        </h1>
        <p className="t-subhead text-[var(--text-muted)]">{TITLES[step].description}</p>
      </header>
      {step === 1 ? <ListingKindStep entityType={entityType} onChange={(offerKind) => patch({ offerKind })} value={form.offerKind} /> : null}
      {step === 2 ? <PhotoPicker files={photos} onChange={setPhotos} /> : null}
      {step === 3 ? <ListingTextFields errors={errors} form={form} onChange={patch} /> : null}
      {step === 4 ? <ListingDetailFields categories={categories.data ?? []} errors={errors} form={form} onChange={patch} /> : null}
      {errors.offerKind ? (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          {errors.offerKind}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {step > 1 ? (
          <Button disabled={publish.isPending} onClick={() => setStep((step - 1) as Step)} type="button" variant="ghost">
            Atrás
          </Button>
        ) : (
          <span />
        )}
        <Button loading={publish.isPending} size="lg" type="submit" variant="primary">
          {step === lastStep ? 'Publicar' : step === 2 && photos.length === 0 ? 'Saltar' : 'Continuar'}
        </Button>
      </div>
    </form>
  );
}
