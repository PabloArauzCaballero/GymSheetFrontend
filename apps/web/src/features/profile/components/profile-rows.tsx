'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Divider, ListCard } from '@/shared/components/mobile/nav-row';
import { notify } from '@/shared/notifications';

/** Glifo de fila, callado: un trazo gris; el protagonista es el héroe. */
export function RowGlyph({ icon: Icon }: Readonly<{ icon: LucideIcon }>) {
  return (
    <span aria-hidden className="grid w-6 shrink-0 place-items-center text-[var(--text-muted)]">
      <Icon className="size-5" />
    </span>
  );
}

/** Lista agrupada de filas que navegan: el patrón de ajustes de iOS. */
export function RowGroup({ children }: Readonly<{ children: ReactNode[] }>) {
  const items = children.filter(Boolean);
  return (
    <ListCard>
      {items.map((child, index) => (
        <div key={index}>
          {index > 0 ? <Divider /> : null}
          {child}
        </div>
      ))}
    </ListCard>
  );
}

export function initialsOf(name: string | undefined, email: string | undefined): string {
  const source = name?.trim() || email?.split('@')[0] || '';
  const parts = source.split(/[\s._-]+/u).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·';
}

/** «Compartir mi perfil»: hoja nativa del navegador o, si no hay, copiar el enlace. */
export async function shareProfile(userId: string, rank: string, stat: string) {
  const url = `${window.location.origin}/perfil/${userId}`;
  const text = `Rango ${rank} · ${stat}. Entrena conmigo:`;
  if (navigator.share) {
    await navigator.share({ title: 'REPP', text, url }).catch(() => undefined);
    return;
  }
  await navigator.clipboard.writeText(`${text} ${url}`);
  notify.success('Enlace copiado.');
}
