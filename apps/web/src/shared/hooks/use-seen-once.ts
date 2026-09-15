'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * `true` desde la primera vez que el elemento entra en pantalla, y para siempre.
 *
 * Sirve para que un contador o una barra debajo del pliegue no gasten su
 * animación sin que nadie la vea: esperan a ser vistos.
 *
 * Sin `IntersectionObserver` (servidor, jsdom, navegadores muy viejos) se da por
 * visto de entrada. Es la opción segura: la cifra llega a su valor igual.
 */
export function useSeenOnce(ref: RefObject<Element | null>, rootMargin = '0px 0px -10% 0px'): boolean {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (seen) return;
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin, seen]);

  return seen;
}
