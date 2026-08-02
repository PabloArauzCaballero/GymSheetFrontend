'use client';

import { useQuery } from '@tanstack/react-query';
import { Fingerprint, KeyRound, ShieldCheck, ShieldX } from 'lucide-react';
import { useState } from 'react';
import { accessService } from '@/features/access/services/access-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Pagination } from '@/shared/components/ui/pagination';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';
import { formatDateTime } from '@/shared/lib/date';

export function AccessPageClient() {
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: queryKeys.accessHistory(page),
    queryFn: () => accessService.getHistory(page),
    retry: false,
  });
  const credentials = useQuery({
    queryKey: queryKeys.credentials,
    queryFn: accessService.getCredentials,
    retry: false,
  });
  if (history.isLoading || credentials.isLoading) return <LoadingPanel rows={7} />;
  return (
    <div className="grid gap-8">
      <PageHeader
        description="Credenciales no sensibles y decisiones de acceso registradas para tu cuenta."
        eyebrow="Seguridad física"
        title="Acceso"
      />
      <section className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
        <Card>
          <CardHeader
            description="Nunca se muestran hashes, PIN ni referencias biométricas opacas."
            title="Credenciales"
          />
          <CardContent>
            {credentials.isError ? (
              <ErrorPanel
                message={credentials.error.message}
                onRetry={() => credentials.refetch()}
              />
            ) : credentials.data?.length ? (
              <div className="grid gap-3">
                {credentials.data.map((credential) => (
                  <div
                    className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-4"
                    key={credential.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {credential.tipo === 'PIN' ? (
                          <KeyRound className="size-5 text-[var(--accent-ink)]" />
                        ) : (
                          <Fingerprint className="size-5 text-[var(--accent-ink)]" />
                        )}
                        <div>
                          <p className="font-semibold">{credential.tipo}</p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {credential.proveedor}
                          </p>
                        </div>
                      </div>
                      <Badge
                        tone={
                          credential.estado === 'ACTIVE'
                            ? 'success'
                            : credential.estado === 'REVOKED'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {credential.estado}
                      </Badge>
                    </div>
                    <p className="mt-4 text-xs text-[var(--text-muted)]">
                      Registrada: {formatDateTime(credential.registradoEn)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="El personal autorizado puede registrar una credencial para tu usuario."
                title="Sin credenciales"
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader
            description="El resultado y la razón provienen del motor de políticas del backend."
            title="Historial de decisiones"
          />
          <CardContent className="p-0">
            {history.isError ? (
              <div className="p-5">
                <ErrorPanel message={history.error.message} onRetry={() => history.refetch()} />
              </div>
            ) : history.data?.items.length ? (
              <>
                <TableContainer>
                  <Table>
                    <thead>
                      <tr>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Resultado</TableHead>
                        <TableHead>Razón</TableHead>
                        <TableHead>Días restantes</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {history.data.items.map((decision) => (
                        <tr key={decision.id}>
                          <TableCell>{formatDateTime(decision.decididoEn)}</TableCell>
                          <TableCell>
                            <Badge tone={decision.resultado === 'GRANTED' ? 'success' : 'danger'}>
                              {decision.resultado === 'GRANTED' ? (
                                <ShieldCheck className="mr-1 size-3" />
                              ) : (
                                <ShieldX className="mr-1 size-3" />
                              )}
                              {decision.resultado}
                            </Badge>
                          </TableCell>
                          <TableCell className="data-value text-xs">{decision.razon}</TableCell>
                          <TableCell>{decision.diasRestantes ?? '—'}</TableCell>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableContainer>
                <Pagination
                  onPageChange={setPage}
                  page={history.data.page}
                  totalPages={history.data.totalPages}
                />
              </>
            ) : (
              <div className="p-5">
                <EmptyState
                  description="No existen decisiones de acceso registradas para esta cuenta."
                  title="Sin eventos"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
