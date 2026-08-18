'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';

/** Imagen elegida o capturada que aún no se ha subido. */
export type PendingImage = {
  readonly blob: Blob;
  readonly fileName: string;
  readonly previewUrl: string;
  readonly width?: number;
  readonly height?: number;
};

/** Dimensiones reales del archivo: el backend las exige juntas o ninguna. */
export async function readImageSize(
  blob: Blob,
): Promise<{ width: number; height: number } | null> {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve(null);
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Confirmación antes de subir: muestra la pieza elegida y exige un texto
 * alternativo, que el repositorio de medios requiere y que es lo que oirá quien
 * navegue con lector de pantalla.
 */
export function PendingImagePreview({
  pending,
  defaultAltText,
  loading,
  onCancel,
  onConfirm,
}: Readonly<{
  pending: PendingImage | null;
  defaultAltText: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (altText: string) => void;
}>) {
  const [altText, setAltText] = useState(defaultAltText);
  if (!pending) return null;
  return (
    <div className="grid gap-4 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-4">
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- Vista previa local desde un blob. */}
        <img
          alt="Vista previa de la imagen seleccionada"
          className="size-28 rounded-[4px] object-contain"
          src={pending.previewUrl}
        />
        <div className="grid flex-1 gap-1 text-xs text-[var(--text-muted)]">
          <p className="font-semibold text-[var(--text)]">{pending.fileName}</p>
          {pending.width && pending.height ? (
            <p>
              {pending.width} × {pending.height} px
            </p>
          ) : null}
          <p>{(pending.blob.size / 1024).toFixed(0)} KB</p>
        </div>
      </div>
      <Field
        hint="Se lee en voz alta a quien usa lector de pantalla."
        htmlFor="plan-image-alt"
        label="Texto alternativo"
      >
        <Input
          id="plan-image-alt"
          maxLength={300}
          onChange={(event) => setAltText(event.target.value)}
          value={altText}
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel} type="button" variant="ghost">
          Descartar
        </Button>
        <Button
          disabled={!altText.trim()}
          loading={loading}
          onClick={() => onConfirm(altText.trim())}
          type="button"
          variant="primary"
        >
          Guardar QR
        </Button>
      </div>
    </div>
  );
}
