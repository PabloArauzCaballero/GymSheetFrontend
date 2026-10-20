/**
 * Las tintas de las ocho arenas del camino.
 *
 * Cada arena es un lugar con su propia luz, como las arenas de un juego de
 * cartas: se reconocen de lejos por el color antes que por el nombre. La rampa
 * avanza de la noche fría de la entrada al blanco dorado de la cima, la misma
 * dirección que la rampa de colores de los rangos (`color` del servidor).
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

export const arenaInks: readonly ArenaInk[] = [
  // 1 · La Puerta: anochecer y la luz de dentro que se escapa por el cristal.
  {
    sky: ['#121D31', '#2A3D5C'],
    glow: '#FFD9A0',
    ground: ['#34475F', '#1B283B'],
    a: ['#6A7F9C', '#4A5D79', '#2F3E56'],
    b: ['#FFF3DC', '#FFD38A', '#E2A04A'],
  },
  // 2 · Sala de Máquinas: acero frío y azul de pantalla.
  {
    sky: ['#0C1F3A', '#1E4B7A'],
    glow: '#7CC4FF',
    ground: ['#2A4566', '#152842'],
    a: ['#C3D3E4', '#8199B3', '#4C6480'],
    b: ['#9AD3FF', '#3B8FE0', '#205C9A'],
  },
  // 3 · Zona de Mancuernas: el jade de la marca sobre hierro.
  {
    sky: ['#082424', '#125249'],
    glow: '#6BFFD0',
    ground: ['#1F5B52', '#0E3431'],
    a: ['#5B6676', '#363F4C', '#1C222B'],
    b: ['#86F5D8', '#2BC39A', '#15805F'],
  },
  // 4 · La Jaula: el lima eléctrico de las placas y acero negro.
  {
    sky: ['#161F0C', '#3B5014'],
    glow: '#E6FF5C',
    ground: ['#4A5E1E', '#26330D'],
    a: ['#7B828E', '#454C57', '#23282F'],
    b: ['#F2FF8A', '#C3F400', '#87A800'],
  },
  // 5 · Templo del Hierro: mármol y oro viejo al atardecer.
  {
    sky: ['#2A1806', '#6E4512'],
    glow: '#FFD873',
    ground: ['#7A5520', '#41300F'],
    a: ['#FFF5E2', '#E6D0A6', '#AF946A'],
    b: ['#FFE58A', '#F4B521', '#A9740B'],
  },
  // 6 · La Fragua: brasas.
  {
    sky: ['#240B05', '#6B2210'],
    glow: '#FF8A3D',
    ground: ['#5C2A18', '#31140A'],
    a: ['#666B75', '#3C3F47', '#212329'],
    b: ['#FFE39A', '#FF8A3D', '#D9431A'],
  },
  // 7 · El Coliseo: piedra caliza bajo focos magenta.
  {
    sky: ['#1F0822', '#5A1952'],
    glow: '#FF6FCB',
    ground: ['#6A3A4E', '#381C2A'],
    a: ['#F0D4BD', '#C79D7F', '#8A6450'],
    b: ['#FFA6DF', '#E0308C', '#9C1459'],
  },
  // 8 · El Olimpo: nieve, nubes y oro sobre violeta.
  {
    sky: ['#170F3A', '#4A3B98'],
    glow: '#FFF3C4',
    ground: ['#F4F0FF', '#B9B0DF'],
    a: ['#D3CDF0', '#8F86C8', '#5A5197'],
    b: ['#FFF5CC', '#FFD45C', '#D2921A'],
  },
];

/** Brillos y estrellas: luz pura. */
export const arenaSpark = ink.white;
/** Sombra de contacto bajo los objetos. */
export const arenaShadow = alpha(ink.black, 0.32);
/** Velo de una arena bloqueada: la escena se intuye, no se ve. */
export const arenaLockedVeil = alpha('#070B14', 0.66);
/** Velo inferior de la ficha, debajo del nombre (texto blanco ≥ 7:1). */
export const arenaScrim = [alpha('#070B14', 0), alpha('#070B14', 0.55), alpha('#070B14', 0.92)] as const;
/** Pista del camino por la que avanza el marcador. */
export const arenaTrack = alpha(ink.white, 0.1);
