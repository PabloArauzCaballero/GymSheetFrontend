'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldX } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { formatDateTime } from '@/shared/lib/date';
import { confirm, notify } from '@/shared/notifications';
import { insightsService, type PortalUser } from '@/features/admin/services/insights-service';
import { permissionsAdminService } from '@/features/admin/services/permissions-admin-service';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administración',
  COACH: 'Entrenador',
  FRONT_DESK: 'Recepción',
};

/** Solo tiene sentido otorgar permisos granulares al personal, no a clientes. */
function isStaffUser(user: PortalUser): boolean {
  return user.rol in ROLE_LABEL;
}

export function PermissionsPanel() {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<PortalUser | null>(null);
  const [permissionKey, setPermissionKey] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const queryClient = useQueryClient();

  const users = useQuery({
    queryKey: ['admin', 'permissions', 'staff-search', search],
    queryFn: () => insightsService.users(search),
  });
  const staffResults = (users.data ?? []).filter(isStaffUser);

  const catalog = useQuery({
    queryKey: ['admin', 'permissions', 'catalog'],
    queryFn: () => permissionsAdminService.catalog(),
  });

  const grants = useQuery({
    queryKey: ['admin', 'permissions', 'grants', selectedUser?.id],
    queryFn: () => permissionsAdminService.listForUser(selectedUser!.id),
    enabled: Boolean(selectedUser),
  });

  const refreshGrants = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'permissions', 'grants', selectedUser?.id] });

  const grant = useMutation({
    mutationFn: () =>
      permissionsAdminService.grant(selectedUser!.id, {
        permissionKey,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }),
    onSuccess: async () => {
      await refreshGrants();
      setPermissionKey('');
      setExpiresAt('');
      notify.success('Permiso otorgado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const revoke = useMutation({
    mutationFn: (key: string) => permissionsAdminService.revoke(selectedUser!.id, key),
    onSuccess: async () => {
      await refreshGrants();
      notify.success('Permiso revocado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const grantedKeys = new Set((grants.data ?? []).map((item) => item.permissionKey));
  const availablePermissions = (catalog.data ?? []).filter((item) => !grantedKeys.has(item.key));

  return (
    <div className="grid gap-5">
      <PageHeader
        description="Otorga y revoca permisos granulares al personal, además de su rol."
        title="Permisos de administración"
        tutorialId="page:admin-permissions"
      />
      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader
            description="Solo personal (administración, entrenadores, recepción)."
            title="Buscar personal"
          />
          <CardContent>
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <Input
                aria-label="Buscar por nombre o correo"
                className="pl-9"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre o correo…"
                value={search}
              />
            </div>
            {staffResults.length === 0 ? (
              <EmptyState description="Ningún miembro del personal coincide." title="Sin resultados" />
            ) : (
              <div className="grid gap-2">
                {staffResults.map((user) => (
                  <button
                    className={`rounded-[4px] border p-3 text-left transition-colors ${
                      selectedUser?.id === user.id
                        ? 'border-[var(--volt)] bg-[var(--surface-low)]'
                        : 'border-[var(--border-subtle)] hover:bg-[var(--surface-low)]'
                    }`}
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    type="button"
                  >
                    <p className="font-semibold text-[var(--text)]">{user.nombreCompleto}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {user.email} · {ROLE_LABEL[user.rol] ?? user.rol}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            description={
              selectedUser ? selectedUser.email : 'Selecciona una persona para ver sus permisos.'
            }
            title={selectedUser ? `Permisos de ${selectedUser.nombreCompleto}` : 'Permisos'}
          />
          <CardContent>
            {!selectedUser ? (
              <EmptyState
                description="Busca y selecciona a alguien del personal."
                title="Nadie seleccionado"
              />
            ) : (
              <div className="grid gap-5">
                <div className="grid gap-2">
                  {(grants.data ?? []).length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">
                      Esta cuenta no tiene permisos granulares otorgados.
                    </p>
                  ) : (
                    (grants.data ?? []).map((item) => {
                      const definition = (catalog.data ?? []).find(
                        (entry) => entry.key === item.permissionKey,
                      );
                      return (
                        <div
                          className="flex items-center justify-between gap-3 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-3"
                          key={item.id}
                        >
                          <div>
                            <p className="font-semibold">{definition?.label ?? item.permissionKey}</p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {item.permissionKey}
                              {item.expiresAt ? ` · vence ${formatDateTime(item.expiresAt)}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.expiresAt ? <Badge tone="warning">Con vencimiento</Badge> : null}
                            <Button
                              aria-label={`Revocar ${item.permissionKey}`}
                              loading={revoke.isPending}
                              onClick={async () => {
                                const result = await confirm({
                                  title: 'Revocar permiso',
                                  message: `Se revocará "${definition?.label ?? item.permissionKey}" de inmediato.`,
                                  severity: 'danger',
                                  confirmLabel: 'Revocar',
                                });
                                if (result.confirmed) revoke.mutate(item.permissionKey);
                              }}
                              size="sm"
                              variant="danger"
                            >
                              <ShieldX className="size-4" />
                              Revocar
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form
                  className="grid gap-4 border-t border-[var(--border-subtle)] pt-5"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (permissionKey) grant.mutate();
                  }}
                >
                  <Field label="Otorgar permiso">
                    <Select
                      onChange={(event) => setPermissionKey(event.target.value)}
                      required
                      value={permissionKey}
                    >
                      <option disabled value="">
                        Selecciona un permiso…
                      </option>
                      {availablePermissions.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label} ({item.domain})
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Vence el (opcional)">
                    <Input
                      onChange={(event) => setExpiresAt(event.target.value)}
                      type="datetime-local"
                      value={expiresAt}
                    />
                  </Field>
                  <Button
                    disabled={!permissionKey}
                    loading={grant.isPending}
                    type="submit"
                    variant="primary"
                  >
                    Otorgar
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
