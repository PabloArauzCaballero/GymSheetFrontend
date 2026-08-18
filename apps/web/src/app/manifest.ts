import type { MetadataRoute } from 'next';
import { currentTheme } from '@/shared/theme/tenant-theme.server';

/**
 * El manifiesto forma parte de la identidad instalada en el dispositivo, así
 * que sus colores salen de la paleta del inquilino igual que los de la
 * interfaz. Leer el host convierte esta ruta en dinámica, que es justamente lo
 * que hace falta cuando varias marcas comparten el despliegue.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const theme = await currentTheme();
  return {
    name: theme.brand.name,
    short_name: theme.brand.name,
    description: 'Registro técnico de entrenamiento y operaciones de gimnasio.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: theme.dark.background,
    theme_color: theme.dark.accent,
    icons: [{ src: '/brand-mark.svg', sizes: '64x64', type: 'image/svg+xml' }],
  };
}
