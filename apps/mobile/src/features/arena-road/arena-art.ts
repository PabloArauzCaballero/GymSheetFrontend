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
import { arenaInks, arenaShadow, arenaSpark, type ArenaInk } from '../../theme/arenas.ts';

export const ARENA_ART_WIDTH = 360;
export const ARENA_ART_HEIGHT = 200;
export const ARENA_COUNT = arenaInks.length;

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

const SCENES = [puerta, maquinas, mancuernas, jaula, templo, fragua, coliseo, olimpo] as const;

/**
 * El SVG de la arena en la posición `order` del camino (1 = la primera).
 *
 * Un gimnasio con más rangos que arenas dibujadas repite la última: llegar más
 * lejos que el dibujo no debería dejar a nadie sin escenario.
 */
export function arenaArtXml(order: number): string {
  const index = Math.min(Math.max(order, 1), SCENES.length) - 1;
  const scene = SCENES[index] as (typeof SCENES)[number];
  const ink = arenaInks[index] as ArenaInk;
  const id = `arena${index + 1}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ARENA_ART_WIDTH} ${ARENA_ART_HEIGHT}" preserveAspectRatio="xMidYMid slice">${scene(id, ink)}</svg>`;
}

/** La tinta de la arena en `order`, para el color de la pista y del brillo. */
export function arenaInkAt(order: number): ArenaInk {
  return arenaInks[Math.min(Math.max(order, 1), arenaInks.length) - 1] as ArenaInk;
}
