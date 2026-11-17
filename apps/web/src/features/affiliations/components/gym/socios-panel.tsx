'use client';

import { affiliationCopy } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { AffiliationKind } from '@/shared/api/schemas';
import { PageHeader } from '@/shared/components/layout/page-header';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { Select } from '@/shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { businessListingsService } from '@/features/business-listings/services/listings-client';
import { gymAffiliationsService } from '../../services/affiliations-client';
import { AffiliationList } from './affiliation-list';
import { usePendingAffiliationsCount } from './socios-badge';

const KIND_FILTERS: ReadonlyArray<{ value: AffiliationKind | ''; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'SOCIO', label: 'Socios' },
  { value: 'ENTRENADOR', label: 'Entrenadores' },
];

/**
 * «Socios» of a GYM business (plan §4.2): Solicitudes (oldest first) to
 * confirm or reject, Socios by sede and Entrenadores (persons and coaches).
 */
export function SociosPanel() {
  const [tab, setTab] = useState('requests');
  const [kind, setKind] = useState<AffiliationKind | ''>('');
  const [locationId, setLocationId] = useState('');
  const pending = usePendingAffiliationsCount(true);
  const locations = useQuery({ queryKey: queryKeys.business.locations, queryFn: businessListingsService.locations });
  const sedes = locations.data ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader description="Confirma a quien entrena aquí. Compara los 3 dígitos del CI con tu registro." title={affiliationCopy.socios} />
      <Tabs onValueChange={setTab} value={tab}>
        <TabsList aria-label="Secciones de socios">
          <TabsTrigger value="requests">
            {affiliationCopy.requests}
            {pending > 0 ? <span className="ml-2 inline-grid min-w-6 place-items-center rounded-full bg-[var(--text)] px-1.5 text-xs font-semibold tabular-nums text-[var(--background)]">{pending}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="members">{affiliationCopy.members}</TabsTrigger>
          <TabsTrigger value="coaches">{affiliationCopy.coaches}</TabsTrigger>
        </TabsList>

        {tab !== 'coaches' ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {sedes.length > 1 ? (
              <Select aria-label="Sede" className="w-auto min-w-48" onChange={(event) => setLocationId(event.target.value)} value={locationId}>
                <option value="">Todas las sedes</option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.name}
                  </option>
                ))}
              </Select>
            ) : null}
            {tab === 'requests' ? (
              <div aria-label="Tipo" className="flex flex-wrap gap-2" role="group">
                {KIND_FILTERS.map((option) => (
                  <ChoiceChip key={option.label} onClick={() => setKind(option.value)} selected={kind === option.value}>
                    {option.label}
                  </ChoiceChip>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <TabsContent className="mt-5" value="requests">
          <AffiliationList
            empty={affiliationCopy.emptyRequests}
            load={(cursor) => gymAffiliationsService.requests({ kind: kind || null, locationId: locationId || null, cursor })}
            queryKey={queryKeys.business.affiliationRequests(kind, locationId)}
          />
        </TabsContent>
        <TabsContent className="mt-5" value="members">
          <AffiliationList
            empty={affiliationCopy.emptyMembers}
            load={(cursor) => gymAffiliationsService.members({ locationId: locationId || null, cursor })}
            queryKey={queryKeys.business.affiliationMembers(locationId)}
          />
        </TabsContent>
        <TabsContent className="mt-5" value="coaches">
          <AffiliationList empty={affiliationCopy.emptyCoaches} load={(cursor) => gymAffiliationsService.coaches({ cursor })} queryKey={queryKeys.business.affiliationCoaches} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
