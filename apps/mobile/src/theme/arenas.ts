/**
 * Las tintas de las dieciséis arenas del camino.
 *
 * Cada arena es un lugar con su propia luz, como las arenas de un juego de
 * cartas: se reconocen de lejos por el color antes que por el nombre. La rampa
 * va de la noche fría de la entrada al violeta y oro del Salón de Leyendas.
 *
 * Archivo **puro** (sin React Native): lo importan las ilustraciones
 * (`features/arena-road/arena-art.ts`) y el script que las rasteriza.
 * Ningún texto se apoya directamente sobre estas tintas: la ficha de la arena
 * pone un velo oscuro debajo de los rótulos.
 */
import { alpha, ink } from './palette.ts';

type Ramp = readonly [light: string, mid: string, dark: string];

export type ArenaInk = Readonly<{
  /** Cielo, de arriba abajo. */
  sky: readonly [string, string];
  /** Luz detrás del motivo. */
  glow: string;
  /** Plataforma: cara superior y canto. */
  ground: readonly [string, string];
  /** Material dominante (muro, acero, mármol, piedra). */
  a: Ramp;
  /** Acento (luz, metal de color, fuego). */
  b: Ramp;
}>;

/** En el orden del camino; la clave es el `code` de la arena del servidor. */
export const arenaInks = {
  // 1 · La Puerta: anochecer y la luz de dentro que se escapa por el cristal.
  PUERTA: {
    sky: ['#121D31', '#2A3D5C'],
    glow: '#FFD9A0',
    ground: ['#34475F', '#1B283B'],
    a: ['#6A7F9C', '#4A5D79', '#2F3E56'],
    b: ['#FFF3DC', '#FFD38A', '#E2A04A'],
  },
  // 2 · El Vestuario: taquillas de acero y la luz cálida de una puerta abierta.
  VESTUARIO: {
    sky: ['#0E1C2B', '#24435A'],
    glow: '#9FE7FF',
    ground: ['#2B4A60', '#152B3B'],
    a: ['#86AECB', '#527C9B', '#2F4E68'],
    b: ['#FFE7B8', '#FFC46B', '#D98E2B'],
  },
  // 3 · Sala de Máquinas: acero frío y azul de pantalla.
  MAQUINAS: {
    sky: ['#0C1F3A', '#1E4B7A'],
    glow: '#7CC4FF',
    ground: ['#2A4566', '#152842'],
    a: ['#C3D3E4', '#8199B3', '#4C6480'],
    b: ['#9AD3FF', '#3B8FE0', '#205C9A'],
  },
  // 4 · Zona de Cardio: neón coral y pulso.
  CARDIO: {
    sky: ['#1C0A18', '#5A1838'],
    glow: '#FF5C8A',
    ground: ['#4C2238', '#29101F'],
    a: ['#6A707E', '#3F4450', '#22252C'],
    b: ['#FFB3CA', '#FF4D7D', '#B81E4C'],
  },
  // 5 · Zona de Mancuernas: el jade de la marca sobre hierro.
  MANCUERNAS: {
    sky: ['#082424', '#125249'],
    glow: '#6BFFD0',
    ground: ['#1F5B52', '#0E3431'],
    a: ['#5B6676', '#363F4C', '#1C222B'],
    b: ['#86F5D8', '#2BC39A', '#15805F'],
  },
  // 6 · El Banco: azul profundo bajo un foco naranja.
  BANCO: {
    sky: ['#0A132E', '#22357A'],
    glow: '#FFB45C',
    ground: ['#2F3F7A', '#18224A'],
    a: ['#8E98AE', '#58617A', '#2F3546'],
    b: ['#FFD7A0', '#FF9A3D', '#C7661A'],
  },
  // 7 · La Jaula: el lima eléctrico de las placas y acero negro.
  JAULA: {
    sky: ['#161F0C', '#3B5014'],
    glow: '#E6FF5C',
    ground: ['#4A5E1E', '#26330D'],
    a: ['#7B828E', '#454C57', '#23282F'],
    b: ['#F2FF8A', '#C3F400', '#87A800'],
  },
  // 8 · La Plataforma: madera, magnesio y discos rojos.
  PLATAFORMA: {
    sky: ['#1A110A', '#4A3020'],
    glow: '#FFE2B8',
    ground: ['#6B4A2E', '#3A2716'],
    a: ['#E6B987', '#B9844E', '#7D5530'],
    b: ['#FF8585', '#E23B3B', '#9C1F1F'],
  },
  // 9 · Templo del Hierro: mármol y oro viejo al atardecer.
  TEMPLO: {
    sky: ['#2A1806', '#6E4512'],
    glow: '#FFD873',
    ground: ['#7A5520', '#41300F'],
    a: ['#FFF5E2', '#E6D0A6', '#AF946A'],
    b: ['#FFE58A', '#F4B521', '#A9740B'],
  },
  // 10 · La Cueva: piedra y antorchas.
  CUEVA: {
    sky: ['#09090C', '#26221D'],
    glow: '#FF9F43',
    ground: ['#3A342C', '#1D1914'],
    a: ['#857C70', '#544D43', '#2C2822'],
    b: ['#FFE08A', '#FF9F43', '#C7591A'],
  },
  // 11 · La Fragua: brasas.
  FRAGUA: {
    sky: ['#240B05', '#6B2210'],
    glow: '#FF8A3D',
    ground: ['#5C2A18', '#31140A'],
    a: ['#666B75', '#3C3F47', '#212329'],
    b: ['#FFE39A', '#FF8A3D', '#D9431A'],
  },
  // 12 · Patio Strongman: arena de atardecer y amarillo de yugo.
  STRONGMAN: {
    sky: ['#2A1330', '#B8572B'],
    glow: '#FFC56B',
    ground: ['#8A5A32', '#4E3119'],
    a: ['#A39B8F', '#625C53', '#2E2B27'],
    b: ['#FFE680', '#FFCC00', '#B38F00'],
  },
  // 13 · El Coliseo: piedra caliza bajo focos magenta.
  COLISEO: {
    sky: ['#1F0822', '#5A1952'],
    glow: '#FF6FCB',
    ground: ['#6A3A4E', '#381C2A'],
    a: ['#F0D4BD', '#C79D7F', '#8A6450'],
    b: ['#FFA6DF', '#E0308C', '#9C1459'],
  },
  // 14 · Valhalla: aurora sobre nieve, madera y oro.
  VALHALLA: {
    sky: ['#05101D', '#14365A'],
    glow: '#7DFFE0',
    ground: ['#D8ECF8', '#86A9C4'],
    a: ['#9A7553', '#654A33', '#3A2A1C'],
    b: ['#FFE9A8', '#F2C14E', '#B0841F'],
  },
  // 15 · El Olimpo: nieve, nubes y oro sobre violeta.
  OLIMPO: {
    sky: ['#170F3A', '#4A3B98'],
    glow: '#FFF3C4',
    ground: ['#F4F0FF', '#B9B0DF'],
    a: ['#D3CDF0', '#8F86C8', '#5A5197'],
    b: ['#FFF5CC', '#FFD45C', '#D2921A'],
  },
  // 16 · Salón de Leyendas: mármol blanco, púrpura real y oro.
  LEYENDAS: {
    sky: ['#12061F', '#3D1468'],
    glow: '#FFD9F2',
    ground: ['#ECE4F8', '#A390C6'],
    a: ['#F8F4FF', '#D2C6E8', '#8E7EB0'],
    b: ['#FFF1B8', '#FFC93C', '#C48A12'],
  },
} as const satisfies Record<string, ArenaInk>;

export type ArenaCode = keyof typeof arenaInks;
export const ARENA_CODES = Object.keys(arenaInks) as ArenaCode[];

/** Brillos y estrellas: luz pura. */
export const arenaSpark = ink.white;
/** Sombra de contacto bajo los objetos. */
export const arenaShadow = alpha(ink.black, 0.32);
/** Viñeta de los bordes de la escena. */
export const arenaVignette = ink.black;
/** Velo de una arena bloqueada: la escena se intuye, no se ve. */
export const arenaLockedVeil = alpha('#070B14', 0.66);
/** Velo inferior de la ficha, debajo del nombre (texto blanco ≥ 7:1). */
export const arenaScrim = [alpha('#070B14', 0), alpha('#070B14', 0.55), alpha('#070B14', 0.92)] as const;
/** Pista del camino por la que avanza el marcador. */
export const arenaTrack = alpha(ink.white, 0.1);
