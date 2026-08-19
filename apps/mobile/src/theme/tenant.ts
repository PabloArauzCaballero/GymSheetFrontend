import { useSyncExternalStore } from 'react';
import { defaultTenant, resolveTenant, type TenantDefinition } from '@gymsheet/design-tokens';
import { env } from '@/config/env';

/**
 * Marca activa de la aplicación.
 *
 * A diferencia de la web, aquí la identidad no puede salir de la URL: se instala
 * una sola aplicación y el gimnasio se sabe al iniciar sesión, porque la cuenta
 * dice a cuál pertenece. Por eso el valor es mutable y observable en vez de una
 * constante: cambia cuando se resuelve la sesión y la interfaz debe repintarse.
 *
 * `EXPO_PUBLIC_TENANT` sigue existiendo para las compilaciones dedicadas de un
 * gimnasio, que arrancan ya con su marca antes incluso de la pantalla de acceso.
 */
let active: TenantDefinition = resolveTenant(env.tenantId);

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * Fija la marca de la sesión. Un id desconocido o ausente devuelve a la
 * identidad de referencia: al cerrar sesión la aplicación no debe quedarse
 * pintada con los colores del gimnasio anterior.
 */
export function setActiveTenant(id: string | null | undefined): void {
  const next = resolveTenant(id);
  if (next.id === active.id) return;
  active = next;
  emit();
}

export function getActiveTenant(): TenantDefinition {
  return active;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/**
 * Suscribe un componente a la marca activa.
 *
 * Se usa en la raíz para forzar el repintado; el resto de la interfaz lee los
 * colores del tema, que ya resuelven contra la marca vigente en cada render.
 */
export function useActiveTenant(): TenantDefinition {
  return useSyncExternalStore(subscribe, getActiveTenant, getActiveTenant);
}

export { defaultTenant };
export type { TenantDefinition };
