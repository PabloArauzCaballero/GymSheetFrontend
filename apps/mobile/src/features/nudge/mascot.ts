/**
 * Repi, la mascota de los recordatorios: una gota de agua (familia del isotipo
 * de REPP) con cinta en la frente y una mancuerna.
 *
 * Archivo **puro** (sin React Native), como `cards/art.ts`: la app pinta estas
 * cadenas con `SvgXml`, y `scripts/render-mascot.mjs` las rasteriza a PNG para
 * los widgets (que no pueden dibujar SVG) y para revisarlas en una hoja de
 * contactos. Lienzo 120 × 120, mismo estilo que las cartas: masas planas, una
 * sombra propia y un brillo, sin contornos.
 */
import { artHues, artShadow, artSpark } from '../../theme/cards.ts';

/** Un ánimo por nivel del recordatorio (plan 14 §2) y uno para los matches. */
export const MASCOT_MOODS = ['proud', 'wink', 'impatient', 'dramatic', 'asleep', 'resting', 'flirty'] as const;
export type MascotMood = (typeof MASCOT_MOODS)[number];

const body = artHues.volt;
const band = artHues.rose;
const metal = artHues.steel;
const tear = artHues.sky;
const face = body.ink;
const W = artSpark;

const DROP = 'M60 14C66 30 92 46 92 72C92 90 78 104 60 104C42 104 28 90 28 72C28 46 54 30 60 14Z';

const spark = (x: number, y: number, r: number, fill: string = W) =>
  `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${fill}"/>`;
const ground = `<ellipse cx="60" cy="108" rx="34" ry="4.5" fill="${artShadow}"/>`;
const line = (d: string, width = 3.5, color: string = face) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const arm = (d: string) => `${line(d, 8, body.deep)}${line(d, 6, body.main)}`;

/** Cuerpo con su sombra, el brillo y la cinta recortada a la gota. */
function drop(): string {
  return (
    `<defs><clipPath id="repi-body"><path d="${DROP}"/></clipPath></defs>` +
    `<path d="${DROP}" fill="${body.deep}"/>` +
    `<path d="${DROP}" fill="${body.main}" transform="translate(-2 -3)"/>` +
    `<g clip-path="url(#repi-body)"><rect x="20" y="45" width="80" height="9" fill="${band.main}"/><rect x="20" y="51" width="80" height="3" fill="${band.deep}"/></g>` +
    `<path d="M86 48L98 42L96 52Z" fill="${band.main}"/><path d="M86 50L97 57L91 59Z" fill="${band.deep}"/>` +
    `<ellipse cx="44" cy="36" rx="5" ry="9" fill="${body.light}" transform="rotate(28 44 36)"/>`
  );
}

/** Mancuerna centrada en (x, y), girada `deg` grados. */
function dumbbell(x: number, y: number, deg = 0, scale = 1): string {
  return (
    `<g transform="translate(${x} ${y}) rotate(${deg}) scale(${scale})">` +
    `<rect x="-14" y="-2.5" width="28" height="5" rx="2.5" fill="${metal.deep}"/>` +
    `<rect x="-17" y="-9" width="7" height="18" rx="3" fill="${metal.deep}"/><rect x="10" y="-9" width="7" height="18" rx="3" fill="${metal.deep}"/>` +
    `<rect x="-17" y="-9" width="7" height="15" rx="3" fill="${metal.main}"/><rect x="10" y="-9" width="7" height="15" rx="3" fill="${metal.main}"/>` +
    `<rect x="-16" y="-7" width="2" height="9" rx="1" fill="${metal.light}"/>` +
    `</g>`
  );
}

const eye = (x: number, y: number, lookX = 0, lookY = 0) =>
  `<ellipse cx="${x}" cy="${y}" rx="7" ry="8" fill="${W}"/><circle cx="${x + lookX}" cy="${y + 1 + lookY}" r="3.6" fill="${face}"/><circle cx="${x + lookX + 1.3}" cy="${y - 0.6 + lookY}" r="1.2" fill="${W}"/>`;
const blush = `<ellipse cx="39" cy="80" rx="5" ry="3" fill="${band.light}" opacity="0.7"/><ellipse cx="81" cy="80" rx="5" ry="3" fill="${band.light}" opacity="0.7"/>`;
const heart = (x: number, y: number, s: number, fill: string) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6C-6 2-8-1-8-4C-8-6.5-6-8-4-8C-2-8-0.8-7 0-5.5C0.8-7 2-8 4-8C6-8 8-6.5 8-4C8-1 6 2 0 6Z" fill="${fill}"/>`;

