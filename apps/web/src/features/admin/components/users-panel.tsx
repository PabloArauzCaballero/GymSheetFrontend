'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { PageHeader } from '@/shared/components/layout/page-header';
import { insightsService, type PortalUser } from '@/features/admin/services/insights-service';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administración',
  CLIENTE: 'Cliente',
  COACH: 'Entrenador',
  ENTRENADOR_EXTERNO: 'Entrenador externo',
  FRONT_DESK: 'Recepción',
};

/**
 * Estado de acceso, resuelto a una sola frase.
 *
 * Es la única pregunta que se hace de verdad al mirar esta tabla —«¿puede
 * entrar hoy?»— y responderla con tres columnas de fechas obliga a hacer la
 * resta mentalmente, con el cliente delante.
 */
function AccessBadge({ user }: { user: PortalUser }) {
  if (user.rol !== 'CLIENTE') return <Badge tone="neutral">{ROLE_LABEL[user.rol] ?? user.rol}</Badge>;
  if (user.vigente) return <Badge tone="success">Al día</Badge>;
  if (user.venceEl) return <Badge tone="warning">Vencida</Badge>;
  return <Badge tone="neutral">Sin membresía</Badge>;
}

/**
 * Todas las cuentas del gimnasio.
 *
 * Se muestran juntas, clientes y personal, y no en dos pestañas: quien busca a
 * una persona en recepción no sabe de antemano con qué rol fue dada de alta, y
 * hacerle adivinar la pestaña correcta es la clase de fricción que termina en
 * «no aparece».
 */
export function UsersPanel() {
  const [search, setSearch] = useState('');

  const users = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () => insightsService.users(search),
    // Mantener lo anterior mientras teclea evita el parpadeo a lista vacía en
    // cada letra, que es lo que hace que un buscador se sienta lento.
    placeholderData: keepPreviousData,
  });

  const rows = users.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Usuarios"
        tutorialId="page:admin-usuarios"
        description="Todas las cuentas, con su membresía y su última actividad."
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <Input
          aria-label="Buscar por nombre o correo"
          className="pl-9"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre o correo…"
          value={search}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {users.isPending ? (
            <div className="h-64 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />
          ) : rows.length === 0 ? (
            <p className="p-5 text-sm text-[var(--text-muted)]">
              Ninguna cuenta coincide con esa búsqueda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="px-5 py-3 font-semibold">Persona</th>
                    <th className="px-5 py-3 font-semibold">Rol</th>
                    <th className="px-5 py-3 font-semibold">Plan</th>
                    <th className="px-5 py-3 font-semibold">Acceso</th>
                    <th className="px-5 py-3 font-semibold">Último entreno</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((user) => (
                    <tr
                      className="border-b border-[var(--border-subtle)] last:border-b-0"
                      key={user.id}
                    >
                      <td className="px-5 py-3">
                        <p className="font-semibold text-[var(--text)]">{user.nombreCompleto}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {user.telefono ? `${user.email} · ${user.telefono}` : user.email}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-[var(--text-muted)]">
                        {ROLE_LABEL[user.rol] ?? user.rol}
                        {user.tenantId ? (
                          <span className="ml-2 text-xs">{user.tenantId}</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-[var(--text-muted)]">
                        {user.plan ?? '—'}
                        {user.venceEl ? (
                          <span className="block text-xs">{`hasta ${user.venceEl}`}</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <AccessBadge user={user} />
                      </td>
                      <td className="px-5 py-3 text-[var(--text-muted)]">
                        {user.ultimaSesion ?? 'Nunca'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
