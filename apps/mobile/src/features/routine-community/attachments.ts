import type { CommentAttachment } from '@gymsheet/types';

/** Lo que el compositor lleva listo para enviar con el comentario. */
export type PendingAttachment =
  | { source: 'remote'; attachment: CommentAttachment }
  | {
      source: 'local';
      tipo: 'IMAGEN' | 'VIDEO' | 'ARCHIVO';
      uri: string;
      name: string;
      mimeType: string;
      width?: number;
      height?: number;
      bytes?: number;
    };

/** La forma del adjunto para pintarlo ya (el archivo local aún no está subido). */
export function previewOf(pending: PendingAttachment): CommentAttachment {
  if (pending.source === 'remote') return pending.attachment;
  return {
    tipo: pending.tipo,
    url: pending.uri,
    mime: pending.mimeType,
    nombre: pending.name,
    bytes: pending.bytes ?? null,
    ancho: pending.width ?? null,
    alto: pending.height ?? null,
  };
}

export function sizeLabel(bytes?: number | null): string {
  if (!bytes) return '';
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
