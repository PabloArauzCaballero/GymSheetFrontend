import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GymSheet',
    short_name: 'GymSheet',
    description: 'Registro técnico de entrenamiento y operaciones de gimnasio.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#c3f400',
    icons: [{ src: '/brand-mark.svg', sizes: '64x64', type: 'image/svg+xml' }],
  };
}
