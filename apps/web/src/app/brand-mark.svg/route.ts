import { currentTheme } from '@/shared/theme/tenant-theme.server';

/**
 * Marca gráfica del inquilino.
 *
 * Sustituye al archivo estático que llevaba los colores de GymSheet grabados:
 * en un despliegue compartido, el icono del manifiesto y del acceso directo
 * debe ser el del gimnasio que atiende la petición.
 *
 * El trazo es el monograma sobre la caja de marca, no el glifo de la interfaz:
 * a 64 px un icono de línea se pierde, mientras que dos o tres caracteres
 * siguen siendo legibles en el escritorio del dispositivo.
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const theme = await currentTheme();
  const { brand } = theme;
  // El monograma se centra por tipografía del sistema para no depender de una
  // fuente web: un SVG servido suelto no hereda las del documento.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-labelledby="brand-title">
<title id="brand-title">${escapeXml(brand.name)}</title>
<rect width="64" height="64" rx="8" fill="${escapeXml(theme.dark.surfaceLowest)}"/>
<text x="32" y="33" fill="${escapeXml(theme.dark.accent)}" font-family="system-ui, sans-serif" font-size="${brand.monogram.length > 2 ? 22 : 28}" font-weight="800" letter-spacing="-1" text-anchor="middle" dominant-baseline="central">${escapeXml(brand.monogram)}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      // Varía por host, así que no puede cachearse en un intermediario compartido.
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** El monograma llega de configuración; se escapa antes de entrar al documento. */
function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
