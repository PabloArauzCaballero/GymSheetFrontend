import { EMPTY_LOCATION_FORM, hoursRows, locationCopy, locationFormErrors, locationFormOf, locationPayload, type LocationForm, type LocationFormErrors } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { RowsSkeleton } from '@/components/feedback';
import { ScreenHeader, ScrollScreen } from '@/components/layout';
import { Text } from '@/components/text';
import { Button, Input } from '@/components/ui';
import { StepNav } from '@/features/business/kyc/step-nav';
import { listingErrorText, listingsService } from '@/features/business-listings/listings-service';
import { confirmDelete, notify } from '@/notifications';
import { spacing } from '@/theme';

type Part = 'where' | 'pin' | 'hours';
const PARTS: readonly Part[] = ['where', 'pin', 'hours'];
const FIELDS: Readonly<Record<Part, ReadonlyArray<keyof LocationFormErrors>>> = { where: ['name', 'city'], pin: ['pin'], hours: ['hours'] };
const TITLES: Readonly<Record<Part, string>> = { where: '¿Dónde atiendes?', pin: 'En el mapa', hours: 'Horario' };

function LocationEditor({ initial, locationId }: { initial: LocationForm; locationId: string | null }) {
  const router = useRouter();
  const client = useQueryClient();
  const [form, setForm] = useState(initial);
  const [part, setPart] = useState<Part>('where');
  const [errors, setErrors] = useState<LocationFormErrors>({});
  const index = PARTS.indexOf(part);
  const done = async (message: string) => {
    notify.success(message);
    await client.invalidateQueries({ queryKey: queryKeys.business.locations });
    router.back();
  };
  const save = useMutation({
    mutationFn: () => {
      const payload = locationPayload(form);
      if (!payload) throw new Error('Revisa los datos de la sede.');
      return locationId ? listingsService.updateLocation(locationId, payload) : listingsService.createLocation(payload);
    },
    onSuccess: () => done(locationId ? 'Sede actualizada.' : 'Sede añadida.'),
    onError: (error) => notify.error(listingErrorText(error)),
  });
  const remove = useMutation({
    mutationFn: () => listingsService.deleteLocation(locationId ?? ''),
    onSuccess: () => done('Sede quitada.'),
    onError: (error) => notify.error(listingErrorText(error)),
  });
  const patch = (next: Partial<LocationForm>) => setForm((current) => ({ ...current, ...next }));
  const hour = (row: (typeof hoursRows)[number]['id'], key: 'open' | 'close', value: string) =>
    setForm((current) => ({ ...current, hours: { ...current.hours, [row]: { ...current.hours[row], [key]: value } } }));

  function next() {
    const all = locationFormErrors(form);
    const found = Object.fromEntries(FIELDS[part].filter((key) => all[key]).map((key) => [key, all[key]]));
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (index === PARTS.length - 1) save.mutate();
    else setPart(PARTS[index + 1] as Part);
  }
  async function askRemove() {
    const answer = await confirmDelete({ entity: `la sede «${initial.name}»` });
    if (answer.confirmed) remove.mutate();
  }

  return (
    <ScrollScreen>
      <ScreenHeader detail subtitle={`Paso ${index + 1} de ${PARTS.length}`} title={TITLES[part]} />
      {part === 'where' ? (
        <View style={{ gap: spacing.md }}>
          <Input error={errors.name} label="Nombre de la sede" maxLength={120} onChangeText={(name) => patch({ name })} placeholder="Sede Centro" value={form.name} />
          <Input autoComplete="postal-address-locality" error={errors.city} label="Ciudad" maxLength={100} onChangeText={(city) => patch({ city })} value={form.city} />
          <Input autoComplete="street-address" label="Dirección (opcional)" maxLength={500} onChangeText={(address) => patch({ address })} value={form.address} />
          <Text tone="secondary" variant="footnote">
            {locationCopy.addressPublic}
          </Text>
        </View>
      ) : null}
      {part === 'pin' ? (
        <View style={{ gap: spacing.md }}>
          <Text tone="secondary" variant="subhead">
            {locationCopy.pinHint}
          </Text>
          <Input error={errors.pin} keyboardType="numbers-and-punctuation" label="Latitud" onChangeText={(latitude) => patch({ latitude })} placeholder="-16.5000" value={form.latitude} />
          <Input keyboardType="numbers-and-punctuation" label="Longitud" onChangeText={(longitude) => patch({ longitude })} placeholder="-68.1500" value={form.longitude} />
        </View>
      ) : null}
      {part === 'hours' ? (
        <View style={{ gap: spacing.md }}>
          <Text tone="secondary" variant="subhead">
            Deja la fila vacía si ese día cierras.
          </Text>
          {hoursRows.map((row) => (
            <View key={row.id} style={{ gap: spacing.xs }}>
              <Text strong variant="subhead">
                {row.label}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Input keyboardType="numbers-and-punctuation" label="Abre" onChangeText={(value) => hour(row.id, 'open', value)} placeholder="07:00" value={form.hours[row.id].open} />
                </View>
                <View style={{ flex: 1 }}>
                  <Input keyboardType="numbers-and-punctuation" label="Cierra" onChangeText={(value) => hour(row.id, 'close', value)} placeholder="21:00" value={form.hours[row.id].close} />
                </View>
              </View>
            </View>
          ))}
          {errors.hours ? (
            <Text accessibilityLiveRegion="polite" tone="danger" variant="footnote">
              {errors.hours}
            </Text>
          ) : null}
        </View>
      ) : null}
      <StepNav
        loading={save.isPending}
        nextLabel={index === PARTS.length - 1 ? 'Guardar sede' : 'Continuar'}
        onBack={() => (index === 0 ? router.back() : setPart(PARTS[index - 1] as Part))}
        onNext={next}
      />
      {locationId && part === 'where' ? <Button label="Quitar sede" loading={remove.isPending} onPress={() => void askRemove()} variant="danger" /> : null}
    </ScrollScreen>
  );
}

/** A location of the business: new, or the one `id` names (from the cached list of «Perfil»). */
export default function LocationScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const locations = useQuery({ queryKey: queryKeys.business.locations, queryFn: listingsService.locations, enabled: Boolean(id) });
  if (id && locations.isPending) {
    return (
      <ScrollScreen>
        <RowsSkeleton rows={3} thumb={0} />
      </ScrollScreen>
    );
  }
  const location = id ? locations.data?.find((item) => item.id === id) : undefined;
  return <LocationEditor initial={location ? locationFormOf(location) : EMPTY_LOCATION_FORM} locationId={location?.id ?? null} />;
}
