/**
 * «Tus denuncias»: how a report reads to the person who filed it, the same on
 * web and mobile. Structural input, so this package keeps depending on
 * `@gymsheet/types` only.
 */
export type MyReportView = {
  targetKind: string;
  title: string | null;
  ownerName: string;
  status: string;
};

/** What a kind of content is called in a sentence: «Rutina de Ana». */
const KIND_NOUN: Record<string, string> = {
  ROUTINE: 'Rutina',
  EXERCISE: 'Ejercicio',
  COMMENT: 'Comentario',
  REEL: 'Reel',
  STORY: 'Historia',
  PROFILE_PHOTO: 'Foto de perfil',
  CHAT_MESSAGE: 'Mensaje',
  MUSIC_PLAYLIST: 'Playlist',
};

export function reportKindLabel(targetKind: string): string {
  return targetKind === 'USER' ? 'Perfil' : (KIND_NOUN[targetKind] ?? 'Contenido');
}

/**
 * The row's heading. Named content shows its name; the rest is said by kind
 * and owner, never by repeating what the person reported (a comment or a
 * message is not echoed back).
 */
export function myReportTitle(report: MyReportView): string {
  if (report.targetKind === 'USER') return report.ownerName;
  if (report.title?.trim()) return report.title.trim();
  return `${KIND_NOUN[report.targetKind] ?? 'Contenido'} de ${report.ownerName}`;
}

/** The only status a reporter gets: whether someone already looked at it. */
export function myReportStatusLabel(status: string): string {
  return status === 'REVISADA' ? 'Revisada' : 'En revisión';
}

/** Copy of the undo toast and the confirmation, shared by both apps. */
export const reportCopy = {
  sent: 'Denuncia enviada',
  sentHidden: 'Denuncia enviada. Retiramos el contenido mientras lo revisamos.',
  undo: 'Retirar',
  withdrawn: 'Denuncia retirada.',
  confirmTitle: 'Retirar denuncia',
  /**
   * Only what withdrawing really does: review stops, and a reported routine is
   * listed for you again. Connections and chats cut when reporting are not
   * restored (reconnecting is your own step), so nothing here promises that.
   */
  pageDescription:
    'Si retiras una denuncia, dejamos de revisarla y una rutina que denunciaste vuelve a aparecerte. Las conexiones o chats que se cortaron no vuelven solos.',
  confirmOpen: 'Dejaremos de revisarla.',
  confirmAgain: 'Puedes denunciarlo de nuevo cuando quieras.',
  confirmReviewed: 'Ya la revisamos y lo que decidimos se mantiene.',
  confirmRoutine: 'La rutina vuelve a aparecerte en Explorar y en el catálogo.',
  confirmPeople: 'Si se cortó una conexión o un chat con esa persona, no vuelve solo.',
  confirmLabel: 'Retirar',
  cancelLabel: 'Volver',
} as const;

/** Kind-aware: a routine comes back to your lists; for anything else, only the review stops. */
export function withdrawConfirmMessage(report: Pick<MyReportView, 'status' | 'targetKind'>): string {
  return [
    report.status === 'REVISADA' ? reportCopy.confirmReviewed : reportCopy.confirmOpen,
    report.targetKind === 'ROUTINE' ? reportCopy.confirmRoutine : reportCopy.confirmPeople,
    report.status === 'REVISADA' ? null : reportCopy.confirmAgain,
  ]
    .filter(Boolean)
    .join(' ');
}
