/**
 * Las ocho arenas del camino, en SVG.
 *
 * Archivo **puro** (sin React Native), igual que `components/cards/art.ts`: la
 * app pinta estas cadenas con `SvgXml` y `scripts/render-arena-art.mjs` las
 * rasteriza en una hoja de contactos para revisarlas a ojo.
 *
 * Cada arena es un **diorama**: un cielo, una luz, una plataforma flotante y un
 * lugar reconocible del gimnasio encima. Mismo estilo que las cartas —masas
 * planas con sombra y brillo propios, sin contornos—, para que el camino y la
 * colección se lean como el mismo juego. Lienzo 360 × 200; el motivo vive en
 * el centro para que un recorte a 16:9 o a cuadrado no lo corte.
 *
 * Las coordenadas son el dibujo: no hay nada que configurar.
 */
import {
  ARENA_CODES,
  arenaInks,
  arenaShadow,
  arenaSpark,
  arenaVignette,
  type ArenaCode,
  type ArenaInk,
} from '../../theme/arenas.ts';

export const ARENA_ART_WIDTH = 360;
export const ARENA_ART_HEIGHT = 200;
export const ARENA_COUNT = ARENA_CODES.length;

const W = arenaSpark;
const GROUND_Y = 164;

const n = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

const rect = (x: number, y: number, w: number, h: number, fill: string, r = 0, extra = '') =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" fill="${fill}"${extra}/>`;
const circle = (cx: number, cy: number, r: number, fill: string, extra = '') =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"${extra}/>`;
const ellipse = (cx: number, cy: number, rx: number, ry: number, fill: string, extra = '') =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${extra}/>`;
const path = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
const op = (value: number) => ` opacity="${value}"`;

/** Destello de cuatro puntas, el mismo de las cartas. */
const spark = (x: number, y: number, r: number, fill: string = W) =>
  path(`M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`, fill);

/** Pseudoaleatorio estable: la misma arena sale igual en cada render. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/* ─── Escenario común ─────────────────────────────────────────────────────── */

function stage(id: string, ink: ArenaInk, focusY: number, seed: number): string {
  const random = seeded(seed);
  let stars = '';
  for (let index = 0; index < 18; index += 1) {
    const x = random() * ARENA_ART_WIDTH;
    const y = random() * 90;
    stars += circle(x, y, 0.6 + random() * 1.1, W, op(0.25 + random() * 0.45));
  }
  // Haces de luz que salen del motivo hacia arriba: dan profundidad sin ruido.
  let rays = '';
  for (let index = 0; index < 7; index += 1) {
    const angle = -Math.PI / 2 + (index - 3) * 0.32;
    const x1 = 180 + Math.cos(angle - 0.07) * 260;
    const y1 = focusY + Math.sin(angle - 0.07) * 260;
    const x2 = 180 + Math.cos(angle + 0.07) * 260;
    const y2 = focusY + Math.sin(angle + 0.07) * 260;
    rays += path(`M180 ${focusY}L${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}Z`, ink.glow, op(0.07));
  }
  return (
    `<defs>` +
    `<linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ink.sky[0]}"/><stop offset="1" stop-color="${ink.sky[1]}"/></linearGradient>` +
    `<radialGradient id="${id}-glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${ink.glow}" stop-opacity="0.55"/><stop offset="0.45" stop-color="${ink.glow}" stop-opacity="0.16"/><stop offset="1" stop-color="${ink.glow}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${id}-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ink.b[0]}"/><stop offset="1" stop-color="${ink.b[1]}"/></linearGradient>` +
    `<linearGradient id="${id}-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ink.a[0]}"/><stop offset="1" stop-color="${ink.a[1]}"/></linearGradient>` +
    `</defs>` +
    rect(0, 0, ARENA_ART_WIDTH, ARENA_ART_HEIGHT, `url(#${id}-sky)`) +
    stars +
    rays +
    ellipse(180, focusY, 170, 110, `url(#${id}-glow)`)
  );
}

/** La plataforma flotante: canto, cara y un brillo en el borde de delante. */
function platform(ink: ArenaInk, rx = 150): string {
  const cy = GROUND_Y + 2;
  return (
    ellipse(180, cy + 26, rx * 0.8, 8, arenaShadow) +
    ellipse(180, cy + 14, rx, 22, ink.ground[1]) +
    rect(180 - rx, cy, rx * 2, 14, ink.ground[1]) +
    ellipse(180, cy, rx, 22, ink.ground[0]) +
    path(`M${180 - rx * 0.7} ${cy + 15}Q180 ${cy + 25} ${180 + rx * 0.7} ${cy + 15}`, 'none', ` stroke="${W}" stroke-opacity="0.18" stroke-width="2" stroke-linecap="round"`)
  );
}

/** Barra olímpica vista de frente: discos de canto a los lados. */
function barbell(cx: number, cy: number, half: number, plate: number, ink: ArenaInk, bar: string): string {
  const left = cx - half;
  const right = cx + half;
  const discs = (x: number, dir: 1 | -1) =>
    rect(x - (dir === 1 ? 0 : 10), cy - plate / 2, 10, plate, ink.b[1], 3) +
    rect(x - (dir === 1 ? 0 : 10), cy - plate / 2, 3, plate, ink.b[0], 1.5) +
    rect(x + (dir === 1 ? 11 : -19), cy - plate * 0.4, 8, plate * 0.8, ink.b[2], 2.5);
  return (
    rect(left - 22, cy - 2, half * 2 + 44, 4, bar, 2) +
    rect(left - 24, cy - 3.5, 14, 7, bar, 2) +
    rect(right + 10, cy - 3.5, 14, 7, bar, 2) +
    discs(left - 10, -1) +
    discs(right + 10, 1)
  );
}

