'use client';

import { ImageOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/shared/lib/cn';

// Redirige URLs externas al proxy del BFF (`/api/media`) para servirlas desde el
// mismo origen: evita mixed-content, hotlink y CORS. Las rutas locales o `data:`
// se dejan intactas.
export function mediaProxyUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? `/api/media?url=${encodeURIComponent(value)}` : value;
}

const throughProxy = mediaProxyUrl;

export function DomainImage({
  alt,
  className,
  src,
  fallbackSrc,
  proxy = true,
}: Readonly<{
  alt: string;
  className?: string;
  src: string;
  fallbackSrc?: string | null;
  proxy?: boolean;
}>) {
  // Orden de intento: miniatura/fuente principal y luego el respaldo. Así una
  // miniatura rota (p. ej. bloqueo de hotlink) no descarta la imagen completa.
  const candidates = useMemo(() => {
    const map = proxy ? throughProxy : (value: string) => value;
    return [src, fallbackSrc]
      .filter((value): value is string => Boolean(value))
      .map(map)
      .filter((value, position, all) => all.indexOf(value) === position);
  }, [src, fallbackSrc, proxy]);

  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Reinicia el ciclo de intentos cuando cambian las fuentes, ajustando estado
  // durante el render (patrón admitido por React) para no depender de `key`.
  const identity = candidates.join('|');
  const [seen, setSeen] = useState(identity);
  if (identity !== seen) {
    setSeen(identity);
    setIndex(0);
    setLoaded(false);
  }

  const failed = index >= candidates.length;

  if (failed) {
    return (
      <span
        className="grid size-full place-items-center bg-gradient-to-br from-[var(--surface)] to-[var(--surface-low)] text-[var(--text-disabled)]"
        role="img"
        aria-label={`${alt}: imagen no disponible`}
      >
        <ImageOff aria-hidden className="size-10" />
      </span>
    );
  }

  return (
    <span className="relative block size-full overflow-hidden bg-[var(--surface-high)]">
      {!loaded ? (
        <span
          aria-hidden
          className="shimmer absolute inset-0 overflow-hidden bg-gradient-to-br from-[var(--surface-high)] via-[var(--surface)] to-[var(--surface-high)]"
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element -- URLs dinámicas validadas por el backend. */}
      <img
        alt={alt}
        className={cn(
          // Defaults seguros: la imagen llena el contenedor sin deformarse ni
          // desbordar aunque el `className` del llamador los omita. El llamador
          // puede sobrescribir (p. ej. `object-contain`) porque va después.
          'size-full max-w-full object-cover',
          className,
          'transition-opacity duration-500 ease-out',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
        decoding="async"
        key={candidates[index]}
        loading="lazy"
        onError={() => {
          setLoaded(false);
          setIndex((current) => current + 1);
        }}
        onLoad={() => setLoaded(true)}
        // `no-referrer` evita que CDNs con protección anti-hotlink devuelvan imágenes vacías.
        referrerPolicy="no-referrer"
        src={candidates[index]}
      />
    </span>
  );
}
