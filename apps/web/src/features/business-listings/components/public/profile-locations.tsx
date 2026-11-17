import { hoursSummary, mapsHref } from '@gymsheet/domain';
import { Clock, MapPin } from 'lucide-react';
import type { PublicLocation } from '@/shared/api/schemas';

/** «Sedes» of a public profile: address, hours and, with a pin, a link to open it in a map. */
export function ProfileLocations({ locations }: Readonly<{ locations: PublicLocation[] }>) {
  if (locations.length === 0) return null;
  return (
    <section aria-labelledby="profile-locations" className="grid gap-3">
      <h2 className="t-headline" id="profile-locations">
        {locations.length === 1 ? 'Sede' : 'Sedes'}
      </h2>
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        {locations.map((location) => {
          const hours = hoursSummary(location.businessHours);
          const map = mapsHref(location);
          return (
            <li className="grid gap-1 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3" key={location.id}>
              <p className="font-semibold">{location.name}</p>
              <p className="t-footnote flex items-start gap-1.5 text-[var(--text-muted)]">
                <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                {[location.address, location.city].filter(Boolean).join(', ')}
              </p>
              {hours ? (
                <p className="t-footnote flex items-start gap-1.5 tabular-nums text-[var(--text-muted)]">
                  <Clock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  {hours}
                </p>
              ) : null}
              {map ? (
                <a className="t-footnote inline-flex min-h-11 items-center font-semibold underline underline-offset-4" href={map} rel="noopener noreferrer" target="_blank">
                  Abrir en el mapa
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
