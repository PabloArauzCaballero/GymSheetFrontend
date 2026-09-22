'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Select } from '@/shared/components/ui/select';
import { formatDateTime } from '@/shared/lib/date';
import { auditService, type AuditEntry } from '@/features/admin/services/audit-service';

/**
 * Dominios que hoy escriben en el registro.
 *
 * Es una lista corta y explícita en vez de un campo de texto libre: el filtro
 * sirve para acotar, y ofrecer un cuadro vacío obliga a adivinar el vocabulario
 * exacto que usa el backend.
 */
const DOMAIN_OPTIONS = [
  { value: '', label: 'Todos los dominios' },
  { value: 'admin-access', label: 'Permisos' },
  { value: 'users', label: 'Usuarios' },
  { value: 'files', label: 'Archivos' },
  { value: 'moderation', label: 'Moderación' },
  { value: 'support', label: 'Soporte' },
] as const;

const ACTION_LABEL: Record<string, string> = {
  grant: 'Otorgó permiso',
  revoke: 'Revocó permiso',
};

/**
 * Una acción, dicha como la diría una persona.
 *
 * El par dominio/acción está pensado para consultarse y agregarse, no para
 * leerse: «admin-access · grant» obliga a traducir mentalmente en cada fila.
 * Cuando la acción todavía no tiene traducción se muestra el par crudo, que es
 * peor que una frase pero mejor que una fila en blanco.
 */
function describe(entry: AuditEntry): string {
  return ACTION_LABEL[entry.action] ?? `${entry.domain} · ${entry.action}`;
}

export function AuditPanel({
  scope = 'gym',
}: Readonly<{ scope?: 'gym' | 'platform' }>) {
  const [domain, setDomain] = useState('');

  const audit = useInfiniteQuery({
    queryKey: ['admin', 'audit', domain],
    queryFn: ({ pageParam }) =>
      auditService.list({
        ...(domain ? { domain } : {}),
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: '' as string,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const rows = audit.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        eyebrow={scope === 'platform' ? 'Plataforma' : 'Gobernanza'}
        title={scope === 'platform' ? 'Auditoría global' : 'Auditoría'}
        description={
          scope === 'platform'
            ? 'Toda la actividad administrativa de la plataforma, de la más reciente a la más antigua.'
            : 'Quién hizo qué, cuándo y sobre qué cuenta, dentro de este gimnasio.'
        }
      />

      <Field label="Dominio">
        <Select onChange={(event) => setDomain(event.target.value)} value={domain}>
          {DOMAIN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <Card>
        <CardContent className="p-0">
          {audit.isPending ? (
            <div className="h-64 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />
          ) : rows.length === 0 ? (
            <div className="p-5">
              {/* Un filtro puesto y cero filas no significa que no haya pasado
                  nada: decir «todavía no hay actividad» ahí mandaría a buscar un
                  fallo donde sólo hay un filtro demasiado estrecho. */}
              <EmptyState
                description={
                  domain
                    ? 'No hay acciones registradas en ese dominio. Prueba con otro o quita el filtro.'
                    : 'En cuanto alguien otorgue un permiso o actúe sobre una cuenta, quedará registrado aquí.'
                }
                icon={<ScrollText className="size-6" />}
                title={
                  domain
                    ? 'Sin actividad en este dominio'
                    : 'Todavía no hay actividad registrada'
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="px-5 py-3 font-semibold">Cuándo</th>
                    <th className="px-5 py-3 font-semibold">Quién</th>
                    <th className="px-5 py-3 font-semibold">Qué hizo</th>
                    <th className="px-5 py-3 font-semibold">Sobre qué</th>
                    {scope === 'platform' ? (
                      <th className="px-5 py-3 font-semibold">Gimnasio</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((entry) => (
                    <tr
                      className="border-b border-[var(--border-subtle)] last:border-b-0"
                      key={entry.id}
                    >
                      <td className="px-5 py-3 tabular-nums text-[var(--text-muted)]">
                        {formatDateTime(entry.occurredAt)}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-[var(--text)]">{entry.actorEmail}</p>
                        <p className="text-xs text-[var(--text-muted)]">{entry.actorRole}</p>
                      </td>
                      <td className="px-5 py-3">
                        {describe(entry)}
                        {entry.metadata.impersonating ? (
                          <Badge className="ml-2" tone="warning">
                            Suplantando
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-[var(--text-muted)]">
                        {entry.targetId ? (
                          <>
                            {entry.targetKind ?? 'objeto'}
                            <span className="block font-mono text-xs">{entry.targetId}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      {scope === 'platform' ? (
                        <td className="px-5 py-3 text-[var(--text-muted)]">
                          {/* Nulo no es un dato que falte: es una acción que no
                              cayó sobre ningún gimnasio. */}
                          {entry.tenantScope ?? 'Plataforma'}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {audit.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            disabled={audit.isFetchingNextPage}
            onClick={() => audit.fetchNextPage()}
            variant="secondary"
          >
            {audit.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
