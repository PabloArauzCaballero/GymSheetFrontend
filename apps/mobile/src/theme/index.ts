/**
 * Punto de entrada único del tema móvil (C8.2):
 * `colors` · `spacing` · `type` · `radius` · `shadow` · `motion`.
 *
 * La API pública de antes se mantiene (`colors`, `spacing`, `radii`,
 * `fontSizes`, `accentPolicy`, `tones`, `applyBrandColors`, marcas…): las
 * pantallas importan de `@/theme` y no saben de qué archivo sale cada token.
 */
import { theme } from '@gymsheet/design-tokens';

export * from './colors';
export * from './spacing';
export * from './type';
export * from './radius';
export * from './shadow';
export * from './motion';
export { alpha, contrastRatio, ink, onMedia, overlay } from './palette';
export { getActiveTenant, setActiveTenant, useActiveTenant } from './tenant';
export type { TenantDefinition } from './tenant';
export { tenantCatalog as tenants } from '@gymsheet/design-tokens';
export { theme };
export type { Theme } from '@gymsheet/design-tokens';
export * from './extras';
