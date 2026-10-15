/** Label for a server-authorized story reference in a chat message. */
export function storyReferenceLabel(available: boolean): string {
  return available ? 'Respuesta a una story' : 'Historia no disponible';
}
