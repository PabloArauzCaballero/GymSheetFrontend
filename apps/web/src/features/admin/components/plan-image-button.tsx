'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageUp, QrCode, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { confirm, notify } from '@/shared/notifications';
import { mediaAdminService, planImageCode } from '@/features/admin/services/media-admin-service';
import { membershipAdminService } from '@/features/admin/services/membership-admin-service';
import {
  PendingImagePreview,
  readImageSize,
  type PendingImage,
} from './pending-image-preview';
import type { MediaFile, MembershipPlan } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { CameraCapture } from '@/shared/components/media/camera-capture';
import { DomainImage, mediaProxyUrl } from '@/shared/components/media/domain-image';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { Field } from '@/shared/components/ui/field';
import { Select } from '@/shared/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

/** Coincide con `MEDIA_ALLOWED_MIME` y `MEDIA_UPLOAD_MAX_BYTES` del backend. */
const ACCEPTED_MIME = 'image/png,image/jpeg,image/webp,image/gif';
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Administra la imagen QR de un plan: se sube al repositorio de medios con un
 * código derivado del plan (de modo que reemplazarla sobrescribe la pieza en
 * vez de acumular huérfanos) y luego se enlaza al plan por su id.
 */
export function PlanImageButton({ plan }: Readonly<{ plan: MembershipPlan }>) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingImage | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const media = useQuery({
    queryKey: queryKeys.admin.media,
    queryFn: () => mediaAdminService.list(100),
    enabled: open,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.plans });
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.media });
  };

  const clearPending = () => {
    setPending((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  };

  const assign = useMutation({
    mutationFn: (imagenId: string | null) =>
      membershipAdminService.updatePlan(plan.id, { imagenId }),
    onSuccess: async (_result, imagenId) => {
      await refresh();
      notify.success(imagenId ? 'Imagen del plan actualizada.' : 'Imagen del plan retirada.');
      if (imagenId) setOpen(false);
    },
    onError: (error: Error) => notify.error(error),
  });

  const uploadAndAssign = useMutation({
    mutationFn: async (input: { image: PendingImage; altText: string }) => {
      const uploaded: MediaFile = await mediaAdminService.upload({
        file: input.image.blob,
        fileName: input.image.fileName,
        codigo: planImageCode(plan.codigo),
        nombre: `QR de ${plan.nombre}`,
        altText: input.altText,
        ...(input.image.width && input.image.height
          ? { width: input.image.width, height: input.image.height }
          : {}),
      });
      return membershipAdminService.updatePlan(plan.id, { imagenId: uploaded.id });
    },
    onSuccess: async () => {
      await refresh();
      clearPending();
      setOpen(false);
      notify.success('QR del plan actualizado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const altTextDefault = `Código QR de pago del plan ${plan.nombre}`;
  const confirmUpload = (altText: string) =>
    pending && uploadAndAssign.mutate({ image: pending, altText });

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) clearPending();
      }}
      open={open}
    >
      <DialogTrigger asChild>
        <Button aria-label={`Imagen QR de ${plan.nombre}`} size="sm" variant="ghost">
          <QrCode className="size-4" />
          {plan.imagen ? 'Cambiar QR' : 'Añadir QR'}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-3xl"
        description="La imagen se guarda en el repositorio de medios con un código derivado del plan, de modo que reemplazarla no deja archivos sueltos."
        title={`QR de ${plan.nombre}`}
      >
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="grid content-start gap-3">
            <p className="data-label">Imagen actual</p>
            <div className="aspect-square overflow-hidden rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-low)]">
              {plan.imagen ? (
                <DomainImage
                  alt={plan.imagen.altText}
                  className="object-contain"
                  fallbackSrc={plan.imagen.url}
                  proxy={false}
                  src={mediaProxyUrl(plan.imagen.url)}
                />
              ) : (
                <div className="grid size-full place-items-center text-xs text-[var(--text-muted)]">
                  Sin imagen
                </div>
              )}
            </div>
            {plan.imagen ? (
              <Button
                loading={assign.isPending}
                onClick={async () => {
                  const result = await confirm({
                    title: 'Quitar imagen del plan',
                    message: 'El plan dejará de mostrar su QR de cobro a los clientes.',
                    severity: 'warning',
                    confirmLabel: 'Quitar',
                  });
                  if (result.confirmed) assign.mutate(null);
                }}
                size="sm"
                variant="danger"
              >
                <Trash2 className="size-4" />
                Quitar
              </Button>
            ) : null}
          </div>

          <Tabs defaultValue="file">
            <TabsList>
              <TabsTrigger value="file">Archivo</TabsTrigger>
              <TabsTrigger value="camera">Cámara</TabsTrigger>
              <TabsTrigger value="library">Repositorio</TabsTrigger>
            </TabsList>

            <TabsContent value="file">
              <div className="grid gap-4">
                <input
                  accept={ACCEPTED_MIME}
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    if (file.size > MAX_BYTES) {
                      notify.error(new Error('La imagen supera el máximo de 5 MB.'));
                      return;
                    }
                    clearPending();
                    const size = await readImageSize(file);
                    setPending({
                      blob: file,
                      fileName: file.name,
                      previewUrl: URL.createObjectURL(file),
                      ...(size ?? {}),
                    });
                  }}
                  ref={fileInputRef}
                  type="file"
                />
                <Button onClick={() => fileInputRef.current?.click()} type="button">
                  <Upload className="size-4" />
                  Elegir imagen (PNG, JPG, WEBP o GIF, máx. 5 MB)
                </Button>
                <PendingImagePreview
                  defaultAltText={altTextDefault}
                  loading={uploadAndAssign.isPending}
                  onCancel={clearPending}
                  onConfirm={confirmUpload}
                  pending={pending}
                />
              </div>
            </TabsContent>

            <TabsContent value="camera">
              <div className="grid gap-4">
                <p className="text-sm text-[var(--text-muted)]">
                  Enfoca el QR impreso con la cámara del computador y captúralo.
                </p>
                <CameraCapture
                  captureLabel="Capturar QR"
                  onCapture={(frame) => {
                    clearPending();
                    setPending({
                      blob: frame.blob,
                      fileName: `${planImageCode(plan.codigo)}.jpg`,
                      previewUrl: URL.createObjectURL(frame.blob),
                      width: frame.width,
                      height: frame.height,
                    });
                  }}
                />
                <PendingImagePreview
                  defaultAltText={altTextDefault}
                  loading={uploadAndAssign.isPending}
                  onCancel={clearPending}
                  onConfirm={confirmUpload}
                  pending={pending}
                />
              </div>
            </TabsContent>

            <TabsContent value="library">
              <div className="grid gap-4">
                <Field
                  hint="Reutiliza una pieza ya cargada, por ejemplo un QR común a varios planes."
                  htmlFor="plan-media"
                  label="Imagen del repositorio"
                >
                  <Select
                    id="plan-media"
                    onChange={(event) => setSelectedMediaId(event.target.value)}
                    value={selectedMediaId}
                  >
                    <option value="">Selecciona una imagen…</option>
                    {media.data?.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.nombre} · {file.codigo}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button
                  disabled={!selectedMediaId}
                  loading={assign.isPending}
                  onClick={() => assign.mutate(selectedMediaId)}
                  variant="primary"
                >
                  <ImageUp className="size-4" />
                  Asignar al plan
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
