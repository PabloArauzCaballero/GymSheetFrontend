import type { NudgeSnapshot } from './snapshot';

/**
 * Web: no hay widgets. iOS y Android tienen su `widgets.<plataforma>.tsx`.
 *
 * Tiene que ser `.tsx` como ellos: Metro prueba primero todas las plataformas
 * de una extensión y después la siguiente extensión, así que un `widgets.ts`
 * ganaba a `widgets.ios.tsx` y en iOS no se publicaba nada.
 */
export async function publishWidgets(_snapshot: NudgeSnapshot): Promise<void> {}
