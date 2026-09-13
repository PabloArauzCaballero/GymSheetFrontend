'use client';

import { MessageCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { DirectoryCardFace } from '@/features/social/components/directory-card-face';
import type { GymDirectoryEntry } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';
import { formatRelativeTime } from '@/shared/lib/relative-time';

/**
 * Una persona en una lista de interacciones, con su foto.
 *
 * La web las pintaba como filas de agenda: avatar de 40 px, nombre y dos
 * metadatos. En una pantalla que existe para decidir si quieres conocer a
 * alguien, la foto **es** la información, y reducirla a una miniatura convierte
 * «me dieron like» en una lista de contactos.
 *
 * Es la misma cara que la baraja y el directorio (`DirectoryCardFace`), así que
 * una persona se ve igual en los tres sitios donde aparece.
 */
export function InteractionPhotoCard({
  actions,
  entry,
  onOpenProfile,
  timestamp,
  overlay,
}: Readonly<{
  actions?: ReactNode;
  entry: GymDirectoryEntry;
  onOpenProfile: () => void;
  timestamp: string;
  /** La celebración del match, que tapa la tarjeta mientras dura. */
  overlay?: ReactNode;
}>) {
  return (
    <article className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-lowest)]">
      <button
        aria-label={`Ver el perfil de ${entry.displayName}`}
        className="block w-full text-left"
        onClick={onOpenProfile}
        type="button"
      >
        <DirectoryCardFace entry={entry} interactive={false} />
      </button>
      <div className="grid gap-3 p-4">
        <p className="text-xs text-[var(--text-muted)]">{formatRelativeTime(timestamp)}</p>
        {actions ? <div className="grid gap-2">{actions}</div> : null}
      </div>
      {overlay}
    </article>
  );
}

/**
 * «¡Conectados!», sobre la propia tarjeta.
 *
 * Aceptar un like es el único momento en que estas listas devuelven algo, y
 * celebrarlo donde ocurrió —en vez de con un aviso que se desvanece en una
 * esquina— es lo que lo distingue de una confirmación cualquiera. Se cierra a
 * mano: la tarjeta de debajo ya no está pendiente, y releerla sin avisar
 * borraría la celebración delante de quien acaba de provocarla.
 */
export function MatchOverlay({
  displayName,
  onDismiss,
  onOpenChat,
  openingChat,
}: Readonly<{
  displayName: string;
  onDismiss: () => void;
  onOpenChat: () => void;
  openingChat: boolean;
}>) {
  return (
    <div className="absolute inset-0 grid place-items-center gap-4 bg-[rgb(var(--scrim-channels)/0.88)] p-6 text-center text-white">
      <div className="grid gap-2">
        <p className="text-xl font-semibold tracking-[-0.02em]">¡Conectados!</p>
        <p className="text-sm opacity-90">Ya podéis escribiros con {displayName}.</p>
      </div>
      <div className="grid w-full gap-2">
        <Button loading={openingChat} onClick={onOpenChat} variant="primary">
          <MessageCircle aria-hidden className="size-4" />
          Enviar un mensaje
        </Button>
        <button
          className="min-h-11 text-sm font-semibold text-white/80 hover:text-white"
          onClick={onDismiss}
          type="button"
        >
          Listo
        </button>
      </div>
    </div>
  );
}