function dumbbell(cx: number, cy: number, s: number, head: string, headLight: string, handle: string): string {
  return (
    rect(cx - 9 * s, cy - 1.5 * s, 18 * s, 3 * s, handle, 1.5 * s) +
    rect(cx - 13 * s, cy - 7 * s, 6 * s, 14 * s, head, 2 * s) +
    rect(cx + 7 * s, cy - 7 * s, 6 * s, 14 * s, head, 2 * s) +
    rect(cx - 13 * s, cy - 7 * s, 2 * s, 14 * s, headLight, 1 * s) +
    rect(cx + 7 * s, cy - 7 * s, 2 * s, 14 * s, headLight, 1 * s)
  );
}

/* ─── Las ocho arenas ─────────────────────────────────────────────────────── */

/** 1 · La Puerta: la fachada de noche y la luz de dentro. */
function puerta(id: string, ink: ArenaInk): string {
  return (
    stage(id, ink, 110, 11) +
    platform(ink) +
    // Muro y cornisa.
    rect(78, 50, 204, 116, `url(#${id}-a)`) +
    rect(252, 50, 30, 116, ink.a[2], 0, op(0.55)) +
    rect(70, 42, 220, 12, ink.a[0], 3) +
    // Rótulo encendido con una mancuerna.
    rect(134, 60, 92, 20, ink.b[0], 10) +
    dumbbell(180, 70, 0.9, ink.a[2], ink.a[1], ink.a[2]) +
    // Puertas de cristal con la luz de dentro.
    rect(126, 88, 108, 78, ink.a[2], 4) +
    rect(132, 94, 46, 72, `url(#${id}-b)`, 2) +
    rect(182, 94, 46, 72, `url(#${id}-b)`, 2) +
    path('M138 94L156 94L140 166L132 166L132 120Z', W, op(0.25)) +
    path('M188 94L200 94L186 166L182 166Z', W, op(0.2)) +
    rect(172, 124, 3, 18, ink.a[2], 1.5) +
    rect(185, 124, 3, 18, ink.a[2], 1.5) +
    // La luz se derrama sobre la plataforma.
    path('M126 166L234 166L276 188L84 188Z', ink.b[0], op(0.42)) +
    // Faroles laterales.
    rect(94, 92, 8, 12, ink.b[0], 3) +
    circle(98, 98, 11, ink.b[0], op(0.2)) +
    rect(258, 92, 8, 12, ink.b[0], 3) +
    circle(262, 98, 11, ink.b[0], op(0.2)) +
    spark(240, 30, 5) +
    spark(112, 26, 3.5)
  );
}

/** 2 · Sala de Máquinas: la torre de poleas con su pila de placas. */
function maquinas(id: string, ink: ArenaInk): string {
  let stack = '';
  for (let index = 0; index < 9; index += 1) {
    stack += rect(162, 94 + index * 7, 36, 6, index % 2 === 0 ? ink.b[1] : ink.b[2], 1.5);
  }
  return (
    stage(id, ink, 96, 23) +
    platform(ink) +
    // Prensa de pecho a la izquierda.
    rect(98, 60, 7, 106, ink.a[1], 2) +
    rect(82, 94, 16, 50, ink.b[2], 7) +
    rect(82, 136, 44, 10, ink.b[2], 5) +
    rect(103, 96, 34, 6, ink.a[0], 3) +
    rect(132, 92, 6, 14, ink.a[1], 3) +
    // Torre de poleas.
    rect(146, 40, 10, 126, ink.a[1], 2) +
    rect(204, 40, 10, 126, ink.a[1], 2) +
    rect(146, 40, 3, 126, ink.a[0], 1.5) +
    rect(140, 32, 80, 10, ink.a[0], 4) +
    rect(138, 158, 84, 10, ink.a[2], 3) +
    rect(169, 44, 2, 50, ink.a[0]) +
    rect(189, 44, 2, 50, ink.a[0]) +
    stack +
    rect(162, 94, 36, 3, ink.b[0], 1.5) +
    circle(204, 118, 3, W) +
    circle(180, 44, 9, ink.a[2]) +
    circle(180, 44, 4, ink.a[0]) +
    // Cable hasta el agarre.
    path('M180 44Q236 46 254 112', 'none', ` stroke="${ink.a[0]}" stroke-width="2" stroke-linecap="round"`) +
    rect(244, 110, 22, 6, ink.b[1], 3) +
    // Banco a la derecha.
    rect(228, 132, 64, 10, ink.b[2], 5) +
    rect(236, 142, 6, 24, ink.a[2], 2) +
    rect(278, 142, 6, 24, ink.a[2], 2) +
    spark(262, 34, 5) +
    spark(96, 40, 3.5)
  );
}

