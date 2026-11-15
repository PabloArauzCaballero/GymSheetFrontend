/** Dónde se completa cada dato: su sección de «Editar perfil» (`#ancla`). */
const SECTION_OF: Record<string, string> = {
  FOTO: 'fotos',
  FOTOS_3: 'fotos',
  BIO: 'sobre-ti',
  NIVEL: 'entreno',
  INTERESES: 'entreno',
  DATOS: 'datos',
  NACIMIENTO: 'datos',
  GENERO: 'senda',
};

export function editHrefFor(code: string): string {
  const section = SECTION_OF[code];
  return section ? `/profile/editar#${section}` : '/profile/editar';
}
