import type { NudgeSnapshot } from './snapshot';

/** Web: no hay widgets. iOS y Android tienen su `widgets.<plataforma>.tsx`. */
export async function publishWidgets(_snapshot: NudgeSnapshot): Promise<void> {}