/** 3 · Zona de Mancuernas: el estante y el espejo. */
function mancuernas(id: string, ink: ArenaInk): string {
  let topRow = '';
  [0.62, 0.68, 0.74, 0.8, 0.86, 0.92].forEach((s, index) => {
    topRow += dumbbell(100 + index * 32, 114, s, ink.b[1], ink.b[0], ink.a[0]);
  });
  let lowRow = '';
  [1, 1.06, 1.12, 1.18, 1.24].forEach((s, index) => {
    lowRow += dumbbell(104 + index * 38, 139, s, ink.a[1], ink.a[0], ink.a[0]);
  });
  return (
    stage(id, ink, 92, 37) +
    platform(ink) +
    // Espejo con dos reflejos.
    rect(66, 30, 228, 92, ink.sky[0], 6, op(0.55)) +
    rect(70, 34, 220, 84, `url(#${id}-glow)`, 4) +
    path('M110 34L150 34L104 118L70 118L70 100Z', W, op(0.08)) +
    path('M170 34L186 34L140 118L124 118Z', W, op(0.06)) +
    // Estante de dos alturas.
    rect(80, 120, 200, 6, ink.a[0], 3) +
    rect(80, 147, 200, 6, ink.a[0], 3) +
    rect(86, 120, 6, 46, ink.a[2], 2) +
    rect(268, 120, 6, 46, ink.a[2], 2) +
    topRow +
    lowRow +
    // La mancuerna protagonista, en el suelo, delante.
    ellipse(180, 182, 36, 4, arenaShadow) +
    dumbbell(180, 172, 2.2, ink.b[1], ink.b[0], ink.a[0]) +
    spark(152, 160, 4) +
    spark(250, 26, 5) +
    spark(92, 22, 3)
  );
}

/** 4 · La Jaula: el rack con la barra cargada en los ganchos. */
function jaula(id: string, ink: ArenaInk): string {
  let holes = '';
  for (let y = 46; y < 156; y += 11) {
    holes += circle(106, y, 1.6, ink.a[2]) + circle(254, y, 1.6, ink.a[2]);
  }
  return (
    stage(id, ink, 86, 41) +
    platform(ink) +
    // Tarima de goma.
    path('M100 160L260 160L280 176L80 176Z', ink.a[2]) +
    path('M150 160L210 160L216 176L144 176Z', ink.b[2], op(0.55)) +
    // Postes del fondo.
    rect(120, 42, 8, 120, ink.a[2], 2) +
    rect(232, 42, 8, 120, ink.a[2], 2) +
    rect(120, 40, 120, 5, ink.a[2], 2) +
    // Postes de delante.
    rect(100, 30, 12, 138, ink.a[1], 2) +
    rect(248, 30, 12, 138, ink.a[1], 2) +
    rect(100, 30, 3, 138, ink.a[0], 1.5) +
    rect(248, 30, 3, 138, ink.a[0], 1.5) +
    holes +
    rect(96, 24, 168, 9, ink.a[0], 3) +
    // Brazos de seguridad.
    rect(92, 128, 28, 5, ink.a[0], 2) +
    rect(240, 128, 28, 5, ink.a[0], 2) +
    // Ganchos y barra cargada.
    rect(110, 88, 8, 8, ink.a[0], 2) +
    rect(242, 88, 8, 8, ink.a[0], 2) +
    barbell(180, 86, 68, 58, ink, ink.a[0]) +
    // Cuenco de magnesio.
    ellipse(66, 164, 14, 5, ink.a[0]) +
    path('M52 164Q66 178 80 164Z', ink.a[1]) +
    circle(66, 160, 6, W, op(0.6)) +
    spark(300, 40, 5) +
    spark(60, 44, 3.5) +
    spark(180, 50, 4, ink.b[0])
  );
}

/** 5 · Templo del Hierro: columnas, escalinata y la barra en el altar. */
function templo(id: string, ink: ArenaInk): string {
  let columns = '';
  [100, 140, 200, 240].forEach((x) => {
    columns +=
      rect(x - 2, 128, 24, 6, ink.a[1], 1) +
      rect(x, 66, 20, 64, `url(#${id}-a)`) +
      rect(x + 5, 66, 2, 64, ink.a[2], 1, op(0.45)) +
      rect(x + 12, 66, 2, 64, ink.a[2], 1, op(0.45)) +
      rect(x - 3, 60, 26, 7, ink.a[0], 2);
  });
  return (
    stage(id, ink, 104, 53) +
    platform(ink) +
    // Frontón.
    path('M80 52L180 16L280 52Z', ink.a[1]) +
    path('M100 48L180 22L260 48Z', ink.a[0]) +
    circle(180, 38, 6, ink.b[1]) +
    circle(178.5, 36.5, 2, W, op(0.8)) +
    rect(84, 50, 192, 12, ink.a[0], 2) +
    rect(84, 58, 192, 3, ink.a[2], 1, op(0.5)) +
    columns +
    // Escalinata.
    rect(88, 134, 184, 9, ink.a[0], 2) +
    rect(78, 142, 204, 9, ink.a[1], 2) +
    rect(68, 150, 224, 12, ink.a[2], 2) +
    // El altar y la barra de oro.
    ellipse(180, 112, 52, 34, ink.b[0], op(0.35)) +
    rect(164, 118, 32, 16, ink.a[0], 2) +
    rect(160, 114, 40, 6, ink.a[1], 2) +
    barbell(180, 104, 26, 34, ink, ink.b[0]) +
    spark(180, 82, 5) +
    spark(296, 30, 4) +
    spark(66, 34, 3)
  );
}

