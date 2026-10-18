/**
 * Ilustraciones de los logros, en SVG.
 *
 * Archivo **puro** (sin React Native): las mismas cadenas se pintan en la app
 * con `SvgXml` y se rasterizan con `rsvg-convert` para revisarlas en una hoja de
 * contactos (`scripts/render-card-art.mjs`). Lienzo 120 × 120.
 *
 * Un solo estilo para las 35: masas planas con una sombra propia y un brillo,
 * sin contornos; dos tintas por motivo (`a` domina, `b` acompaña) y el lima de
 * la marca (`V`) como detalle. El color sale de `@/theme` (`artHues`).
 */
import { artHues, artShadow, artSpark, type ArtHue, type ArtHueName } from '../../theme/cards.ts';

export const ILLUSTRATION_KEYS = [
  'first-step', 'calendar-check', 'streak-flame', 'week-chain', 'weight-plate', 'mountain',
  'barbell-heavy', 'stack-sets', 'reps-counter', 'anatomy', 'compass', 'trophy', 'medal',
  'sunrise', 'moon', 'weekend', 'trending-up', 'lightning', 'target', 'heart-pulse', 'runner',
  'stopwatch', 'plank', 'hourglass', 'map-pin', 'chat-bubble', 'star', 'heart', 'download',
  'megaphone', 'pencil', 'calendar-week', 'crown',
  // Contrato 12: el premio del gimnasio y el comodín de racha.
  'gift', 'snowflake',
] as const;
export type IllustrationKey = (typeof ILLUSTRATION_KEYS)[number];

type Draw = (a: ArtHue, b: ArtHue) => string;
type Art = Readonly<{ hues: readonly [ArtHueName, ArtHueName]; draw: Draw }>;

const V = artHues.volt.main;
const W = artSpark;

const spark = (x: number, y: number, r: number, fill: string = W) =>
  `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${fill}"/>`;
