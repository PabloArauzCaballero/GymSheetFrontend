'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { publicFacilitiesClient } from '@/features/public-facilities/services/public-facilities-client';
import { socialService } from '@/features/social/services/social-service';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import {
  Skeleton,
} from '@/shared/components/feedback/skeleton';
import { Field } from '@/shared/components/ui/field';
import { Select } from '@/shared/components/ui/select';
import { notify } from '@/shared/notifications';
import { DirectorySwipeDeck } from './directory-swipe-deck';
import { trainingGoalLabels } from './directory-labels';

export function DirectoryTab() {
  const queryClient = useQueryClient();
  const [objetivo, setObjetivo] = useState('');
  const [sucursalId, setSucursalId] = useState('');
  const filters = useMemo(
    () => ({ objetivo: objetivo || undefined, sucursalId: sucursalId || undefined, limit: 50 }),
    [objetivo, sucursalId],
  );

  const branches = useQuery({
    queryKey: ['facilities', 'public-branches'],
    queryFn: () => publicFacilitiesClient.branches(),
    staleTime: 5 * 60_000,
  });
  const filterKey = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => entry[1] !== undefined),
  ).toString();

  const directory = useQuery({
    queryKey: queryKeys.gymDirectory(filterKey),
    queryFn: () => socialService.directory(filters),
  });

  const connect = useMutation({
    mutationFn: (userId: string) => socialService.sendConnection(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.gymDirectory(filterKey) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      notify.success('Solicitud enviada.');
    },
    onError: (error: Error) => notify.error(error),
  });

  // Descubrimiento: solo entra a la cola quien todavía no tiene ninguna
  // relación. Quien ya está conectado o con una solicitud pendiente vive en
  // "Solicitudes"/"Mis conexiones" — verlo también acá sería la misma persona
  // en dos sitios sin ninguna acción nueva que tomar.
  const discoverable = (directory.data ?? []).filter((entry) => entry.connectionStatus === 'NONE');

  return (
    <div className="grid gap-6">
      <section className="panel grid gap-4 p-4 sm:grid-cols-2">
        <Field htmlFor="directory-objetivo" label="Objetivo">
          <Select
            id="directory-objetivo"
            onChange={(event) => setObjetivo(event.target.value)}
            value={objetivo}
          >
            <option value="">Todos</option>
            {Object.entries(trainingGoalLabels).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor="directory-sucursal" label="Sucursal">
          <Select
            id="directory-sucursal"
            onChange={(event) => setSucursalId(event.target.value)}
            value={sucursalId}
          >
            <option value="">Todos</option>
            {(branches.data ?? []).map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.nombre}
              </option>
            ))}
          </Select>
        </Field>
      </section>
      {directory.isLoading ? (
        <Skeleton className="mx-auto h-[26rem] w-full max-w-md rounded-[var(--radius-lg)]" />
      ) : directory.isError ? (
        <ErrorPanel message={directory.error.message} onRetry={() => directory.refetch()} />
      ) : (
        <DirectorySwipeDeck
          entries={discoverable}
          key={filterKey}
          likePending={connect.isPending}
          onLike={(userId) => {
            connect.mutate(userId);
          }}
        />
      )}
    </div>
  );
}