/** 6 · La Fragua: el yunque, el disco al rojo y las chispas. */
function fragua(id: string, ink: ArenaInk): string {
  const random = seeded(67);
  let sparks = '';
  for (let index = 0; index < 16; index += 1) {
    const angle = -Math.PI * (0.1 + random() * 0.8);
    const distance = 22 + random() * 46;
    const x = 210 + Math.cos(angle) * distance;
    const y = 100 + Math.sin(angle) * distance;
    sparks += circle(x, y, 0.9 + random() * 1.6, random() > 0.5 ? ink.b[0] : ink.b[1]);
  }
  let embers = '';
  for (let index = 0; index < 10; index += 1) {
    embers += circle(80 + random() * 60, 30 + random() * 70, 0.8 + random() * 1.2, ink.b[1], op(0.4 + random() * 0.5));
  }
  return (
    stage(id, ink, 104, 61) +
    platform(ink) +
    // La forja del fondo.
    rect(64, 54, 80, 112, ink.a[2], 6) +
    rect(84, 30, 40, 28, ink.a[1], 3) +
    path('M80 166L80 116Q104 88 128 116L128 166Z', `url(#${id}-b)`) +
    path('M90 166Q92 136 104 122Q102 146 116 132Q120 150 118 166Z', ink.b[0]) +
    ellipse(104, 150, 40, 30, ink.b[1], op(0.25)) +
    embers +
    // Yunque.
    path('M150 108L252 108L252 120L234 124L224 140L240 150L240 162L170 162L170 150L186 140L176 124L150 117Q132 113 122 106Q138 105 150 108Z', ink.a[1]) +
    rect(150, 106, 102, 4, ink.a[0], 2) +
    rect(170, 158, 70, 6, ink.a[2], 2) +
    // El disco al rojo encima.
    ellipse(210, 102, 34, 16, ink.b[1], op(0.35)) +
    ellipse(210, 103, 27, 8, ink.b[2]) +
    ellipse(210, 101, 27, 8, ink.b[1]) +
    ellipse(210, 100, 9, 3, ink.b[0]) +
    sparks +
    // Martillo en el aire.
    `<g transform="rotate(-28 262 64)">` +
    rect(258, 54, 6, 46, ink.a[0], 3) +
    rect(244, 44, 34, 16, ink.a[1], 3) +
    rect(244, 44, 34, 4, ink.a[0], 2) +
    `</g>` +
    spark(300, 30, 4)
  );
}

/** 7 · El Coliseo: dos pisos de arcos, focos y la tarima en el centro. */
function coliseo(id: string, ink: ArenaInk): string {
  const curve = (x: number) => ((x - 180) / 180) ** 2 * 26;
  let upper = '';
  let lower = '';
  let crowd = '';
  const random = seeded(79);
  for (let x = 22; x <= 338; x += 26) {
    const dy = curve(x);
    upper += path(`M${x - 7} ${n(84 + dy)}L${x - 7} ${n(72 + dy)}Q${x} ${n(62 + dy)} ${x + 7} ${n(72 + dy)}L${x + 7} ${n(84 + dy)}Z`, ink.a[2]);
    lower += path(`M${x - 8} ${n(128 + dy)}L${x - 8} ${n(112 + dy)}Q${x} ${n(100 + dy)} ${x + 8} ${n(112 + dy)}L${x + 8} ${n(128 + dy)}Z`, ink.a[2]);
    crowd += circle(x - 6 + random() * 12, 50 + dy + random() * 4, 1.4, random() > 0.6 ? ink.b[0] : W, op(0.5 + random() * 0.4));
  }
  const band = (top: number, bottom: number, fill: string) =>
    path(`M10 ${n(top + curve(10))}Q180 ${n(top - 26)} 350 ${n(top + curve(350))}L350 ${n(bottom + curve(350))}Q180 ${n(bottom - 26)} 10 ${n(bottom + curve(10))}Z`, fill);
  return (
    stage(id, ink, 100, 71) +
    // Focos desde las esquinas.
    path('M24 0L150 168L110 168Z', ink.b[0], op(0.12)) +
    path('M336 0L210 168L250 168Z', ink.b[0], op(0.12)) +
    band(56, 92, ink.a[1]) +
    band(56, 60, ink.a[0]) +
    crowd +
    upper +
    band(96, 136, ink.a[0]) +
    band(96, 100, ink.b[0]) +
    lower +
    // Estandartes.
    path('M88 66L104 66L104 90L96 84L88 90Z', ink.b[1]) +
    path('M256 66L272 66L272 90L264 84L256 90Z', ink.b[1]) +
    platform(ink) +
    // Tarima de competición con la barra cargada.
    path('M112 152L248 152L266 172L94 172Z', ink.a[0]) +
    path('M150 152L210 152L214 172L146 172Z', ink.b[2], op(0.5)) +
    ellipse(180, 152, 70, 6, arenaShadow) +
    barbell(180, 132, 46, 40, ink, ink.a[0]) +
    circle(24, 2, 10, ink.b[0], op(0.35)) +
    circle(24, 2, 4, W) +
    circle(336, 2, 10, ink.b[0], op(0.35)) +
    circle(336, 2, 4, W) +
    spark(180, 108, 5)
  );
}

