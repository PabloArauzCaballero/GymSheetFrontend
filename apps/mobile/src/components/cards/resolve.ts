/**
 * Qué ilustración y qué material lleva cada logro. Puro (sin React Native).
 *
 * El servidor nuevo manda `illustration`; el de antes solo `icon` (un glifo de
 * Ionicons) y `category`. Se resuelve en ese orden, y siempre sale una
 * ilustración a color: ninguna carta se queda con un icono de línea.
 */
import { ILLUSTRATION_KEYS, type IllustrationKey } from './art.ts';

const KNOWN = new Set<string>(ILLUSTRATION_KEYS);

const BY_ICON: Readonly<Record<string, IllustrationKey>> = {
  footsteps: 'first-step',
  'checkmark-done': 'calendar-check',
  trophy: 'trophy',
  medal: 'medal',
  ribbon: 'medal',
  flame: 'streak-flame',
  bonfire: 'streak-flame',
  calendar: 'calendar-week',
  'calendar-number': 'week-chain',
  barbell: 'weight-plate',
  train: 'barbell-heavy',
  planet: 'mountain',
  flash: 'lightning',
  layers: 'stack-sets',
  repeat: 'reps-counter',
  body: 'anatomy',
  map: 'map-pin',
  compass: 'compass',
  library: 'stack-sets',
  'trending-up': 'trending-up',
  rocket: 'lightning',
  home: 'map-pin',
  heart: 'heart-pulse',
  sunny: 'sunrise',
  moon: 'moon',
  star: 'star',
  timer: 'stopwatch',
  stopwatch: 'stopwatch',
  walk: 'runner',
  bicycle: 'runner',
  chatbubble: 'chat-bubble',
  chatbubbles: 'chat-bubble',
  download: 'download',
  create: 'pencil',
  pencil: 'pencil',
  megaphone: 'megaphone',
  location: 'map-pin',
  hourglass: 'hourglass',
  gift: 'gift',
  snow: 'snowflake',
  people: 'chat-bubble',
  school: 'medal',
};

const BY_CATEGORY: Readonly<Record<string, IllustrationKey>> = {
  CONSTANCIA: 'streak-flame',
  VOLUMEN: 'weight-plate',
  FUERZA: 'barbell-heavy',
  VARIEDAD: 'compass',
  HITO: 'medal',
  SECRETA: 'moon',
  MODO: 'target',
  CARDIO: 'heart-pulse',
  SOCIAL: 'chat-bubble',
  CREADOR: 'pencil',
  COACH: 'medal',
};

export function resolveIllustration(badge: {
  illustration?: string | null;
  icon?: string | null;
  category?: string | null;
}): IllustrationKey {
  if (badge.illustration && KNOWN.has(badge.illustration)) return badge.illustration as IllustrationKey;
  const glyph = (badge.icon ?? '').replace(/-(outline|sharp)$/, '');
  const byIcon = BY_ICON[glyph];
  if (byIcon) return byIcon;
  return BY_CATEGORY[badge.category ?? ''] ?? 'star';
}

/** Secreta y sin conseguir: la carta sale velada, sin nombre ni ilustración. */
export function isVeiled(badge: { earned: boolean; secret?: boolean | null; category?: string | null; progress?: number | null }): boolean {
  if (badge.earned) return false;
  if (badge.secret != null) return badge.secret;
  return badge.category === 'SECRETA' && badge.progress == null;
}
