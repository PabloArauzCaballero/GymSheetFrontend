import { hoursSummary } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { listingLimits } from '@gymsheet/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ErrorState, RowsSkeleton } from '@/components/feedback';
import { Card, Divider, ScreenHeader, ScrollScreen } from '@/components/layout';
import { NavRow } from '@/components/list';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { businessService } from '@/features/business/business-service';
import { listingErrorText, listingsService, photoForm, pickPhotos } from '@/features/business-listings/listings-service';
import { PhotoStrip } from '@/features/business-listings/photo-strip';
import { confirmDelete, notify } from '@/notifications';
import { spacing } from '@/theme';

/** «Perfil» of the business shell (plan §4.2): the way to «Cobro» (8d), sedes and the photos of the public profile (8c). */
export default function BusinessProfileScreen() {
  const router = useRouter();
  const client = useQueryClient();
  const me = useQuery({ queryKey: queryKeys.business.me, queryFn: businessService.me });
  const locations = useQuery({ queryKey: queryKeys.business.locations, queryFn: listingsService.locations });
  const gallery = me.data?.entity.gallery ?? [];
  const setGallery = (next: string[]) =>
    client.setQueryData(queryKeys.business.me, (current: typeof me.data) => (current ? { ...current, entity: { ...current.entity, gallery: next } } : current));
  const add = useMutation({
    mutationFn: async (form: FormData) => listingsService.addGalleryPhoto(form),
    onSuccess: (result) => {
      setGallery(result.gallery);
      notify.success('Foto añadida a tu perfil.');
    },
    onError: (error) => notify.error(listingErrorText(error)),
  });
  const remove = useMutation({
    mutationFn: (position: number) => listingsService.removeGalleryPhoto(position),
    onSuccess: (result) => {
      setGallery(result.gallery);
      notify.success('Foto quitada.');
    },
    onError: (error) => notify.error(listingErrorText(error)),
  });
  const handle = me.data?.handle?.status === 'ACTIVE' ? me.data.handle.handle : null;

  async function addPhoto() {
    const picked = await pickPhotos(1);
    if (picked.refused > 0) notify.warning('Solo se aceptan fotos JPG o PNG de hasta 8 MB.');
    const file = picked.files[0];
    if (file) add.mutate(await photoForm(file));
  }
  async function askRemove(position: number) {
    const answer = await confirmDelete({ entity: `la foto ${position + 1} de tu perfil` });
    if (answer.confirmed) remove.mutate(position);
  }

  return (
    <ScrollScreen onRefresh={() => void Promise.all([me.refetch(), locations.refetch()])} refreshing={me.isRefetching || locations.isRefetching}>
      <ScreenHeader subtitle={handle ? `@${handle}` : 'Dónde atiendes y cómo se ve tu negocio.'} title="Perfil" />
      <Card list>
        <NavRow onPress={() => router.push('/(business)/cobro')} subtitle="Tu banco, tu QR y si aceptas efectivo" testID="business-payments" title="Cobro" />
      </Card>
      <Card list>
        <View style={{ paddingVertical: spacing.sm }}>
          <Text accessibilityRole="header" variant="headline">
            Sedes
          </Text>
        </View>
        {locations.isPending ? (
          <RowsSkeleton rows={2} thumb={0} />
        ) : locations.isError ? (
          <ErrorState error={locations.error} onRetry={() => void locations.refetch()} />
        ) : locations.data.length === 0 ? (
          <Text tone="secondary" variant="subhead">
            Añade dónde atiendes: sale en tu perfil público con su horario.
          </Text>
        ) : (
          locations.data.map((location, index) => (
            <View key={location.id}>
              {index > 0 ? <Divider /> : null}
              <NavRow
                onPress={() => router.push({ pathname: '/(business)/sede', params: { id: location.id } })}
                subtitle={[location.address, location.city, hoursSummary(location.businessHours)].filter(Boolean).join(' · ')}
                title={location.name}
              />
            </View>
          ))
        )}
      </Card>
      <Button icon="add" label="Añadir sede" onPress={() => router.push('/(business)/sede')} variant="secondary" />
      <Card>
        <Text accessibilityRole="header" variant="headline">
          Fotos del perfil
        </Text>
        <PhotoStrip
          busy={add.isPending || remove.isPending}
          canAdd={gallery.length < listingLimits.galleryMax}
          label="Fotos del perfil"
          onAdd={() => void addPhoto()}
          onRemove={(position) => void askRemove(position)}
          uris={gallery}
        />
      </Card>
    </ScrollScreen>
  );
}
