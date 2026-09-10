import localFont from 'next/font/local';

/**
 * Catálogo tipográfico.
 *
 * Las tres familias se sirven desde el repositorio. Así el build es reproducible
 * y no depende de Google Fonts ni de acceso a red en CI/producción.
 *
 * Las variables declaradas aquí deben coincidir con `fontVariableByKey` del
 * contrato de marca, que es lo que consume la hoja de tema. La clave `system`
 * es la excepción: su pila (`--font-system`) la declara `globals.css` porque no
 * hay fuente que cargar.
 *
 * Sólo se precarga la familia por defecto: precargar las tres castigaría a
 * todos los inquilinos con descargas que la mayoría no llega a usar.
 */
const hanken = localFont({
  src: './fonts/hanken-grotesk-latin.woff2',
  display: 'swap',
  weight: '400 900',
  variable: '--font-hanken',
});

const inter = localFont({
  src: './fonts/inter-latin.woff2',
  display: 'swap',
  weight: '400 900',
  variable: '--font-inter',
  preload: false,
});

const manrope = localFont({
  src: './fonts/manrope-latin.woff2',
  display: 'swap',
  weight: '400 800',
  variable: '--font-manrope',
  preload: false,
});

/** Clases que declaran las variables; se aplican al elemento raíz. */
export const fontClassNames = [hanken.variable, inter.variable, manrope.variable].join(' ');
