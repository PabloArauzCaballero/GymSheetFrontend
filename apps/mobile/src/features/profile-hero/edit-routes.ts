/**
 * Dónde se completa cada dato del perfil. Las medidas y la fecha viven en el
 * asistente de `/profile-data` (la fecha es su tercer paso); el resto, en su
 * sección de «Editar perfil».
 */
export function editRouteFor(code: string): string {
  if (code === 'DATOS') return '/profile-data';
  if (code === 'NACIMIENTO') return '/profile-data?step=2';
  return `/profile-edit?section=${encodeURIComponent(code)}`;
}
