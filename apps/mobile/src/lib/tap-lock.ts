/**
 * Cerrojo de toques: una acción que navega o guarda responde una vez por toque
 * real. Puro, para poder probarlo sin React.
 *
 * Un doble toque en «Siguiente» apilaba dos pantallas del asistente; en
 * «Seguir», dos navegaciones. El cerrojo se abre solo pasado `ms` (lo que tarda
 * la transición), así que nunca deja un botón muerto.
 */
export function createTapLock(ms = 600, now: () => number = Date.now) {
  let until = 0;
  return {
    /** Ejecuta `run` si el cerrojo está abierto; devuelve si se ejecutó. */
    run(run: () => void): boolean {
      const at = now();
      if (at < until) return false;
      until = at + ms;
      run();
      return true;
    },
    release() {
      until = 0;
    },
  };
}

export type TapLock = ReturnType<typeof createTapLock>;

/** Cerrojo compartido por los pasos del asistente: es una sola pila de navegación. */
export const wizardTapLock = createTapLock(600);
