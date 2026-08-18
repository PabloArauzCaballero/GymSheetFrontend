import { Hanken_Grotesk, Inter, Manrope } from 'next/font/google';

/**
 * Catálogo tipográfico.
 *
 * `next/font` descarga y auto-hospeda en tiempo de compilación, así que exige
 * argumentos literales: no acepta constantes compartidas ni abreviaturas de
 * propiedad, y por eso cada familia repite sus opciones. Tampoco puede
 * resolverse por petición, de ahí que el catálogo sea cerrado y el inquilino
 * elija una clave.
 *
 * Las variables declaradas aquí deben coincidir con `fontVariableByKey` del
 * contrato de marca, que es lo que consume la hoja de tema.
 *
 * Sólo se precarga la familia por defecto: precargar las tres castigaría a
 * todos los inquilinos con descargas que la mayoría no llega a usar.
 */
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-hanken',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  preload: false,
});

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  preload: false,
});

/** Clases que declaran las variables; se aplican al elemento raíz. */
export const fontClassNames = [hanken.variable, inter.variable, manrope.variable].join(' ');
