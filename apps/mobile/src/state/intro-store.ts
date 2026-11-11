import { create } from 'zustand';

/**
 * Si la entrada de marca del arranque ya terminó.
 *
 * La entrada es una capa dentro del árbol de React, y un `<Modal>` nativo se
 * dibuja por encima de cualquier vista. Lo que se presente solo —el tutorial
 * de la primera vez— tiene que esperar a esta señal, o aparecería sobre la
 * marca a medio armar cuando la sesión se restaura deprisa.
 *
 * Solo va de `false` a `true`, una vez por arranque.
 */
interface IntroState {
  finished: boolean;
  finish: () => void;
}

export const useIntroStore = create<IntroState>((set) => ({
  finished: false,
  finish: () => set({ finished: true }),
}));
