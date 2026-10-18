'use client';

import { prizeCodeGroups } from '@gymsheet/domain';
import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * El código de un premio, grande y en dos grupos («K7M 2QX») para leerlo en
 * voz alta en recepción, con un botón de copiar al lado.
 *
 * `tone="stage"` es el escenario de la celebración, siempre oscuro; `surface`,
 * la superficie del tema (claro u oscuro). El texto es seleccionable: copiar a
 * mano también tiene que funcionar si el portapapeles está bloqueado.
 */
export function PrizeCode({
  code,
  tone = 'surface',
  muted = false,
  size = 'md',
}: Readonly<{ code: string; tone?: 'stage' | 'surface'; muted?: boolean; size?: 'md' | 'lg' }>) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Sin permiso de portapapeles: el código sigue ahí, seleccionable.
    }
  }

  const stage = tone === 'stage';
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'select-all font-mono font-semibold tabular-nums tracking-[0.18em]',
          size === 'lg' ? 'text-3xl' : 'text-2xl',
          muted ? 'line-through decoration-1' : '',
          stage
            ? 'text-[rgb(var(--sheen-channels))]'
            : muted
              ? 'text-[var(--text-disabled)]'
              : 'text-[var(--text)]',
        )}
      >
        {prizeCodeGroups(code)}
      </span>
      {muted ? null : (
        <button
          aria-label={copied ? 'Código copiado' : 'Copiar el código'}
          className={cn(
            'inline-flex size-11 shrink-0 items-center justify-center rounded-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2',
            stage
              ? 'text-[rgb(var(--sheen-channels)/0.78)] hover:bg-[rgb(var(--sheen-channels)/0.1)] focus-visible:ring-[rgb(var(--sheen-channels))]'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-high)] hover:text-[var(--text)] focus-visible:ring-[var(--accent-ink)]',
          )}
          onClick={() => void copy()}
          type="button"
        >
          {copied ? (
            <Check aria-hidden className="size-5" />
          ) : (
            <Copy aria-hidden className="size-5" />
          )}
        </button>
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Código copiado' : ''}
      </span>
    </div>
  );
}
