'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fingerprint, KeyRound, Search, ShieldX } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { accessAdminService } from '@/features/admin/services/access-admin-service';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { formatDateTime } from '@/shared/lib/date';

export function CredentialPanel() {
  const [userId, setUserId] = useState('');
  const [lookupId, setLookupId] = useState('');
  const queryClient = useQueryClient();
  const credentials = useQuery({
    queryKey: ['admin', 'credentials', lookupId],
    queryFn: () => accessAdminService.credentialsForUser(lookupId),
    enabled: Boolean(lookupId),
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'credentials', lookupId] });
  const createPin = useMutation({
    mutationFn: (form: FormData) =>
      accessAdminService.createPin({
        usuarioId: String(form.get('usuarioId')),
        pin: String(form.get('pin')),
        proveedor: String(form.get('proveedor') || 'INTERNAL_PIN'),
      }),
    onSuccess: async () => {
      await refresh();
      toast.success('Credencial PIN creada.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const createExternal = useMutation({
    mutationFn: (form: FormData) =>
      accessAdminService.createExternalCredential({
        usuarioId: String(form.get('usuarioId')),
        modalidad: String(form.get('modalidad')) as 'FACE' | 'FINGERPRINT',
        proveedor: String(form.get('proveedor')),
        referenciaExterna: String(form.get('referenciaExterna')),
        versionConsentimiento: String(form.get('versionConsentimiento')),
        consentimientoRegistradoEn: new Date(
          String(form.get('consentimientoRegistradoEn')),
        ).toISOString(),
        metadata: {},
      }),
    onSuccess: async () => {
      await refresh();
      toast.success('Credencial externa creada.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => accessAdminService.revokeCredential(id),
    onSuccess: async () => {
      await refresh();
      toast.success('Credencial revocada.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <div className="grid content-start gap-5">
        <Card>
          <CardHeader
            description="Busca primero las credenciales no sensibles de un usuario."
            title="Consultar usuario"
          />
          <CardContent>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setLookupId(userId.trim());
              }}
            >
              <Input
                onChange={(event) => setUserId(event.target.value)}
                placeholder="UUID de usuario"
                value={userId}
              />
              <Button aria-label="Buscar" size="icon" type="submit" variant="primary">
                <Search className="size-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Credenciales registradas" />
          <CardContent>
            {credentials.data?.length ? (
              <div className="grid gap-3">
                {credentials.data.map((credential) => (
                  <div
                    className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-4"
                    key={credential.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {credential.tipo === 'PIN' ? (
                          <KeyRound className="size-4 text-[var(--volt)]" />
                        ) : (
                          <Fingerprint className="size-4 text-[var(--volt)]" />
                        )}
                        <div>
                          <p className="font-semibold">{credential.tipo}</p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {credential.proveedor} · {formatDateTime(credential.registradoEn)}
                          </p>
                        </div>
                      </div>
                      <Badge tone={credential.estado === 'ACTIVE' ? 'success' : 'danger'}>
                        {credential.estado}
                      </Badge>
                    </div>
                    {credential.estado !== 'REVOKED' ? (
                      <Button
                        className="mt-4"
                        loading={revoke.isPending}
                        onClick={() => revoke.mutate(credential.id)}
                        size="sm"
                        variant="danger"
                      >
                        <ShieldX className="size-4" />
                        Revocar
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description={
                  lookupId
                    ? 'No hay credenciales para este usuario.'
                    : 'Ingresa un UUID para consultar.'
                }
                title="Sin resultados"
              />
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid content-start gap-5">
        <Card>
          <CardHeader
            description="El PIN nunca vuelve a mostrarse después del alta."
            title="Registrar PIN"
          />
          <CardContent>
            <form action={(form) => createPin.mutate(form)} className="grid gap-5">
              <Field label="Usuario">
                <Input defaultValue={lookupId} name="usuarioId" required />
              </Field>
              <Field label="PIN">
                <Input inputMode="numeric" name="pin" pattern="\d{4,12}" required />
              </Field>
              <Field label="Proveedor">
                <Input defaultValue="INTERNAL_PIN" name="proveedor" />
              </Field>
              <Button loading={createPin.isPending} type="submit" variant="primary">
                Crear PIN
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader
            description="Solo se envía una referencia externa y evidencia de consentimiento."
            title="Registrar biometría externa"
          />
          <CardContent>
            <form action={(form) => createExternal.mutate(form)} className="grid gap-5">
              <Field label="Usuario">
                <Input defaultValue={lookupId} name="usuarioId" required />
              </Field>
              <Field label="Modalidad">
                <Select name="modalidad">
                  <option value="FACE">FACE</option>
                  <option value="FINGERPRINT">FINGERPRINT</option>
                </Select>
              </Field>
              <Field label="Proveedor">
                <Input name="proveedor" required />
              </Field>
              <Field label="Referencia externa">
                <Input minLength={8} name="referenciaExterna" required />
              </Field>
              <Field label="Versión de consentimiento">
                <Input name="versionConsentimiento" required />
              </Field>
              <Field label="Consentimiento registrado en">
                <Input name="consentimientoRegistradoEn" required type="datetime-local" />
              </Field>
              <Button loading={createExternal.isPending} type="submit">
                Registrar referencia
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
