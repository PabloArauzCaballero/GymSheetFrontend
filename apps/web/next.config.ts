import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // `camera=(self)`: la consola de administración captura rostros y códigos QR
  // con la cámara del equipo desde su propio origen. Micrófono y geolocalización
  // siguen denegados por completo porque ninguna pantalla los usa, y ningún
  // origen incrustado obtiene la cámara.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  // HSTS sólo tiene efecto sobre HTTPS, así que en local es inerte; se declara
  // aquí para que el despliegue no dependa de que alguien lo recuerde.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // CSP en **Report-Only** a propósito: la aplicación carga teselas de terceros
  // (OpenStreetMap, `branches-map.tsx`) y Next inyecta estilos y scripts en
  // línea, así que una política en modo bloqueo escrita a ciegas rompería el
  // mapa o la hidratación. En este modo el navegador informa de lo que habría
  // bloqueado sin romper nada: es el paso previo a activarla de verdad, cuando
  // haya informes reales que confirmen que la lista está completa. Ver M-9.
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      // `unsafe-inline`/`unsafe-eval`: hoy Next los necesita en desarrollo. Al
      // pasar a modo bloqueo hay que sustituirlos por nonce.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // `https:` cubre las teselas de OSM y las imágenes de medios remotos.
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // `ws:` es el recarga-en-caliente del servidor de desarrollo; `wss:` y el
      // propio origen cubren socket.io en producción.
      "connect-src 'self' ws: wss: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // Multi-inquilino se prueba en local sirviendo varios hosts contra el mismo
  // servidor. Sin esto el servidor de desarrollo bloquea sus propios recursos
  // (HMR) en cualquier host que no sea `localhost` y la hidratación no arranca.
  // Solo afecta al modo desarrollo.
  allowedDevOrigins: ['127.0.0.1'],
  transpilePackages: [
    '@gymsheet/types',
    '@gymsheet/schemas',
    '@gymsheet/api-client',
    '@gymsheet/domain',
    '@gymsheet/hooks',
    '@gymsheet/notifications',
    '@gymsheet/auth',
    '@gymsheet/design-tokens',
    '@gymsheet/observability',
  ],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
