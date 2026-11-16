'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Select } from '@/shared/components/ui/select';
import { impersonationClient, tenantsKey } from '../services/impersonation-client';
import { useImpersonation } from '../use-impersonation';

/**
 * «Elegir gimnasio»: the platform admin picks the gym the `/admin/*` modules
 * act on. Only active gyms are offered (the backend refuses the rest anyway).
 */
export function GymPicker({ currentTenantId }: Readonly<{ currentTenantId: string | null }>) {
  const tenants = useQuery({ queryKey: tenantsKey, queryFn: impersonationClient.tenants });
  const { start } = useImpersonation();
  const [choice, setChoice] = useState('');
  const active = (tenants.data ?? []).filter((gym) => gym.activo && gym.id !== currentTenantId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (choice) start.mutate(choice, { onSuccess: () => setChoice('') });
  }

  return (
    <Card>
      <CardHeader
        description={
          currentTenantId
            ? 'Cambia de gimnasio cuando quieras. Para volver a toda la plataforma, pulsa «Salir» en la franja de arriba.'
            : 'Los módulos del gimnasio actúan sobre el que elijas aquí. Lo ves en una franja arriba mientras lo operas.'
        }
        title="Elegir gimnasio"
      />
      <CardContent>
        {tenants.isError ? (
          <ErrorPanel message={tenants.error.message} onRetry={() => tenants.refetch()} />
        ) : (
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={submit}>
            <Field className="min-w-0 flex-1" htmlFor="gym-picker" label="Gimnasio">
              <Select
                disabled={tenants.isLoading || active.length === 0}
                id="gym-picker"
                onChange={(event) => setChoice(event.target.value)}
                value={choice}
              >
                <option value="">
                  {tenants.isLoading ? 'Cargando gimnasios…' : active.length ? 'Elige un gimnasio' : 'No hay otros gimnasios activos'}
                </option>
                {active.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.nombre}
                  </option>
                ))}
              </Select>
            </Field>
            <Button disabled={!choice} loading={start.isPending} type="submit" variant="primary">
              Operar
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
