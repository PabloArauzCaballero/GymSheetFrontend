/**
 * Catálogo de identidades de marca, compartido por la web y el móvil.
 *
 * Solo contiene lo que **distingue** a un gimnasio: su nombre y sus colores de
 * marca. La rampa de superficies, las sombras y el ritmo tipográfico se quedan
 * en cada plataforma, porque responden al medio y no a la marca —un móvil OLED
 * necesita escalones de gris más separados que un monitor, y eso no cambia
 * porque cambie el cliente—.
 *
 * Los valores son hexadecimales planos, sin notación de CSS ni de React Native,
 * para que ambas plataformas puedan componerlos a su manera.
 */

export type TenantBrandColors = {
  /** Relleno de marca: botones primarios, indicadores activos. */
  readonly accent: string;
  /** Variante apagada para estados presionados. */
  readonly accentDim: string;
  /**
   * Degradado del relleno primario: un tinte claro y una sombra del acento.
   * Se declara en vez de calcularse porque un degradado que se ve bien depende
   * del tono concreto, y una fórmula acaba produciendo bandas sucias en los
   * rojos y apagadas en los amarillos.
   */
  readonly accentGradient: readonly [string, string];
  /**
   * Texto e iconos que van **encima** del relleno. No se deriva
   * automáticamente: elegirlo mal deja los botones ilegibles y la decisión
   * depende de la luminosidad exacta del acento.
   */
  readonly accentContrast: string;
  /** Acento legible como texto sobre superficie oscura. */
  readonly accentInkOnDark: string;
  /** Acento legible como texto sobre superficie clara. */
  readonly accentInkOnLight: string;
  /**
   * Confirmación. Se declara aparte del acento a propósito: una marca roja que
   * reutilizara su color para «éxito» haría indistinguibles la confirmación y
   * el error, que es justo el par que nunca debe confundirse.
   */
  readonly successOnDark: string;
  readonly successOnLight: string;
};

export type TenantDefinition = {
  /** Identificador estable; el que se pasa por configuración. */
  readonly id: string;
  /** Nombre del gimnasio: títulos, manifiesto, atribución de medios. */
  readonly name: string;
  /** Rótulo junto a la marca gráfica, normalmente en versales. */
  readonly wordmark: string;
  /** Monograma para espacios reducidos (2–3 caracteres). */
  readonly monogram: string;
  readonly colors: TenantBrandColors;
};

/** Identidad de referencia del producto. */
export const gymsheetTenant: TenantDefinition = {
  id: 'gymsheet',
  name: 'GymSheet',
  wordmark: 'GYMSHEET',
  monogram: 'GS',
  colors: {
    accent: '#c3f400',
    accentDim: '#abd600',
    accentGradient: ['#d8ff33', '#a8d400'],
    accentContrast: '#000000',
    accentInkOnDark: '#c3f400',
    accentInkOnLight: '#55730a',
    successOnDark: '#c3f400',
    successOnLight: '#4d6b00',
  },
};

/**
 * TOP FITNESS CENTER — primer inquilino real.
 *
 * Su marca es un rojo saturado con el logotipo en blanco. El rojo se tomó del
 * logotipo a ojo, así que si tienen el valor exacto de su manual de marca este
 * es el único sitio donde hay que cambiarlo.
 *
 * Dos ajustes que el rojo obliga a hacer y que conviene no deshacer sin
 * pensarlo: el texto sobre el relleno es blanco (sobre este rojo el negro no
 * alcanza contraste suficiente), y la confirmación pasa a verde, porque
 * heredar el acento habría pintado de rojo tanto «guardado» como «error».
 */
export const topFitnessTenant: TenantDefinition = {
  id: 'topfitness',
  name: 'TOP Fitness Center',
  wordmark: 'TOP FITNESS',
  monogram: 'TF',
  colors: {
    accent: '#ed1b34',
    accentDim: '#c71329',
    accentGradient: ['#ff4d63', '#c71329'],
    accentContrast: '#ffffff',
    // Sobre casi negro, el rojo de marca queda por debajo del contraste
    // legible para texto; se aclara sin salirse del tono.
    accentInkOnDark: '#ff6b7d',
    accentInkOnLight: '#b3121f',
    successOnDark: '#35c46a',
    successOnLight: '#1e7a44',
  },
};

export const tenantCatalog: Record<string, TenantDefinition> = {
  [gymsheetTenant.id]: gymsheetTenant,
  [topFitnessTenant.id]: topFitnessTenant,
};

export const defaultTenant = gymsheetTenant;

/** Identidad por id; sin coincidencia devuelve la de referencia. */
export function resolveTenant(id: string | null | undefined): TenantDefinition {
  const key = (id ?? '').trim().toLowerCase();
  return tenantCatalog[key] ?? defaultTenant;
}