const MOODS: Readonly<Record<MascotMood, () => string>> = {
  // Ya entrenó: brazo arriba con la mancuerna, ojos felices, boca abierta.
  proud: () =>
    `${ground}${arm('M34 80L22 88')}${arm('M86 74L100 50')}${drop()}${dumbbell(101, 44, -20)}` +
    `${line('M42 70Q48 63 54 70')}${line('M66 70Q72 63 78 70')}${blush}` +
    `<path d="M50 82Q60 96 70 82Z" fill="${face}"/><path d="M55 88Q60 92 65 88Q60 86 55 88Z" fill="${band.main}"/>` +
    `${spark(20, 38, 6)}${spark(104, 84, 4, body.light)}`,
  // Toca hoy y aún es temprano: guiño y media sonrisa, mancuerna lista.
  wink: () =>
    `${ground}${arm('M34 82L24 90')}${arm('M86 82L98 92')}${drop()}${dumbbell(100, 96, 8, 0.9)}` +
    `${eye(48, 70, 1)}${line('M65 71Q71 66 77 71')}${line('M49 86Q60 92 71 83')}` +
    `${spark(102, 30, 5)}`,
  // Toca hoy y se hace tarde: ceja arriba, boca plana, brazos cruzados.
  impatient: () =>
    `${ground}${dumbbell(20, 100, 0, 0.85)}${drop()}` +
    `${eye(48, 70, 2.4)}${eye(72, 70, 2.4)}${line('M41 58L55 60')}${line('M65 57Q72 51 80 55')}` +
    `${line('M53 83H67')}${arm('M36 90Q56 102 74 94')}${arm('M84 90Q64 102 46 94')}`,
  // Racha en riesgo: cejas tristes, lágrimas a chorro, mancuerna tirada.
  dramatic: () =>
    `${ground}${arm('M34 84L26 98')}${arm('M86 84L94 98')}${dumbbell(98, 102, 24, 0.85)}${drop()}` +
    `${eye(48, 70, 0, 1.5)}${eye(72, 70, 0, 1.5)}${line('M40 60L54 56')}${line('M80 60L66 56')}` +
    `<path d="M44 78C42 88 40 96 38 104H46C47 96 48 88 48 78Z" fill="${tear.main}"/><path d="M76 78C78 88 80 96 82 104H74C73 96 72 88 72 78Z" fill="${tear.main}"/>` +
    `<path d="M50 92Q60 80 70 92Q60 88 50 92Z" fill="${face}"/>${spark(16, 70, 4, tear.light)}${spark(104, 66, 4, tear.light)}`,
  // Cinco días o más: se durmió, ladeada, con la mancuerna olvidada al lado.
  asleep: () =>
    `${ground}${dumbbell(100, 102, 0, 0.8)}<g transform="rotate(-12 60 104)">${drop()}` +
    `${line('M42 70Q48 75 54 70')}${line('M66 70Q72 75 78 70')}<ellipse cx="60" cy="86" rx="3.5" ry="4" fill="${face}"/></g>` +
    `<path d="M84 6H96L84 20H96" fill="none" stroke="${W}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M70 22H78L70 32H78" fill="none" stroke="${body.light}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  // Día de descanso programado: ojos entornados, botella de agua en la mano.
  resting: () =>
    `${ground}${arm('M34 82L26 92')}${drop()}` +
    `<rect x="90" y="62" width="14" height="30" rx="5" fill="${tear.deep}"/><rect x="90" y="60" width="14" height="30" rx="5" fill="${tear.main}"/>` +
    `<rect x="93" y="54" width="8" height="7" rx="2" fill="${W}"/><rect x="92" y="70" width="10" height="8" rx="2" fill="${tear.light}"/>${arm('M84 84L92 80')}` +
    `<path d="M41 68A7 7 0 0 0 55 68Z" fill="${W}"/><circle cx="48" cy="71" r="3" fill="${face}"/>` +
    `<path d="M65 68A7 7 0 0 0 79 68Z" fill="${W}"/><circle cx="72" cy="71" r="3" fill="${face}"/>` +
    `${line('M41 67H55', 3)}${line('M65 67H79', 3)}${line('M51 84Q60 90 69 84')}`,
  // Matches sin responder: ojos de corazón, rubor y globo de chat.
  flirty: () =>
    `${ground}${arm('M34 82L24 90')}${arm('M86 80L98 70')}${drop()}` +
    `<rect x="88" y="16" width="26" height="20" rx="8" fill="${tear.deep}"/><rect x="88" y="14" width="26" height="20" rx="8" fill="${tear.main}"/><path d="M94 32L92 40L100 33Z" fill="${tear.main}"/>${heart(101, 24, 0.8, W)}` +
    `${heart(48, 70, 1, band.main)}${heart(72, 70, 1, band.main)}${blush}${line('M50 84Q60 92 70 84')}`,
};

/** El SVG completo de Repi con un ánimo. */
export function mascotXml(mood: MascotMood): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${MOODS[mood]()}</svg>`;
}
