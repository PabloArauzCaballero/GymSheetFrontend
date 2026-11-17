'use client';

import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { insightsService, type PortalUser } from '@/features/admin/services/insights-service';

/**
 * Finds a member account to add to the team. Only `CLIENTE` accounts are
 * listed: the backend refuses staff and platform admins anyway
 * (`MODERATOR_NOT_ASSIGNABLE`), so offering them would only lead to a refusal.
 */
export function MemberPicker({
  busyId,
  onPick,
}: Readonly<{ busyId: string | null; onPick: (user: PortalUser) => void }>) {
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search.trim());

  const members = useQuery({
    queryKey: ['sistema', 'moderators', 'member-search', query],
    queryFn: () => insightsService.users(query, 1, 20, 'CLIENTE'),
    enabled: query.length >= 3,
  });
  const results = members.data?.items ?? [];

  return (
    <Card>
      <CardHeader
        description="Busca una cuenta de socio por correo o nombre."
        title="Sumar a alguien"
      />
      <CardContent className="grid gap-4">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <Input
            aria-label="Buscar socio por correo o nombre"
            className="pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="correo@ejemplo.com"
            type="search"
            value={search}
          />
        </div>
        {query.length < 3 ? (
          <p className="text-sm text-[var(--text-muted)]">Escribe al menos 3 letras para buscar.</p>
        ) : members.isPending ? (
          <div aria-busy="true" className="h-24 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />
        ) : members.isError ? (
          <ErrorPanel error={members.error} message={members.error.message} onRetry={() => void members.refetch()} />
        ) : results.length === 0 ? (
          <EmptyState description="Ninguna cuenta de socio coincide con la búsqueda." title="Sin resultados" />
        ) : (
          <ul className="grid gap-2">
            {results.map((user) => (
              <li
                className="flex flex-col gap-3 rounded-[8px] border border-[var(--border-subtle)] p-3 sm:flex-row sm:items-center sm:justify-between"
                key={user.id}
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold">{user.nombreCompleto}</p>
                  <p className="break-all text-xs text-[var(--text-muted)]">{user.email}</p>
                </div>
                <Button
                  loading={busyId === user.id}
                  onClick={() => onPick(user)}
                  size="sm"
                  variant="secondary"
                >
                  <UserPlus aria-hidden className="size-4" />
                  Sumar
                  <span className="sr-only"> a {user.nombreCompleto}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
