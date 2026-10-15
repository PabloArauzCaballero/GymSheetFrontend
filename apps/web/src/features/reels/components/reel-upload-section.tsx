'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import type { ReelDTO } from '@gymsheet/schemas';
import { Button } from '@/shared/components/ui/button';
import { reelsService } from '../services/reels-service';
import { allowedVideoTypes, feedKey } from './reels-shared';

/** Formulario para grabar o elegir un vídeo y publicarlo como reel. */
export function ReelUploadSection({ onRetryFeed }: Readonly<{ onRetryFeed: () => void }>) {
  const queryClient = useQueryClient();
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: reelsService.upload,
    onSuccess: async (reel: ReelDTO) => {
      queryClient.setQueryData(
        feedKey,
        (current: { items: ReelDTO[]; nextCursor: null } | undefined) => ({
          items: [reel, ...(current?.items ?? []).filter((item) => item.id !== reel.id)],
          nextCursor: null,
        }),
      );
      setSelectedFile(null);
      setSelectionError(null);
      if (cameraInput.current) cameraInput.current.value = '';
      if (libraryInput.current) libraryInput.current.value = '';
      await queryClient.invalidateQueries({ queryKey: feedKey });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (upload.isPending) return;
    if (!selectedFile) {
      setSelectionError('Elige o graba un vídeo para publicar.');
      return;
    }
    if (!allowedVideoTypes.has(selectedFile.type)) {
      setSelectionError('El archivo debe ser MP4 o QuickTime.');
      return;
    }
    setSelectionError(null);
    upload.mutate(selectedFile);
  }

  return (
    <section
      aria-labelledby="reel-upload-title"
      className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-low)] p-5 sm:p-7"
    >
      <div>
        <h2 className="text-lg font-semibold" id="reel-upload-title">
          Publicar un reel
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          MP4 o QuickTime, hasta 90 segundos.
        </p>
      </div>
      <form className="grid justify-items-start gap-4" onSubmit={submit}>
        <label className="grid gap-2 text-sm font-medium" htmlFor="reel-camera">
          Grabar un vídeo
          <input
            accept="video/mp4,video/quicktime"
            capture="environment"
            className="max-w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--volt)] file:px-3 file:py-2 file:font-semibold file:text-[var(--accent-contrast)]"
            disabled={upload.isPending}
            id="reel-camera"
            onChange={(event) => {
              setSelectedFile(event.currentTarget.files?.[0] ?? null);
              setSelectionError(null);
              upload.reset();
            }}
            ref={cameraInput}
            type="file"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium" htmlFor="reel-library">
          Elegir un vídeo del dispositivo
          <input
            accept="video/mp4,video/quicktime"
            className="max-w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--volt)] file:px-3 file:py-2 file:font-semibold file:text-[var(--accent-contrast)]"
            disabled={upload.isPending}
            id="reel-library"
            onChange={(event) => {
              setSelectedFile(event.currentTarget.files?.[0] ?? null);
              setSelectionError(null);
              upload.reset();
            }}
            ref={libraryInput}
            type="file"
          />
        </label>
        {selectedFile ? (
          <p className="text-sm text-[var(--text-muted)]" aria-live="polite">
            Seleccionado: {selectedFile.name}
          </p>
        ) : null}
        {selectionError ? (
          <p className="text-sm text-[var(--danger-text)]" role="alert">
            {selectionError}
          </p>
        ) : null}
        {upload.isError ? (
          <div className="grid justify-items-start gap-2" role="alert">
            <p className="text-sm text-[var(--danger-text)]">
              No pudimos confirmar la publicación. Actualiza tu lista antes de volver a enviarlo.
            </p>
            <Button onClick={() => onRetryFeed()} type="button">
              Actualizar mis reels
            </Button>
          </div>
        ) : null}
        {upload.isSuccess ? (
          <p className="text-sm text-[var(--success-text)]" role="status">
            Reel publicado.
          </p>
        ) : null}
        <Button
          disabled={upload.isPending || !selectedFile}
          loading={upload.isPending}
          type="submit"
          variant="primary"
        >
          {upload.isPending ? 'Publicando…' : 'Publicar reel'}
        </Button>
      </form>
    </section>
  );
}
