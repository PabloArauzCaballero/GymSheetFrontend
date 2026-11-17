'use client';

import { EMPTY_LOCATION_FORM, hoursSummary, locationFormOf, locationPayload, type LocationForm } from '@gymsheet/domain';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus } from 'lucide-react';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { BusinessLocation } from '@/shared/api/schemas';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { confirmDelete, notify } from '@/shared/notifications';
import { listingErrorText } from '../lib/listing-errors';
import { businessListingsService } from '../services/listings-client';
import { LocationFormView } from './location-form';

type Editing = { mode: 'create' } | { mode: 'edit'; location: BusinessLocation } | null;

/** «Sedes» of the business profile: list, add, edit and remove (≤ 50). They show on `/@handle`. */
export function LocationsPanel() {
  const client = useQueryClient();
  const [editing, setEditing] = useState<Editing>(null);
  const locations = useQuery({ queryKey: queryKeys.business.locations, queryFn: businessListingsService.locations });
  const refresh = () => client.invalidateQueries({ queryKey: queryKeys.business.locations });
  const save = useMutation({
    mutationFn: (form: LocationForm) => {
      const payload = locationPayload(form);
      if (!payload) throw new Error('Revisa los datos de la sede.');
      return editing?.mode === 'edit' ? businessListingsService.updateLocation(editing.location.id, payload) : businessListingsService.createLocation(payload);
    },
    onSuccess: async () => {
      notify.success(editing?.mode === 'edit' ? 'Sede actualizada.' : 'Sede añadida.');
      setEditing(null);
      await refresh();
    },
    onError: (error) => notify.error(listingErrorText(error)),
  });
  const remove = useMutation({
    mutationFn: (locationId: string) => businessListingsService.deleteLocation(locationId),
    onSuccess: async () => {
      notify.success('Sede quitada.');
      await refresh();
    },
    onError: (error) => notify.error(listingErrorText(error)),
  });

  async function askRemove(location: BusinessLocation) {
    const answer = await confirmDelete({ entity: `la sede «${location.name}»` });
    if (answer.confirmed) remove.mutate(location.id);
  }

  return (
    <section aria-labelledby="business-locations" className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="t-headline" id="business-locations">
          Sedes
        </h2>
        <Button onClick={() => setEditing({ mode: 'create' })} size="sm" type="button" variant="ghost">
          <Plus aria-hidden className="size-4" />
          Añadir sede
        </Button>
      </div>
      {locations.isPending ? (
        <SkeletonList rows={2} withAvatar={false} />
      ) : locations.isError ? (
        <ErrorPanel error={locations.error} message={locations.error.message} onRetry={() => void locations.refetch()} />
      ) : locations.data.length === 0 ? (
        <p className="t-subhead text-[var(--text-muted)]">Añade dónde atiendes: sale en tu perfil público con su horario.</p>
      ) : (
        <ul aria-label="Tus sedes" className="m-0 grid list-none gap-2 p-0">
          {locations.data.map((location) => (
            <li className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] px-4 py-3" key={location.id}>
              <span className="grid min-w-0 gap-0.5">
                <span className="flex items-center gap-1.5 font-semibold">
                  <MapPin aria-hidden className="size-4 text-[var(--text-muted)]" />
                  {location.name}
                </span>
                <span className="t-footnote text-[var(--text-muted)]">{[location.address, location.city].filter(Boolean).join(', ')}</span>
                {hoursSummary(location.businessHours) ? <span className="t-footnote tabular-nums text-[var(--text-muted)]">{hoursSummary(location.businessHours)}</span> : null}
              </span>
              <span className="flex gap-2">
                <Button onClick={() => setEditing({ mode: 'edit', location })} size="sm" type="button" variant="ghost">
                  Editar
                </Button>
                <Button disabled={remove.isPending} onClick={() => void askRemove(location)} size="sm" type="button" variant="ghost">
                  Quitar
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Dialog onOpenChange={(open) => (open ? null : setEditing(null))} open={editing !== null}>
        <DialogContent title={editing?.mode === 'edit' ? 'Editar sede' : 'Nueva sede'}>
          {editing ? (
            <LocationFormView
              initial={editing.mode === 'edit' ? locationFormOf(editing.location) : EMPTY_LOCATION_FORM}
              onCancel={() => setEditing(null)}
              onSave={(form) => save.mutate(form)}
              saving={save.isPending}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