/** 8 · El Olimpo: la cumbre sobre las nubes y la barra de oro con laurel. */
function olimpo(id: string, ink: ArenaInk): string {
  // Corona de laurel abierta por arriba: dos ramas que suben desde abajo.
  let laurel = '';
  [-1, 1].forEach((side) => {
    for (let index = 0; index < 7; index += 1) {
      const degrees = 90 + side * (18 + index * 21);
      const radians = (degrees * Math.PI) / 180;
      const x = 180 + Math.cos(radians) * 50;
      const y = 42 + Math.sin(radians) * 30;
      const tilt = degrees + 90 + side * 30;
      laurel += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="8.5" ry="3.4" fill="${index % 2 === 0 ? ink.b[1] : ink.b[2]}" transform="rotate(${n(tilt)} ${n(x)} ${n(y)})"/>`;
    }
  });
  const cloud = (cx: number, cy: number, s: number) =>
    ellipse(cx, cy + 6 * s, 34 * s, 8 * s, ink.ground[1]) +
    circle(cx - 16 * s, cy, 12 * s, ink.ground[0]) +
    circle(cx + 2 * s, cy - 6 * s, 16 * s, ink.ground[0]) +
    circle(cx + 20 * s, cy + 1 * s, 11 * s, ink.ground[0]);
  return (
    stage(id, ink, 44, 89) +
    // La montaña: caras en luz y en sombra, nieve en las cumbres.
    path('M30 172L134 70L168 104L214 58L330 172Z', ink.a[1]) +
    path('M214 58L330 172L236 172L226 108Z', ink.a[2]) +
    path('M134 70L168 104L150 172L96 172Z', ink.a[2], op(0.6)) +
    path('M214 58L236 82L224 78L212 90L200 80L194 82Z', ink.ground[0]) +
    path('M134 70L152 88L142 86L132 96L122 84L118 86Z', ink.ground[0]) +
    // Nubes que tapan la base.
    cloud(70, 160, 1.2) +
    cloud(180, 170, 1.5) +
    cloud(292, 160, 1.2) +
    // La barra de oro, el halo y el laurel.
    `<ellipse cx="180" cy="40" rx="40" ry="10" fill="none" stroke="${ink.b[0]}" stroke-width="1.5" opacity="0.7"/>` +
    laurel +
    barbell(180, 40, 20, 24, ink, ink.b[0]) +
    spark(180, 14, 5) +
    spark(108, 30, 4) +
    spark(256, 28, 4) +
    spark(316, 60, 3)
  );
}

/** 2 · El Vestuario: taquillas, una abierta con la luz dentro, y el banco. */
function vestuario(id: string, ink: ArenaInk): string {
  let lockers = '';
  for (let index = 0; index < 6; index += 1) {
    const x = 78 + index * 34;
    if (index === 3) {
      lockers +=
        rect(x, 40, 32, 120, ink.a[2], 2) +
        rect(x + 3, 44, 26, 112, `url(#${id}-b)`, 2, op(0.85)) +
        rect(x + 6, 58, 20, 3, ink.a[2], 1.5) +
        rect(x + 9, 61, 14, 30, ink.b[2], 3) +
        path(`M${x + 32} 40L${x + 48} 46L${x + 48} 154L${x + 32} 160Z`, ink.a[0]);
      continue;
    }
    lockers +=
      rect(x, 40, 32, 120, ink.a[1], 2) +
      rect(x, 40, 3, 120, ink.a[0], 1, op(0.6)) +
      rect(x + 8, 48, 16, 2, ink.a[2], 1) +
      rect(x + 8, 53, 16, 2, ink.a[2], 1) +
      rect(x + 8, 58, 16, 2, ink.a[2], 1) +
      rect(x + 24, 96, 3, 14, ink.a[0], 1.5);
  }
  return (
    stage(id, ink, 96, 13) +
    platform(ink) +
    path('M168 0L192 0L262 166L98 166Z', ink.b[0], op(0.09)) +
    rect(164, 0, 32, 6, ink.a[0], 2) +
    lockers +
    ellipse(180, 162, 96, 6, arenaShadow) +
    rect(92, 136, 176, 10, ink.b[2], 5) +
    rect(92, 136, 176, 3, ink.b[1], 2) +
    rect(104, 146, 6, 18, ink.a[2], 2) +
    rect(250, 146, 6, 18, ink.a[2], 2) +
    rect(196, 118, 46, 20, ink.b[1], 9) +
    path('M206 120Q219 104 232 120', 'none', ` stroke="${ink.b[2]}" stroke-width="3"`) +
    rect(196, 126, 46, 3, ink.b[2], 1.5, op(0.6)) +
    spark(196, 54, 4) +
    spark(300, 30, 5) +
    spark(60, 40, 3)
  );
}

/** 4 · Zona de Cardio: la cinta, la bici y el pulso en neón. */
function cardio(id: string, ink: ArenaInk): string {
  const pulse = 'M14 74L118 74L132 74L142 46L156 108L168 58L178 74L346 74';
  return (
    stage(id, ink, 92, 29) +
    path(pulse, 'none', ` stroke="${ink.b[1]}" stroke-width="10" stroke-opacity="0.22" stroke-linejoin="round"`) +
    path(pulse, 'none', ` stroke="${ink.b[0]}" stroke-width="2.5" stroke-linejoin="round"`) +
    platform(ink) +
    // Cinta de correr.
    ellipse(150, 166, 70, 5, arenaShadow) +
    path('M84 148L204 148L218 162L72 162Z', ink.a[2]) +
    path('M92 146L198 146L208 154L84 154Z', ink.a[1]) +
    rect(186, 92, 8, 58, ink.a[1], 2) +
    rect(186, 92, 3, 58, ink.a[0], 1.5) +
    rect(150, 104, 40, 5, ink.a[0], 2.5) +
    path('M176 82L222 82L218 98L180 98Z', ink.a[0]) +
    rect(184, 86, 30, 8, ink.b[1], 2) +
    rect(186, 88, 12, 4, ink.b[0], 1) +
    // Bici estática.
    rect(236, 158, 70, 7, ink.a[2], 3) +
    circle(260, 142, 18, ink.a[1]) +
    circle(260, 142, 12, ink.a[2]) +
    circle(260, 142, 5, ink.b[1]) +
    path('M260 142L284 108L292 110', 'none', ` stroke="${ink.a[0]}" stroke-width="6" stroke-linecap="round"`) +
    path('M262 140L242 112', 'none', ` stroke="${ink.a[0]}" stroke-width="6" stroke-linecap="round"`) +
    rect(278, 101, 22, 6, ink.b[2], 3) +
    rect(232, 104, 18, 6, ink.b[1], 3) +
    // Corazón de neón.
    path('M318 38C318 31 309 28 305 35C301 28 292 31 292 38C292 46 305 54 305 54C305 54 318 46 318 38Z', ink.b[1]) +
    circle(305, 42, 20, ink.b[1], op(0.18)) +
    spark(60, 34, 4) +
    spark(220, 26, 3)
  );
}

/** 6 · El Banco: el press de banca bajo un foco. */
function banco(id: string, ink: ArenaInk): string {
  return (
    stage(id, ink, 96, 31) +
    platform(ink) +
    path('M166 0L194 0L272 168L88 168Z', ink.b[0], op(0.11)) +
    rect(162, 0, 36, 7, ink.a[0], 2) +
    ellipse(180, 166, 90, 6, arenaShadow) +
    // Soportes y barra.
    rect(108, 64, 9, 100, ink.a[1], 2) +
    rect(243, 64, 9, 100, ink.a[1], 2) +
    rect(108, 64, 3, 100, ink.a[0], 1.5) +
    rect(243, 64, 3, 100, ink.a[0], 1.5) +
    rect(116, 74, 9, 7, ink.a[0], 2) +
    rect(235, 74, 9, 7, ink.a[0], 2) +
    rect(100, 160, 25, 6, ink.a[2], 2) +
    rect(235, 160, 25, 6, ink.a[2], 2) +
    barbell(180, 72, 64, 48, ink, ink.a[0]) +
    // Banco.
    rect(126, 124, 108, 13, ink.b[2], 6) +
    rect(126, 124, 108, 4, ink.b[1], 2) +
    rect(140, 137, 7, 26, ink.a[2], 2) +
    rect(213, 137, 7, 26, ink.a[2], 2) +
    rect(132, 160, 22, 5, ink.a[1], 2) +
    rect(206, 160, 22, 5, ink.a[1], 2) +
    spark(180, 46, 5) +
    spark(300, 36, 4) +
    spark(62, 30, 3)
  );
}

/** 8 · La Plataforma: madera, discos de goma y magnesio en el aire. */
function plataforma(id: string, ink: ArenaInk): string {
  const random = seeded(47);
  let chalk = '';
  for (let index = 0; index < 14; index += 1) {
    const side = index % 2 === 0 ? 92 : 268;
    chalk += circle(side + (random() - 0.5) * 50, 96 + random() * 50, 3 + random() * 7, W, op(0.08 + random() * 0.16));
  }
  let grain = '';
  for (let index = 0; index < 5; index += 1) {
    grain += path(`M${146 + index * 14} 150L${142 + index * 16} 176`, 'none', ` stroke="${ink.a[2]}" stroke-width="1" stroke-opacity="0.45"`);
  }
  return (
    stage(id, ink, 100, 47) +
    platform(ink) +
    path('M82 148L278 148L304 178L56 178Z', ink.a[2]) +
    path('M138 148L222 148L232 178L128 178Z', ink.a[0]) +
    grain +
    chalk +
    ellipse(180, 172, 104, 6, arenaShadow) +
    // Barra en el suelo con discos de goma grandes.
    rect(70, 132, 220, 5, W, 2.5) +
    rect(84, 104, 16, 62, ink.b[1], 5) +
    rect(84, 104, 5, 62, ink.b[0], 2.5) +
    rect(100, 110, 11, 50, ink.b[2], 4) +
    rect(260, 104, 16, 62, ink.b[1], 5) +
    rect(260, 104, 5, 62, ink.b[0], 2.5) +
    rect(249, 110, 11, 50, ink.b[2], 4) +
    rect(64, 130, 22, 9, W, 3) +
    rect(274, 130, 22, 9, W, 3) +
    spark(180, 66, 5) +
    spark(300, 30, 4) +
    spark(56, 36, 3)
  );
}

/** 10 · La Cueva: roca, antorchas, barra de dominadas y mancuernas de bola. */
function cueva(id: string, ink: ArenaInk): string {
  const torch = (x: number) =>
    circle(x, 84, 30, ink.b[1], op(0.22)) +
    circle(x, 84, 14, ink.b[0], op(0.35)) +
    rect(x - 3, 92, 6, 26, ink.a[0], 2) +
    rect(x - 7, 90, 14, 5, ink.a[1], 2) +
    path(`M${x} 64Q${x + 11} 80 ${x} 90Q${x - 11} 80 ${x} 64Z`, ink.b[1]) +
    path(`M${x} 72Q${x + 5} 82 ${x} 88Q${x - 5} 82 ${x} 72Z`, ink.b[0]);
  let chain = '';
  for (let y = 66; y < 112; y += 7) {
    chain += ellipse(150, y, 2.5, 4, 'none', ` stroke="${ink.a[0]}" stroke-width="1.6"`);
    chain += ellipse(210, y, 2.5, 4, 'none', ` stroke="${ink.a[0]}" stroke-width="1.6"`);
  }
  const globe = (x: number) => circle(x, 148, 15, ink.a[1]) + circle(x - 5, 143, 5, ink.a[0], op(0.6));
  return (
    stage(id, ink, 96, 59) +
    platform(ink) +
    path('M0 0L0 200L58 200Q34 136 66 88Q100 38 180 32Q260 38 294 88Q326 136 302 200L360 200L360 0Z', ink.a[2]) +
    path('M0 0L0 120Q28 70 64 52Q40 30 0 0Z', ink.a[1], op(0.5)) +
    path('M360 0L360 130Q330 80 296 60Q322 30 360 0Z', ink.a[1], op(0.5)) +
    torch(92) +
    torch(268) +
    rect(124, 58, 112, 6, ink.a[0], 3) +
    rect(124, 58, 6, 14, ink.a[1], 2) +
    rect(230, 58, 6, 14, ink.a[1], 2) +
    chain +
    ellipse(180, 166, 54, 5, arenaShadow) +
    rect(150, 146, 60, 5, ink.a[0], 2.5) +
    globe(148) +
    globe(212) +
    spark(180, 44, 4, ink.b[0]) +
    spark(120, 120, 2.5, ink.b[0])
  );
}

/** 12 · Patio Strongman: piedras de Atlas, yugo y neumático al atardecer. */
function strongman(id: string, ink: ArenaInk): string {
  const stone = (x: number, y: number, r: number) =>
    ellipse(x, y + r - 1, r * 0.9, 3, arenaShadow) +
    circle(x, y, r, ink.a[1]) +
    path(`M${x - r} ${y}A${r} ${r} 0 0 0 ${x + r} ${y}A${r} ${r * 0.6} 0 0 1 ${x - r} ${y}Z`, ink.a[2], op(0.7)) +
    circle(x - r * 0.35, y - r * 0.4, r * 0.32, ink.a[0], op(0.55));
  let tread = '';
  for (let index = 0; index < 8; index += 1) {
    const a = (index / 8) * Math.PI * 2;
    tread += circle(300 + Math.cos(a) * 25, 128 + Math.sin(a) * 33, 2.5, ink.a[1]);
  }
  return (
    stage(id, ink, 108, 71) +
    circle(180, 108, 62, ink.b[0], op(0.22)) +
    circle(180, 108, 40, ink.b[1], op(0.45)) +
    circle(180, 108, 26, ink.b[0], op(0.7)) +
    platform(ink) +
    // Yugo.
    rect(196, 92, 8, 72, ink.b[1], 2) +
    rect(240, 92, 8, 72, ink.b[1], 2) +
    rect(196, 92, 3, 72, ink.b[0], 1.5) +
    rect(190, 96, 64, 8, ink.b[0], 3) +
    rect(186, 156, 30, 8, ink.b[2], 3) +
    rect(228, 156, 30, 8, ink.b[2], 3) +
    // Neumático apoyado.
    ellipse(300, 128, 30, 38, ink.a[2]) +
    ellipse(300, 128, 14, 20, ink.ground[1]) +
    tread +
    // Piedras de Atlas, de menor a mayor.
    stone(84, 150, 12) +
    stone(114, 145, 17) +
    stone(154, 139, 23) +
    spark(130, 40, 4) +
    spark(270, 46, 3) +
    spark(60, 60, 3)
  );
}

/** 14 · Valhalla: el gran salón bajo la aurora, con escudos y nieve. */
function valhalla(id: string, ink: ArenaInk): string {
  let shields = '';
  [112, 136, 224, 248].forEach((x, index) => {
    shields +=
      circle(x, 118, 10, index % 2 === 0 ? ink.b[1] : ink.glow) +
      circle(x, 118, 10, 'none', ` stroke="${ink.a[2]}" stroke-width="2"`) +
      circle(x, 118, 3, ink.a[2]);
  });
  return (
    stage(id, ink, 80, 83) +
    path('M0 58C90 18 170 94 360 26L360 46C170 112 90 40 0 82Z', ink.glow, op(0.2)) +
    path('M0 30C110 0 200 70 360 4L360 18C200 86 110 18 0 48Z', ink.b[0], op(0.1)) +
    platform(ink) +
    ellipse(180, 166, 104, 6, arenaShadow) +
    rect(90, 96, 180, 70, `url(#${id}-a)`) +
    rect(90, 96, 180, 6, ink.a[2], 0, op(0.6)) +
    path('M74 100L180 44L286 100Z', ink.a[2]) +
    path('M84 96L180 50L276 96L270 96L180 56L90 96Z', ink.ground[0], op(0.9)) +
    path('M180 44Q170 28 182 22Q194 30 184 40', 'none', ` stroke="${ink.b[1]}" stroke-width="3" stroke-linecap="round"`) +
    path('M74 100Q60 92 66 82Q76 84 72 94', 'none', ` stroke="${ink.b[1]}" stroke-width="3" stroke-linecap="round"`) +
    path('M286 100Q300 92 294 82Q284 84 288 94', 'none', ` stroke="${ink.b[1]}" stroke-width="3" stroke-linecap="round"`) +
    shields +
    path('M160 166L160 128Q180 108 200 128L200 166Z', ink.a[2]) +
    path('M160 128Q180 108 200 128', 'none', ` stroke="${ink.b[1]}" stroke-width="3"`) +
    circle(180, 146, 20, ink.b[1], op(0.18)) +
    spark(60, 30, 4) +
    spark(300, 60, 3) +
    spark(220, 20, 3)
  );
}

/** 16 · Salón de Leyendas: columnas, estandartes y el trofeo con la corona. */
function leyendas(id: string, ink: ArenaInk): string {
  let columns = '';
  [70, 102, 238, 270].forEach((x) => {
    columns +=
      rect(x - 3, 30, 26, 7, ink.a[0], 2) +
      rect(x, 36, 20, 122, `url(#${id}-a)`) +
      rect(x + 6, 36, 2, 122, ink.a[2], 1, op(0.4)) +
      rect(x + 13, 36, 2, 122, ink.a[2], 1, op(0.4)) +
      rect(x - 3, 156, 26, 8, ink.a[1], 2);
  });
  const random = seeded(97);
  let confetti = '';
  for (let index = 0; index < 22; index += 1) {
    const colors = [ink.b[1], ink.glow, W, ink.b[0]];
    confetti += `<rect x="${n(30 + random() * 300)}" y="${n(10 + random() * 110)}" width="3" height="6" rx="1" fill="${colors[index % colors.length]}" opacity="${n(0.5 + random() * 0.5)}" transform="rotate(${n(random() * 180)} ${n(30 + random() * 300)} ${n(10 + random() * 110)})"/>`;
  }
  return (
    stage(id, ink, 80, 97) +
    platform(ink) +
    columns +
    path('M126 26L144 26L144 70L135 62L126 70Z', ink.glow, op(0.9)) +
    path('M216 26L234 26L234 70L225 62L216 70Z', ink.glow, op(0.9)) +
    rect(126, 26, 18, 4, ink.b[1]) +
    rect(216, 26, 18, 4, ink.b[1]) +
    confetti +
    ellipse(180, 166, 60, 5, arenaShadow) +
    rect(150, 128, 60, 36, ink.a[0], 3) +
    rect(144, 124, 72, 7, ink.a[1], 3) +
    rect(144, 158, 72, 8, ink.a[2], 3) +
    // Trofeo.
    circle(180, 88, 40, ink.b[0], op(0.25)) +
    rect(166, 114, 28, 9, ink.b[2], 3) +
    rect(176, 98, 8, 18, ink.b[1], 2) +
    path('M156 64L204 64Q204 100 180 102Q156 100 156 64Z', ink.b[1]) +
    path('M160 66L170 66Q170 92 180 98Q160 96 160 66Z', ink.b[0], op(0.7)) +
    path('M156 70Q140 70 144 82Q148 92 160 90', 'none', ` stroke="${ink.b[1]}" stroke-width="4"`) +
    path('M204 70Q220 70 216 82Q212 92 200 90', 'none', ` stroke="${ink.b[1]}" stroke-width="4"`) +
    // Corona flotando encima.
    path('M162 50L166 34L174 44L180 30L186 44L194 34L198 50Z', ink.b[0]) +
    rect(162, 49, 36, 5, ink.b[2], 2) +
    circle(180, 32, 2.5, W) +
    spark(180, 18, 5) +
    spark(122, 104, 3) +
    spark(240, 104, 3)
  );
}

/**
 * El acabado común: bokeh en primer plano, un haz desde arriba y viñeta. Es
 * lo que separa un dibujo plano de una escena con profundidad.
 */
function finish(id: string, ink: ArenaInk, seed: number): string {
  const random = seeded(seed * 7 + 3);
  let bokeh = '';
  for (let index = 0; index < 6; index += 1) {
    const left = index % 2 === 0;
    const x = left ? random() * 70 : 290 + random() * 70;
    bokeh += circle(x, 120 + random() * 80, 8 + random() * 16, `url(#${id}-bokeh)`, op(0.5 + random() * 0.5));
  }
  return (
    `<defs>` +
    `<radialGradient id="${id}-vig" cx="0.5" cy="0.45" r="0.78"><stop offset="0.5" stop-color="${arenaVignette}" stop-opacity="0"/><stop offset="1" stop-color="${arenaVignette}" stop-opacity="0.6"/></radialGradient>` +
    `<radialGradient id="${id}-bokeh" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${ink.glow}" stop-opacity="0.55"/><stop offset="1" stop-color="${ink.glow}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="${id}-shaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${W}" stop-opacity="0.12"/><stop offset="1" stop-color="${W}" stop-opacity="0"/></linearGradient>` +
    `</defs>` +
    path('M40 0L96 0L176 200L104 200Z', `url(#${id}-shaft)`) +
    bokeh +
    rect(0, 0, ARENA_ART_WIDTH, ARENA_ART_HEIGHT, `url(#${id}-vig)`)
  );
}

const SCENES: Readonly<Record<ArenaCode, (id: string, ink: ArenaInk) => string>> = {
  PUERTA: puerta,
  VESTUARIO: vestuario,
  MAQUINAS: maquinas,
  CARDIO: cardio,
  MANCUERNAS: mancuernas,
  BANCO: banco,
  JAULA: jaula,
  PLATAFORMA: plataforma,
  TEMPLO: templo,
  CUEVA: cueva,
  FRAGUA: fragua,
  STRONGMAN: strongman,
  COLISEO: coliseo,
  VALHALLA: valhalla,
  OLIMPO: olimpo,
  LEYENDAS: leyendas,
};

/**
 * Qué escena le toca a una arena: por su `code` si es una de las dibujadas;
 * si no (un servidor anterior, un gimnasio con arenas propias), por su
 * posición en el camino. Más allá de la última se repite la última: llegar más
 * lejos que el dibujo no debería dejar a nadie sin escenario.
 */
export function arenaCodeFor(code: string, order: number): ArenaCode {
  if (code in SCENES) return code as ArenaCode;
  const index = Math.min(Math.max(order, 1), ARENA_CODES.length) - 1;
  return ARENA_CODES[index] as ArenaCode;
}

/** El SVG de una arena, con su acabado. */
export function arenaArtXml(code: string, order = 1): string {
  const key = arenaCodeFor(code, order);
  const ink: ArenaInk = arenaInks[key];
  const id = `arena-${key.toLowerCase()}`;
  const seed = ARENA_CODES.indexOf(key) + 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ARENA_ART_WIDTH} ${ARENA_ART_HEIGHT}" preserveAspectRatio="xMidYMid slice">${SCENES[key](id, ink)}${finish(id, ink, seed)}</svg>`;
}

/** La tinta de una arena, para el color de la pista, el brillo y los rótulos. */
export function arenaInkFor(code: string, order = 1): ArenaInk {
  return arenaInks[arenaCodeFor(code, order)];
}
