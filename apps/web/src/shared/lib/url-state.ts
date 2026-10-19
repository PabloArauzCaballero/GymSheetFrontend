/**
 * Escribe el estado de una pantalla en la URL (`?tab=…`) sin pedirle nada al
 * servidor. `router.replace` con otra query vuelve a pedir la página a Next (una
 * ida y vuelta por cada filtro, y sin red la navegación se rompe); Next integra
 * `history.replaceState` con `useSearchParams`, así que la pantalla se entera y
 * la URL queda compartible y recuperable con el botón Atrás.
 */
export function replaceSearch(search: string): void {
  const url = `${window.location.pathname}${search ? `?${search}` : ''}`;
  // Con `null` y no con `history.state`: Next ignora las llamadas que arrastran su estado interno.
  window.history.replaceState(null, '', url);
}
