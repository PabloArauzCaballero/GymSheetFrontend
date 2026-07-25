'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { accessAdminService } from '@/features/admin/services/access-admin-service';
import { AccessEventLookup } from './access-event-lookup';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Badge } from '@/shared/components/ui/badge';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Pagination } from '@/shared/components/ui/pagination';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';
import { formatDateTime } from '@/shared/lib/date';

export function AccessHistoryPanel() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const query = useQuery({
    queryKey: [...queryKeys.admin.accessHistory(page), userId],
    queryFn: () => accessAdminService.history(page, userId || undefined),
  });
  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-xl font-bold">Historial de decisiones</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Filtra por UUID de usuario cuando sea necesario.
        </p>
      </div>
      <div className="panel max-w-xl p-4">
        <Field label="Usuario">
          <Input
            onChange={(event) => {
              setUserId(event.target.value.trim());
              setPage(1);
            }}
            placeholder="UUID opcional"
            value={userId}
          />
        </Field>
      </div>
      <AccessEventLookup />
      {query.isError ? (
        <ErrorPanel message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data?.items.length ? (
        <div className="panel overflow-hidden">
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Razón</TableHead>
                  <TableHead>Política</TableHead>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((decision) => (
                  <tr key={decision.id}>
                    <TableCell>{formatDateTime(decision.decididoEn)}</TableCell>
                    <TableCell className="data-value text-xs">{decision.usuarioId}</TableCell>
                    <TableCell>
                      <Badge tone={decision.resultado === 'GRANTED' ? 'success' : 'danger'}>
                        {decision.resultado}
                      </Badge>
                    </TableCell>
                    <TableCell className="data-value text-xs">{decision.razon}</TableCell>
                    <TableCell>{decision.versionPolitica}</TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
          <Pagination
            onPageChange={setPage}
            page={query.data.page}
            totalPages={query.data.totalPages}
          />
        </div>
      ) : (
        <EmptyState description="No hay decisiones para el filtro actual." title="Sin eventos" />
      )}
    </section>
  );
}
