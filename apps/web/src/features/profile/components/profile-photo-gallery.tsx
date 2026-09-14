'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { profilePhotosService } from '@/features/profile/services/profile-photos-service';
import { ApiError } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import { MediaSourceDialog } from '@/shared/components/media/media-source-dialog';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { notify } from '@/shared/notifications';

const MAX_PHOTOS = 6;

/**
 * Galería de fotos de perfil. No existía ni un avatar único antes de esto —
 * el perfil solo mostraba iniciales.
 */
export function ProfilePhotoGallery() {
  const queryClient = useQueryClient();
  const [picking, setPicking] = useState(false);
  const photos = useQuery({
    queryKey: queryKeys.profilePhotos,
    queryFn: profilePhotosService.list,
  });

  const upload = useMutation({
    mutationFn: (file: File) => profilePhotosService.upload(file, file.name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profilePhotos });
      notify.success('Foto agregada.');
    },
    onError: (error: unknown) =>
      notify.error(error instanceof ApiError ? error.message : 'No se pudo subir la foto.'),
  });

  const remove = useMutation({
    mutationFn: (photoId: string) => profilePhotosService.remove(photoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profilePhotos });
      notify.success('Foto eliminada.');
    },
    onError: (error: unknown) =>
      notify.error(error instanceof ApiError ? error.message : 'No se pudo eliminar la foto.'),
  });

  const count = photos.data?.length ?? 0;
  const atLimit = count >= MAX_PHOTOS;

  return (
    <Card>
      <CardHeader
        description={`Hasta ${MAX_PHOTOS} fotos. ${count}/${MAX_PHOTOS} usadas.`}
        title="Fotos de perfil"
      />
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(photos.data ?? []).map((photo) => (
          <div
            className="group relative aspect-square overflow-hidden rounded-[8px] border border-[var(--border-subtle)]"
            key={photo.id}
          >
            <Image alt="" className="object-cover" fill src={photo.url} unoptimized />
            <button
              aria-label="Eliminar foto"
              className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-[var(--surface-lowest)]/90 text-[var(--danger-text)] opacity-0 transition-opacity group-hover:opacity-100"
              disabled={remove.isPending}
              onClick={() => remove.mutate(photo.id)}
              type="button"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {!atLimit ? (
          <button
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] transition-colors hover:border-[var(--volt)] hover:text-[var(--text)] disabled:opacity-50"
            disabled={upload.isPending}
            onClick={() => setPicking(true)}
            type="button"
          >
            <Upload className="size-5" />
            <span className="text-xs font-medium">Agregar</span>
          </button>
        ) : null}
      </CardContent>
      <MediaSourceDialog
        busy={upload.isPending}
        captureFileName="foto-de-perfil"
        captureLabel="Usar esta foto"
        description="Aparecerá en tu ficha del directorio y en la baraja de Descubrir."
        fileLabel="Elegir una imagen"
        onOpenChange={setPicking}
        onPick={(file) => upload.mutate(file)}
        open={picking}
        title="Añadir una foto"
      />
    </Card>
  );
}