const ground = (rx = 30, cy = 106) => `<ellipse cx="60" cy="${cy}" rx="${rx}" ry="4.5" fill="${artShadow}"/>`;
const grad = (id: string, top: string, bottom: string) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>`;
function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    points.push(`${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`);
  }
  return points.join(' ');
}

const HEART = 'M60 100C24 76 14 57 14 41C14 27 25 17 38 17C47 17 55 22 60 30C65 22 73 17 82 17C95 17 106 27 106 41C106 57 96 76 60 100Z';
const FOOT = 'M0 -30C9 -30 14 -20 14 -8C14 2 11 8 10 16C9 25 5 30 -1 30C-7 30 -11 25 -11 17C-11 9 -9 3 -10 -7C-11 -20 -8 -30 0 -30Z';

export const CARD_ART: Readonly<Record<IllustrationKey, Art>> = {
  'first-step': {
    hues: ['mint', 'cream'],
    draw: (a, b) =>
      `${ground(34)}<g transform="translate(40 66) rotate(-14)"><path d="${FOOT}" fill="${a.deep}"/><path d="${FOOT}" fill="${a.main}" transform="translate(-2 -3)"/><rect x="-9" y="-14" width="18" height="4" rx="2" fill="${a.light}"/><rect x="-9" y="-5" width="18" height="4" rx="2" fill="${a.light}"/><rect x="-8" y="10" width="14" height="4" rx="2" fill="${a.light}"/></g>` +
      `<g transform="translate(80 46) rotate(12)"><path d="${FOOT}" fill="${b.deep}"/><path d="${FOOT}" fill="${b.main}" transform="translate(-2 -3)"/><rect x="-9" y="-14" width="18" height="4" rx="2" fill="${b.deep}"/><rect x="-9" y="-5" width="18" height="4" rx="2" fill="${b.deep}"/><rect x="-8" y="10" width="14" height="4" rx="2" fill="${b.deep}"/></g>${spark(98, 86, 7, V)}`,
  },
  'calendar-check': {
    hues: ['sky', 'mint'],
    draw: (a, b) =>
      `${ground(36)}<rect x="20" y="26" width="80" height="74" rx="14" fill="${a.deep}"/><rect x="20" y="22" width="80" height="74" rx="14" fill="${a.light}"/><path d="M20 36C20 28 26 22 34 22H86C94 22 100 28 100 36V46H20Z" fill="${a.main}"/><rect x="36" y="13" width="7" height="20" rx="3.5" fill="${a.ink}"/><rect x="77" y="13" width="7" height="20" rx="3.5" fill="${a.ink}"/><circle cx="60" cy="70" r="19" fill="${b.deep}"/><circle cx="60" cy="68" r="19" fill="${b.main}"/><path d="M50 68L57 76L71 60" fill="none" stroke="${W}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  'streak-flame': {
    hues: ['ember', 'sun'],
    draw: (a, b) =>
      `${grad('f', a.main, a.deep)}${ground(26)}<path d="M60 10C66 30 88 40 88 67C88 88 75 104 60 104C45 104 32 88 32 67C32 54 39 46 46 39C46 50 50 55 55 55C52 40 54 24 60 10Z" fill="url(#f)"/><path d="M60 50C64 61 76 68 76 82C76 94 69 102 60 102C51 102 44 94 44 82C44 73 49 68 53 63C54 70 56 73 59 73C57 64 58 57 60 50Z" fill="${b.main}"/><path d="M60 76C63 81 68 84 68 91C68 97 64 101 60 101C56 101 52 97 52 91C52 86 56 82 60 76Z" fill="${b.light}"/>${spark(92, 30, 6)}${spark(26, 50, 4)}`,
  },
  'week-chain': {
    hues: ['mint', 'sky'],
    draw: (a, b) =>
      `${ground(38)}<g transform="rotate(-24 60 58)"><rect x="10" y="38" width="58" height="42" rx="21" fill="none" stroke="${a.deep}" stroke-width="13"/><rect x="10" y="35" width="58" height="42" rx="21" fill="none" stroke="${a.main}" stroke-width="13"/><rect x="52" y="38" width="58" height="42" rx="21" fill="none" stroke="${b.deep}" stroke-width="13"/><rect x="52" y="35" width="58" height="42" rx="21" fill="none" stroke="${b.main}" stroke-width="13"/><path d="M52 56V50C52 42 58 36 66 35" fill="none" stroke="${a.main}" stroke-width="13"/><path d="M22 44C26 40 32 39 40 39" fill="none" stroke="${a.light}" stroke-width="3.5" stroke-linecap="round"/><path d="M76 39H92" fill="none" stroke="${b.light}" stroke-width="3.5" stroke-linecap="round"/></g>`,
  },
  'weight-plate': {
    hues: ['steel', 'volt'],
    draw: (a, b) =>
      `${ground(34, 108)}<circle cx="60" cy="59" r="45" fill="${a.ink}"/><circle cx="60" cy="56" r="45" fill="${a.deep}"/><circle cx="60" cy="56" r="39" fill="${a.ink}"/><circle cx="60" cy="56" r="33" fill="none" stroke="${b.main}" stroke-width="5"/><circle cx="60" cy="56" r="17" fill="${a.main}"/><circle cx="60" cy="56" r="8" fill="${a.ink}"/><path d="M26 40A38 38 0 0 1 52 19" fill="none" stroke="${a.light}" stroke-width="4" stroke-linecap="round"/><rect x="56" y="18" width="8" height="12" rx="3" fill="${b.light}"/><rect x="56" y="82" width="8" height="12" rx="3" fill="${b.light}"/><rect x="22" y="52" width="12" height="8" rx="3" fill="${b.light}"/><rect x="86" y="52" width="12" height="8" rx="3" fill="${b.light}"/>`,
  },
  mountain: {
    hues: ['sky', 'cream'],
    draw: (a, b) =>
      `<path d="M8 100L36 56L62 100Z" fill="${a.deep}"/><path d="M22 100L62 22L106 100Z" fill="${a.main}"/><path d="M62 22L106 100H62Z" fill="${a.deep}"/><path d="M62 22L76 47L68 44L62 54L55 44L48 49Z" fill="${b.light}"/><path d="M62 22L76 47L68 44L62 54Z" fill="${b.main}"/><rect x="60.5" y="6" width="3" height="18" rx="1.5" fill="${a.ink}"/><path d="M63 7L80 12L63 18Z" fill="${V}"/><rect x="6" y="98" width="108" height="6" rx="3" fill="${a.ink}"/>${spark(24, 30, 5)}${spark(98, 40, 4)}`,
  },
  'barbell-heavy': {
    hues: ['steel', 'ember'],
    draw: (a, b) =>
      `${ground(40)}<g transform="rotate(-14 60 58)"><rect x="4" y="55" width="112" height="7" rx="3.5" fill="${a.main}"/><rect x="4" y="55" width="112" height="3" rx="1.5" fill="${a.light}"/><rect x="18" y="24" width="13" height="68" rx="5" fill="${b.deep}"/><rect x="18" y="24" width="6" height="68" rx="3" fill="${b.main}"/><rect x="33" y="34" width="10" height="48" rx="4" fill="${b.main}"/><rect x="33" y="34" width="4" height="48" rx="2" fill="${b.light}"/><rect x="45" y="48" width="5" height="20" rx="2" fill="${a.deep}"/><rect x="89" y="24" width="13" height="68" rx="5" fill="${b.deep}"/><rect x="89" y="24" width="6" height="68" rx="3" fill="${b.main}"/><rect x="77" y="34" width="10" height="48" rx="4" fill="${b.main}"/><rect x="77" y="34" width="4" height="48" rx="2" fill="${b.light}"/><rect x="70" y="48" width="5" height="20" rx="2" fill="${a.deep}"/></g>${spark(100, 22, 6)}`,
  },
  'stack-sets': {
    hues: ['violet', 'mint'],
    draw: (a, b) =>
      `${ground(36, 108)}<path d="M60 58L106 80L60 102L14 80Z" fill="${a.ink}"/><path d="M60 52L106 74L60 96L14 74Z" fill="${a.deep}"/><path d="M60 40L106 62L60 84L14 62Z" fill="${a.ink}"/><path d="M60 34L106 56L60 78L14 56Z" fill="${a.main}"/><path d="M60 22L106 44L60 66L14 44Z" fill="${b.deep}"/><path d="M60 16L106 38L60 60L14 38Z" fill="${b.main}"/><path d="M60 24L88 38L60 51L32 38Z" fill="${b.light}" opacity="0.7"/>`,
  },
  'reps-counter': {
    hues: ['mint', 'cream'],
    draw: (a, b) =>
      `${ground(30)}<path d="M24 56A36 36 0 0 1 84 30" fill="none" stroke="${a.main}" stroke-width="11" stroke-linecap="round"/><path d="M96 16L92 44L70 28Z" fill="${a.main}"/><path d="M96 62A36 36 0 0 1 36 88" fill="none" stroke="${a.deep}" stroke-width="11" stroke-linecap="round"/><path d="M24 102L28 74L50 90Z" fill="${a.deep}"/><circle cx="60" cy="59" r="15" fill="${b.main}"/><rect x="50" y="56" width="20" height="6" rx="3" fill="${a.ink}"/><rect x="46" y="51" width="6" height="16" rx="2.5" fill="${a.ink}"/><rect x="68" y="51" width="6" height="16" rx="2.5" fill="${a.ink}"/>`,
  },
  anatomy: {
    hues: ['rose', 'sky'],
    draw: (a, b) =>
      `${ground(32)}<circle cx="60" cy="22" r="13" fill="${b.main}"/><path d="M52 32H68V42H52Z" fill="${b.deep}"/><path d="M20 58C20 46 30 40 44 40H76C90 40 100 46 100 58L92 74L84 62L80 100H40L36 62L28 74Z" fill="${a.main}"/><path d="M60 40H76C90 40 100 46 100 58L92 74L84 62L80 100H60Z" fill="${a.deep}"/><path d="M42 52C46 60 54 62 60 56C66 62 74 60 78 52" fill="none" stroke="${a.light}" stroke-width="4" stroke-linecap="round"/><path d="M60 62V92M50 72H70M51 83H69" fill="none" stroke="${a.light}" stroke-width="3.5" stroke-linecap="round"/>`,
  },
  compass: {
    hues: ['sky', 'ember'],
    draw: (a, b) =>
      `${ground(32, 108)}<circle cx="60" cy="59" r="45" fill="${a.ink}"/><circle cx="60" cy="56" r="45" fill="${a.main}"/><circle cx="60" cy="56" r="36" fill="${a.ink}"/><rect x="58" y="24" width="4" height="8" rx="2" fill="${a.light}"/><rect x="58" y="80" width="4" height="8" rx="2" fill="${a.light}"/><rect x="28" y="54" width="8" height="4" rx="2" fill="${a.light}"/><rect x="84" y="54" width="8" height="4" rx="2" fill="${a.light}"/><g transform="rotate(38 60 56)"><path d="M60 26L71 56H49Z" fill="${b.main}"/><path d="M60 26L71 56H60Z" fill="${b.deep}"/><path d="M60 86L71 56H49Z" fill="${a.light}"/><path d="M60 86L71 56H60Z" fill="${a.main}"/></g><circle cx="60" cy="56" r="5" fill="${W}"/><path d="M24 40A40 40 0 0 1 48 18" fill="none" stroke="${a.light}" stroke-width="4" stroke-linecap="round"/>`,
  },
  trophy: {
    hues: ['sun', 'ember'],
    draw: (a, b) =>
      `${grad('t', a.main, a.deep)}${ground(30, 108)}<path d="M36 30H24C22 30 20 32 20 34C20 48 28 56 40 58" fill="none" stroke="${a.deep}" stroke-width="7" stroke-linecap="round"/><path d="M84 30H96C98 30 100 32 100 34C100 48 92 56 80 58" fill="none" stroke="${a.deep}" stroke-width="7" stroke-linecap="round"/><path d="M34 16H86V44C86 60 75 71 60 71C45 71 34 60 34 44Z" fill="url(#t)"/><path d="M43 24V44C43 52 46 58 51 62" fill="none" stroke="${a.light}" stroke-width="5" stroke-linecap="round"/><rect x="54" y="70" width="12" height="15" fill="${a.deep}"/><rect x="42" y="83" width="36" height="9" rx="3" fill="${a.main}"/><rect x="34" y="91" width="52" height="12" rx="4" fill="${b.deep}"/><polygon points="${starPoints(63, 42, 12, 5)}" fill="${a.light}"/>${spark(98, 14, 6)}`,
  },
  medal: {
    hues: ['sun', 'sky'],
    draw: (a, b) =>
      `${ground(26, 108)}<path d="M36 6H56L68 48L52 56Z" fill="${b.main}"/><path d="M84 6H64L52 48L68 56Z" fill="${b.deep}"/><path d="M84 6H74L61 50L68 56Z" fill="${b.ink}" opacity="0.5"/><circle cx="60" cy="74" r="30" fill="${a.ink}"/><circle cx="60" cy="71" r="30" fill="${a.deep}"/><circle cx="60" cy="71" r="24" fill="${a.main}"/><polygon points="${starPoints(60, 72, 15, 6.5)}" fill="${a.light}"/><path d="M40 60A24 24 0 0 1 56 48" fill="none" stroke="${a.light}" stroke-width="3.5" stroke-linecap="round"/>`,
  },
  sunrise: {
    hues: ['sun', 'ember'],
    draw: (a, b) =>
      `<path d="M60 40V20M33 50L20 36M87 50L100 36M22 74H8M98 74H112" fill="none" stroke="${a.light}" stroke-width="6" stroke-linecap="round"/><path d="M32 78A28 28 0 0 1 88 78Z" fill="${a.main}"/><path d="M60 50A28 28 0 0 1 88 78H60Z" fill="${a.deep}"/><rect x="10" y="78" width="100" height="7" rx="3.5" fill="${b.main}"/><rect x="26" y="90" width="68" height="6" rx="3" fill="${b.deep}"/><rect x="42" y="101" width="36" height="6" rx="3" fill="${b.deep}" opacity="0.7"/>`,
  },
  moon: {
    hues: ['violet', 'sun'],
    draw: (a, b) =>
      `${grad('m', a.light, a.main)}<circle cx="60" cy="60" r="46" fill="${a.ink}" opacity="0.55"/><path d="M74 16A44 44 0 1 0 104 76A36 36 0 0 1 74 16Z" fill="url(#m)"/><circle cx="44" cy="62" r="6" fill="${a.deep}" opacity="0.45"/><circle cx="58" cy="84" r="4" fill="${a.deep}" opacity="0.45"/><circle cx="38" cy="40" r="3.5" fill="${a.deep}" opacity="0.45"/>${spark(92, 36, 8, b.main)}${spark(104, 58, 4, b.light)}${spark(80, 54, 4, b.light)}`,
  },
  weekend: {
    hues: ['sun', 'sky'],
    draw: (a, b) =>
      `<path d="M60 10V20M60 100V110M10 60H20M100 60H110M25 25L32 32M88 88L95 95M95 25L88 32M32 88L25 95" fill="none" stroke="${a.light}" stroke-width="6" stroke-linecap="round"/><circle cx="60" cy="62" r="32" fill="${a.deep}"/><circle cx="60" cy="59" r="32" fill="${a.main}"/><rect x="34" y="48" width="22" height="15" rx="7" fill="${b.ink}"/><rect x="64" y="48" width="22" height="15" rx="7" fill="${b.ink}"/><rect x="54" y="51" width="12" height="4" fill="${b.ink}"/><rect x="38" y="51" width="8" height="3" rx="1.5" fill="${b.main}"/><rect x="68" y="51" width="8" height="3" rx="1.5" fill="${b.main}"/><path d="M48 72C54 80 66 80 72 72" fill="none" stroke="${a.ink}" stroke-width="4" stroke-linecap="round"/>`,
  },
  'trending-up': {
    hues: ['mint', 'volt'],
    draw: (a, b) =>
      `<rect x="14" y="76" width="20" height="28" rx="5" fill="${a.deep}"/><rect x="42" y="60" width="20" height="44" rx="5" fill="${a.main}"/><rect x="70" y="42" width="20" height="62" rx="5" fill="${a.main}"/><rect x="70" y="42" width="8" height="62" rx="4" fill="${a.light}" opacity="0.6"/><rect x="42" y="60" width="8" height="44" rx="4" fill="${a.light}" opacity="0.6"/><path d="M14 60L42 38L62 50L98 18" fill="none" stroke="${b.main}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="M106 10L80 14L102 36Z" fill="${b.main}" stroke="${b.main}" stroke-width="3" stroke-linejoin="round"/>`,
  },
  lightning: {
    hues: ['sun', 'violet'],
    draw: (a, b) =>
      `<circle cx="60" cy="60" r="42" fill="${b.main}" opacity="0.45"/><circle cx="60" cy="60" r="30" fill="${b.deep}" opacity="0.6"/><path d="M70 6L28 66H54L46 114L94 48H66Z" fill="${a.deep}"/><path d="M68 4L26 64H52L44 112L92 46H64Z" fill="${a.main}"/><path d="M62 24L40 56H56L52 80" fill="none" stroke="${a.light}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>${spark(98, 22, 6)}${spark(20, 92, 5)}`,
  },
  target: {
    hues: ['rose', 'cream'],
    draw: (a, b) =>
      `${ground(32, 110)}<circle cx="56" cy="63" r="44" fill="${a.ink}"/><circle cx="56" cy="60" r="44" fill="${a.main}"/><circle cx="56" cy="60" r="34" fill="${b.light}"/><circle cx="56" cy="60" r="24" fill="${a.main}"/><circle cx="56" cy="60" r="14" fill="${b.light}"/><circle cx="56" cy="60" r="6" fill="${a.deep}"/><path d="M56 60L98 18" fill="none" stroke="${a.ink}" stroke-width="5" stroke-linecap="round"/><path d="M98 18L112 14L108 28L98 32L94 22Z" fill="${V}"/><path d="M56 60L52 72L64 64Z" fill="${a.ink}"/>`,
  },
  'heart-pulse': {
    hues: ['rose', 'cream'],
    draw: (a, b) =>
      `${grad('h', a.main, a.deep)}${ground(22, 108)}<path d="${HEART}" fill="url(#h)"/><ellipse cx="38" cy="36" rx="11" ry="7" fill="${a.light}" opacity="0.85" transform="rotate(-32 38 36)"/><path d="M8 60H38L47 42L58 78L68 50L74 60H112" fill="none" stroke="${b.light}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  runner: {
    hues: ['sky', 'volt'],
    draw: (a, b) =>
      `${ground(40, 104)}<g transform="rotate(-9 60 66)"><path d="M14 84H102C109 84 110 94 104 96H18C10 96 8 86 14 84Z" fill="${W}"/><path d="M18 90H104" fill="none" stroke="${b.main}" stroke-width="5" stroke-linecap="round"/><path d="M18 84C15 66 20 50 32 42L46 60C54 67 68 70 80 71C94 72 102 78 102 84Z" fill="${a.main}"/><path d="M32 42L46 60C54 67 68 70 80 71C70 78 50 80 18 84C15 66 20 50 32 42Z" fill="${a.deep}" opacity="0.55"/><path d="M22 58C30 62 38 72 40 84" fill="none" stroke="${b.main}" stroke-width="6" stroke-linecap="round"/><path d="M50 58L44 66M60 63L54 71M70 66L64 74" fill="none" stroke="${W}" stroke-width="4" stroke-linecap="round"/></g><path d="M4 40H26M10 54H24M2 26H18" fill="none" stroke="${a.light}" stroke-width="5" stroke-linecap="round"/>`,
  },
  stopwatch: {
    hues: ['steel', 'ember'],
    draw: (a, b) =>
      `${ground(28, 110)}<rect x="52" y="6" width="16" height="14" rx="4" fill="${a.deep}"/><rect x="84" y="24" width="14" height="10" rx="4" fill="${a.deep}" transform="rotate(42 91 29)"/><circle cx="60" cy="67" r="40" fill="${a.ink}"/><circle cx="60" cy="64" r="40" fill="${a.main}"/><circle cx="60" cy="64" r="32" fill="${a.light}"/><path d="M60 64V32A32 32 0 0 1 88 48Z" fill="${b.main}" opacity="0.55"/><path d="M60 64L80 44" fill="none" stroke="${b.deep}" stroke-width="6" stroke-linecap="round"/><circle cx="60" cy="64" r="6" fill="${a.ink}"/><rect x="58" y="36" width="4" height="7" rx="2" fill="${a.ink}"/><rect x="58" y="85" width="4" height="7" rx="2" fill="${a.ink}"/><rect x="32" y="62" width="7" height="4" rx="2" fill="${a.ink}"/><rect x="81" y="62" width="7" height="4" rx="2" fill="${a.ink}"/>`,
  },
  plank: {
    hues: ['violet', 'mint'],
    draw: (a, b) =>
      `<rect x="8" y="92" width="104" height="7" rx="3.5" fill="${b.deep}"/><circle cx="92" cy="44" r="11" fill="${a.light}"/><path d="M84 56L22 84" fill="none" stroke="${a.main}" stroke-width="15" stroke-linecap="round"/><path d="M84 56L52 70" fill="none" stroke="${a.deep}" stroke-width="15" stroke-linecap="round" opacity="0.5"/><path d="M82 60V88H102" fill="none" stroke="${a.light}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 84L14 90" fill="none" stroke="${a.deep}" stroke-width="9" stroke-linecap="round"/><path d="M34 26A22 22 0 0 1 70 22" fill="none" stroke="${b.main}" stroke-width="5" stroke-linecap="round"/><path d="M52 16V28L60 32" fill="none" stroke="${b.light}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  hourglass: {
    hues: ['sun', 'sky'],
    draw: (a, b) =>
      `${ground(28, 110)}<path d="M36 20H84C84 44 67 52 67 60C67 68 84 76 84 100H36C36 76 53 68 53 60C53 52 36 44 36 20Z" fill="${b.light}" opacity="0.38"/><path d="M43 34H77C73 45 65 51 60 55C55 51 47 45 43 34Z" fill="${a.main}"/><path d="M60 54V82" fill="none" stroke="${a.deep}" stroke-width="3.5" stroke-linecap="round"/><path d="M40 100C44 86 54 80 60 80C66 80 76 86 80 100Z" fill="${a.main}"/><path d="M60 80C66 80 76 86 80 100H60Z" fill="${a.deep}"/><rect x="28" y="12" width="64" height="10" rx="5" fill="${b.main}"/><rect x="28" y="98" width="64" height="10" rx="5" fill="${b.deep}"/><path d="M44 28C46 40 52 46 54 50" fill="none" stroke="${W}" stroke-width="3.5" stroke-linecap="round" opacity="0.8"/>`,
  },
  'map-pin': {
    hues: ['rose', 'mint'],
    draw: (a, b) =>
      `${grad('p', a.main, a.deep)}${ground(20, 108)}<path d="M60 106C40 81 27 65 27 46C27 27 42 12 60 12C78 12 93 27 93 46C93 65 80 81 60 106Z" fill="url(#p)"/><circle cx="60" cy="46" r="19" fill="${W}"/><circle cx="60" cy="46" r="13" fill="${b.main}"/><path d="M53 46L58 52L68 40" fill="none" stroke="${W}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M36 36A26 26 0 0 1 50 20" fill="none" stroke="${a.light}" stroke-width="4" stroke-linecap="round"/>`,
  },
  'chat-bubble': {
    hues: ['sky', 'volt'],
    draw: (a, b) =>
      `${grad('c', a.main, a.deep)}<path d="M58 34H96C104 34 110 40 110 48V78C110 86 104 92 96 92H92L96 108L74 92H58C50 92 44 86 44 78V48C44 40 50 34 58 34Z" fill="${b.deep}"/><path d="M24 12H76C84 12 90 18 90 26V60C90 68 84 74 76 74H46L24 92L28 74H24C16 74 10 68 10 60V26C10 18 16 12 24 12Z" fill="url(#c)"/><circle cx="32" cy="43" r="6" fill="${W}"/><circle cx="50" cy="43" r="6" fill="${W}"/><circle cx="68" cy="43" r="6" fill="${W}"/><path d="M20 26C22 22 26 20 30 20" fill="none" stroke="${a.light}" stroke-width="4" stroke-linecap="round"/>`,
  },
  star: {
    hues: ['sun', 'ember'],
    draw: (a, b) =>
      `${ground(26, 110)}<polygon points="${starPoints(60, 61, 50, 22)}" fill="${b.deep}" stroke="${b.deep}" stroke-width="6" stroke-linejoin="round"/><polygon points="${starPoints(60, 57, 50, 22)}" fill="${a.main}" stroke="${a.main}" stroke-width="6" stroke-linejoin="round"/><polygon points="${starPoints(60, 57, 30, 13)}" fill="${a.light}" opacity="0.75"/>${spark(100, 20, 7)}${spark(18, 30, 5)}`,
  },
  heart: {
    hues: ['rose', 'ember'],
    draw: (a, b) =>
      `${grad('e', a.main, a.deep)}${ground(22, 108)}<path d="${HEART}" fill="url(#e)"/><ellipse cx="38" cy="36" rx="12" ry="7.5" fill="${a.light}" opacity="0.9" transform="rotate(-32 38 36)"/>${spark(100, 16, 7, b.light)}${spark(14, 78, 5, b.light)}`,
  },
  download: {
    hues: ['mint', 'sky'],
    draw: (a, b) =>
      `<path d="M18 76V90C18 96 23 101 29 101H91C97 101 102 96 102 90V76" fill="none" stroke="${b.deep}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 73V87C18 93 23 98 29 98H91C97 98 102 93 102 87V73" fill="none" stroke="${b.main}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/><rect x="51" y="10" width="18" height="46" rx="6" fill="${a.main}"/><path d="M34 48H86L60 80Z" fill="${a.main}" stroke="${a.main}" stroke-width="7" stroke-linejoin="round"/><rect x="55" y="14" width="6" height="34" rx="3" fill="${a.light}"/>`,
  },
  megaphone: {
    hues: ['ember', 'sun'],
    draw: (a, b) =>
      `<rect x="36" y="62" width="12" height="30" rx="5" fill="${a.ink}" transform="rotate(-12 42 77)"/><path d="M28 46L82 20V88L28 64Z" fill="${a.main}"/><path d="M28 55L82 54V88L28 64Z" fill="${a.deep}"/><rect x="14" y="44" width="18" height="22" rx="6" fill="${b.main}"/><ellipse cx="83" cy="54" rx="8" ry="35" fill="${a.ink}"/><ellipse cx="83" cy="54" rx="4" ry="28" fill="${b.light}"/><path d="M98 38A22 22 0 0 1 98 70M106 26A40 40 0 0 1 106 82" fill="none" stroke="${b.main}" stroke-width="5.5" stroke-linecap="round"/>`,
  },
  pencil: {
    hues: ['sun', 'rose'],
    draw: (a, b) =>
      `<path d="M18 104C36 106 58 98 74 104" fill="none" stroke="${V}" stroke-width="5" stroke-linecap="round"/><g transform="rotate(42 60 56)"><rect x="48" y="8" width="24" height="16" rx="5" fill="${b.main}"/><rect x="48" y="20" width="24" height="9" fill="${a.ink}" opacity="0.55"/><rect x="48" y="28" width="24" height="52" fill="${a.main}"/><rect x="48" y="28" width="8" height="52" fill="${a.light}"/><rect x="64" y="28" width="8" height="52" fill="${a.deep}"/><path d="M48 80H72L60 104Z" fill="${artHues.cream.main}"/><path d="M55 94H65L60 104Z" fill="${a.ink}"/></g>${spark(98, 24, 7)}`,
  },
  'calendar-week': {
    hues: ['violet', 'volt'],
    draw: (a, b) =>
      `${ground(36)}<rect x="16" y="26" width="88" height="74" rx="14" fill="${a.deep}"/><rect x="16" y="22" width="88" height="74" rx="14" fill="${a.light}"/><path d="M16 36C16 28 22 22 30 22H90C98 22 104 28 104 36V46H16Z" fill="${a.main}"/><rect x="34" y="13" width="7" height="20" rx="3.5" fill="${a.ink}"/><rect x="79" y="13" width="7" height="20" rx="3.5" fill="${a.ink}"/>` +
      [0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${27 + i * 11}" cy="62" r="4.4" fill="${a.ink}"/>`).join('') +
      [0, 1, 2, 3, 4].map((i) => `<circle cx="${27 + i * 11}" cy="62" r="4.4" fill="${b.deep}"/>`).join('') +
      `<rect x="22" y="74" width="76" height="12" rx="6" fill="${a.main}" opacity="0.35"/><rect x="22" y="74" width="54" height="12" rx="6" fill="${b.deep}"/>`,
  },
  crown: {
    hues: ['sun', 'rose'],
    draw: (a, b) =>
      `${grad('k', a.main, a.deep)}${ground(34, 108)}<path d="M22 82L14 36L40 56L60 22L80 56L106 36L98 82Z" fill="url(#k)" stroke="${a.main}" stroke-width="4" stroke-linejoin="round"/><path d="M60 22L80 56L106 36L98 82H60Z" fill="${a.deep}" opacity="0.45"/><rect x="20" y="80" width="80" height="16" rx="5" fill="${a.deep}"/><rect x="20" y="80" width="80" height="6" rx="3" fill="${a.light}" opacity="0.7"/><circle cx="14" cy="36" r="7" fill="${b.main}"/><circle cx="106" cy="36" r="7" fill="${b.main}"/><circle cx="60" cy="22" r="8" fill="${b.main}"/><circle cx="58" cy="20" r="2.5" fill="${W}"/><circle cx="60" cy="89" r="5" fill="${b.main}"/><circle cx="38" cy="89" r="3.5" fill="${V}"/><circle cx="82" cy="89" r="3.5" fill="${V}"/>${spark(96, 12, 6)}`,
  },
  gift: {
    hues: ['rose', 'sun'],
    draw: (a, b) =>
      `${grad('g', a.main, a.deep)}${ground(38, 106)}<rect x="20" y="52" width="80" height="50" rx="8" fill="${a.deep}"/><rect x="20" y="48" width="80" height="50" rx="8" fill="url(#g)"/><rect x="14" y="34" width="92" height="20" rx="7" fill="${a.main}"/><rect x="14" y="34" width="92" height="7" rx="3.5" fill="${a.light}" opacity="0.7"/><rect x="53" y="34" width="14" height="64" fill="${b.main}"/><rect x="53" y="54" width="14" height="44" fill="${b.deep}" opacity="0.45"/><path d="M60 34C50 16 28 14 31 28C32 35 46 37 60 34Z" fill="${b.main}"/><path d="M60 34C70 16 92 14 89 28C88 35 74 37 60 34Z" fill="${b.deep}"/><circle cx="60" cy="33" r="7" fill="${b.light}"/>${spark(100, 16, 7)}${spark(16, 72, 5, V)}`,
  },
  snowflake: {
    hues: ['sky', 'cream'],
    draw: (a, b) =>
      `${ground(26, 110)}` +
      [0, 60, 120]
        .map(
          (turn) =>
            `<g transform="rotate(${turn} 60 58)"><rect x="55" y="15" width="10" height="92" rx="5" fill="${a.deep}"/></g>`,
        )
        .join('') +
      [0, 60, 120]
        .map(
          (turn) =>
            `<g transform="rotate(${turn} 60 58)"><rect x="55" y="12" width="10" height="92" rx="5" fill="${a.main}"/><path d="M60 28L48 17M60 28L72 17M60 88L48 99M60 88L72 99" fill="none" stroke="${a.light}" stroke-width="6" stroke-linecap="round"/></g>`,
        )
        .join('') +
      `<polygon points="72.1,51 72.1,65 60,72 47.9,65 47.9,51 60,44" fill="${b.main}"/><circle cx="60" cy="58" r="5" fill="${W}"/>${spark(100, 22, 7)}${spark(18, 92, 5, V)}`,
  },
};

const cache = new Map<string, string>();

/** SVG completo de una ilustración; `muted` la deja en acero para las pendientes. */
export function cardArtXml(key: IllustrationKey, muted = false): string {
  const id = `${key}:${muted ? 'm' : 'c'}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const art = CARD_ART[key];
  const a = muted ? artHues.steel : artHues[art.hues[0]];
  const b = muted ? artHues.steel : artHues[art.hues[1]];
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${art.draw(a, b)}</svg>`;
  cache.set(id, xml);
  return xml;
}

/** Color dominante del motivo: tiñe la luz de detrás en la carta. */
export function cardArtTint(key: IllustrationKey): string {
  return artHues[CARD_ART[key].hues[0]].main;
}
