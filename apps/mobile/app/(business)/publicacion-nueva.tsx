import { EMPTY_LISTING_FORM, hasListingDetail, listingChip, listingPayload, stepErrors, type ListingForm, type ListingFormErrors } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { listingLimits } from '@gymsheet/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import type { LocalFile } from '@/api/local-file-part';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { Text } from '@/components/text';
import { businessService } from '@/features/business/business-service';
import { StepNav } from '@/features/business/kyc/step-nav';
import { KindCards } from '@/features/business-listings/kind-cards';
import { ListingDetailFields, ListingTextFields } from '@/features/business-listings/listing-fields';
import { listingErrorText, listingsService, photoForm, pickPhotos } from '@/features/business-listings/listings-service';
import { PhotoStrip } from '@/features/business-listings/photo-strip';
import { notify } from '@/notifications';

type Step = 1 | 2 | 3 | 4;
const TITLES: Readonly<Record<Step, { title: string; description: string }>> = {
  1: { title: '¿Qué vas a publicar?', description: 'Elige el tipo: decide qué datos te pedimos.' },
  2: { title: 'Añade fotos', description: 'Una buena portada vende más. Puedes saltarlo y subirlas después.' },
  3: { title: 'Nombre y precio', description: 'Lo primero que lee quien compra.' },
  4: { title: 'Detalle', description: 'Lo que dura o incluye.' },
};

/**
 * «Nueva publicación» in four steps (plan §4.2): tipo → fotos → nombre y
 * precio → detalle → Publicar. The photos wait on the phone until the
 * listing exists and then go one by one; a failed photo never loses it.
 */
export default function NewListingScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const me = useQuery({ queryKey: queryKeys.business.me, queryFn: businessService.me });
  const entityType = me.data?.entity.entityType ?? null;
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<ListingForm>(EMPTY_LISTING_FORM);
  const [photos, setPhotos] = useState<LocalFile[]>([]);
  const [errors, setErrors] = useState<ListingFormErrors>({});
  const lastStep: Step = form.offerKind && !hasListingDetail(form.offerKind) ? 3 : 4;
  const categories = useQuery({
    queryKey: queryKeys.business.categories(entityType ?? 'STORE'),
    queryFn: () => businessService.categories(entityType ?? 'STORE'),
    enabled: form.offerKind === 'PRODUCT',
  });

  const publish = useMutation({
    mutationFn: async () => {
      const payload = listingPayload(form);
      if (!payload) throw new Error('Revisa los datos de la publicación.');
      let listing = await listingsService.create(payload);
      let failed = 0;
      for (const file of photos) {
        try {
          listing = await listingsService.addPhoto(listing.id, await photoForm(file));
        } catch {
          failed += 1;
        }
      }
      return { listing, failed };
    },
    onSuccess: async ({ listing, failed }) => {
      await client.invalidateQueries({ queryKey: queryKeys.business.listings });
      notify.success(listing.visibility === 'PUBLIC' ? 'Publicada. Ya se ve en el marketplace.' : `Guardada: ${listingChip(listing).label}.`);
      if (failed > 0) notify.warning(failed === 1 ? 'Una foto no se pudo subir. Súbela de nuevo.' : `${failed} fotos no se pudieron subir. Súbelas de nuevo.`);
      router.replace({ pathname: '/(business)/publicacion/[id]', params: { id: listing.id } });
    },
    onError: (error) => notify.error(listingErrorText(error)),
  });

  async function addPhotos() {
    const picked = await pickPhotos(listingLimits.mediaMax - photos.length);
    if (picked.refused > 0) notify.warning('Solo se aceptan fotos JPG o PNG de hasta 8 MB.');
    if (picked.files.length > 0) setPhotos((current) => [...current, ...picked.files].slice(0, listingLimits.mediaMax));
  }

  const patch = (next: Partial<ListingForm>) => setForm((current) => ({ ...current, ...next }));
  function next() {
    const found = stepErrors(form, step);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (step === lastStep) publish.mutate();
    else setStep((step + 1) as Step);
  }
  const back = () => (step === 1 ? router.back() : setStep((step - 1) as Step));

  return (
    <ScrollScreen>
      <ScreenHeader detail subtitle={TITLES[step].description} title={TITLES[step].title} />
      <Text accessibilityLiveRegion="polite" tone="secondary" variant="footnote">
        Paso {step} de {lastStep}
      </Text>
      {step === 1 ? <KindCards entityType={entityType} onChange={(offerKind) => patch({ offerKind })} value={form.offerKind} /> : null}
      {step === 2 ? (
        <PhotoStrip
          canAdd={photos.length < listingLimits.mediaMax}
          label="Fotos elegidas"
          onAdd={() => void addPhotos()}
          onRemove={(index) => setPhotos((current) => current.filter((_, position) => position !== index))}
          uris={photos.map((file) => file.uri)}
        />
      ) : null}
      {step === 3 ? <ListingTextFields errors={errors} form={form} onChange={patch} /> : null}
      {step === 4 ? <ListingDetailFields categories={categories.data ?? []} errors={errors} form={form} onChange={patch} /> : null}
      {errors.offerKind ? (
        <Text accessibilityLiveRegion="polite" tone="danger" variant="subhead">
          {errors.offerKind}
        </Text>
      ) : null}
      <StepNav
        loading={publish.isPending}
        nextLabel={step === lastStep ? 'Publicar' : step === 2 && photos.length === 0 ? 'Saltar' : 'Continuar'}
        onBack={back}
        onNext={next}
      />
    </ScrollScreen>
  );
}
