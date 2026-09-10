import { useEffect, useState } from 'react';

/**
 * Espeja `apps/web/src/shared/hooks/use-debounced-value.ts`, sin `window.`:
 * en React Native los timers son globales, no propiedades de un objeto `window`.
 *
 * Vive aquí y no en `packages/hooks` porque ese paquete documenta que no
 * exporta hooks acoplados a React — `apps/mobile` está en nohoist y acabaría
 * con dos copias de React.
 *
 * El caso de uso es un buscador: el `TextInput` conserva su propio estado para
 * que el teclado responda al instante, y este valor retrasado es el que entra
 * en los filtros y en la `queryKey`, de modo que no salga una petición por tecla.
 */
export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);
  return debounced;
}
