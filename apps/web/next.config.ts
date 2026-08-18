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
