'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { membershipAdminService } from '@/features/admin/services/membership-admin-service';
import { queryKeys } from '@/shared/api/query-keys';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Table, TableCell, TableContainer, TableHead } from '@/shared/components/ui/table';
import { Textarea } from '@/shared/components/ui/textarea';
import { formatDate } from '@/shared/lib/date';

export function CustomerPanel() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.admin.customers(1),
    queryFn: () => membershipAdminService.listCustomers(1),
  });
  const create = useMutation({
    mutationFn: (form: FormData) =>
      membershipAdminService.createCustomer({
        email: String(form.get('email')),
        password: String(form.get('password')),
        pinAcceso: String(form.get('pinAcceso')),
        nombreCompleto: String(form.get('nombreCompleto')),
        numeroCliente: String(form.get('numeroCliente')),
        telefono: String(form.get('telefono') || '') || null,
        referenciaExterna: String(form.get('referenciaExterna') || '') || null,
        notas: String(form.get('notas') || '') || null,
        metadata: {},
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
      setOpen(false);
      toast.success('Cliente creado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Clientes</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Alta transaccional de usuario, perfil y credencial PIN.
          </p>
        </div>
        <Dialog onOpenChange={setOpen} open={open}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Nuevo cliente
            </Button>
          </DialogTrigger>
          <DialogContent title="Registrar cliente">
            <form action={(form) => create.mutate(form)} className="grid gap-5">
              <Field label="Nombre completo">
                <Input name="nombreCompleto" required />
              </Field>
              <Field label="Correo">
                <Input name="email" required type="email" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field hint="Mínimo 10 caracteres." label="Contraseña temporal">
                  <Input minLength={10} name="password" required type="password" />
                </Field>
                <Field hint="Entre 4 y 12 dígitos." label="PIN de acceso">
                  <Input inputMode="numeric" name="pinAcceso" pattern="\d{4,12}" required />
                </Field>
                <Field label="Número de cliente">
                  <Input name="numeroCliente" required />
                </Field>
                <Field label="Teléfono">
                  <Input name="telefono" />
                </Field>
              </div>
              <Field label="Referencia externa">
                <Input name="referenciaExterna" />
              </Field>
              <Field label="Notas">
                <Textarea name="notas" />
              </Field>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button loading={create.isPending} type="submit" variant="primary">
                  Crear cliente
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {query.isError ? (
        <ErrorPanel message={query.error.message} onRetry={() => query.refetch()} />
      ) : query.data?.items.length ? (
        <div className="panel overflow-hidden">
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>ID usuario</TableHead>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((customer) => (
                  <tr key={customer.id}>
                    <TableCell>
                      <p className="font-semibold">{customer.usuario?.nombreCompleto ?? '—'}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {customer.usuario?.email ?? '—'}
                      </p>
                    </TableCell>
                    <TableCell className="data-value">{customer.numeroCliente}</TableCell>
                    <TableCell>{customer.telefono ?? '—'}</TableCell>
                    <TableCell>{formatDate(customer.registradoEl)}</TableCell>
                    <TableCell className="data-value text-xs">{customer.usuarioId}</TableCell>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableContainer>
        </div>
      ) : (
        <EmptyState
          description="Registra el primer cliente con sus credenciales iniciales."
          title="Sin clientes"
        />
      )}
    </section>
  );
}
