'use client';

import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { accessAdminService } from '@/features/admin/services/access-admin-service';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { formatDateTime } from '@/shared/lib/date';

export function AccessEventLookup() {
  const [draftId, setDraftId] = useState('');
  const [eventId, setEventId] = useState('');
  const event = useQuery({
    queryKey: ['admin', 'access-event', eventId],
    queryFn: () => accessAdminService.getEvent(eventId),
    enabled: Boolean(eventId),
    retry: false,
  });

  return (
    <Card>
      <CardHeader
        title="Detalle de evento"
        description="Consulta un evento por su UUID cuando necesitas revisar la cola y su decisión asociada."
      />
      <CardContent className="grid gap-4">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(submission) => {
            submission.preventDefault();
            setEventId(draftId.trim());
          }}
        >
          <Field className="flex-1" label="UUID del evento">
            <Input onChange={(event) => setDraftId(event.target.value)} required value={draftId} />
          </Field>
          <Button disabled={!draftId.trim()} type="submit">
            <Search className="size-4" />
            Consultar
          </Button>
        </form>
        {event.isError ? (
          <p className="text-sm text-[var(--danger-text)]" role="alert">
            {event.error.message}
          </p>
        ) : null}
        {event.data ? (
          <dl className="grid gap-3 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="data-label">Origen</dt>
              <dd className="mt-1 break-all">{event.data.eventoOrigenId}</dd>
            </div>
            <div>
              <dt className="data-label">Cola</dt>
              <dd className="mt-1">
                <Badge>{event.data.estadoCola}</Badge>
              </dd>
            </div>
            <div>
              <dt className="data-label">Ocurrió</dt>
              <dd className="mt-1">{formatDateTime(event.data.ocurridoEn)}</dd>
            </div>
            <div>
              <dt className="data-label">Dirección</dt>
              <dd className="mt-1">{event.data.direccion}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="data-label">Decisión</dt>
              <dd className="mt-1">
                {event.data.decision ? (
                  <Badge tone={event.data.decision.resultado === 'GRANTED' ? 'success' : 'danger'}>
                    {event.data.decision.resultado} · {event.data.decision.razon}
                  </Badge>
                ) : (
                  'Pendiente o no registrada'
                )}
              </dd>
            </div>
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}
