import type { LegalDocument, LegalDocumentVersion } from '@gymsheet/schemas';

/** Legal-acceptance rules and copy shared by web and mobile. */

export const legalDocumentLabels: Readonly<Record<LegalDocument, string>> = {
  TERMS: 'Términos y condiciones',
  PRIVACY: 'Política de privacidad',
};

export const legalGateCopy = {
  title: 'Actualizamos los términos',
  description: 'Revisa los documentos nuevos y acéptalos para seguir usando la app.',
  checkbox: 'He leído y acepto los documentos actualizados.',
  checkboxRequired: 'Marca la casilla para continuar.',
  submit: 'Aceptar y continuar',
  logout: 'Cerrar sesión',
  changedAgain: 'Los términos cambiaron otra vez. Revísalos y acéptalos de nuevo.',
  failed: 'No pudimos guardar tu aceptación. Inténtalo de nuevo.',
  outdatedAtSignup: 'Actualizamos los términos. Revísalos y acéptalos de nuevo.',
  versionUnavailable: 'No pudimos cargar los términos. Inténtalo de nuevo.',
} as const;

/** The version the signup form sends as `termsVersion`: the current TERMS one. */
export function termsVersionOf(documents: readonly LegalDocumentVersion[] | undefined): string | undefined {
  return documents?.find((entry) => entry.document === 'TERMS')?.version;
}

const knownDocuments: readonly string[] = ['TERMS', 'PRIVACY'] satisfies LegalDocument[];

/** Current versions carried by a 409 TERMS_VERSION_OUTDATED in `details.documents`. */
export function outdatedCurrentDocuments(details: unknown): LegalDocumentVersion[] | undefined {
  const documents = (details as { documents?: unknown } | null | undefined)?.documents;
  if (!Array.isArray(documents)) return undefined;
  const valid = documents.filter(
    (entry): entry is LegalDocumentVersion =>
      typeof entry?.version === 'string' && knownDocuments.includes(entry?.document),
  );
  return valid.length === documents.length ? valid : undefined;
}

const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/u;
const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** «Vigente desde el 25 de agosto de 2026» for date versions; the raw version otherwise. */
export function legalVersionLabel(version: string): string {
  const match = isoDate.exec(version);
  const month = match ? months[Number(match[2]) - 1] : undefined;
  if (!match || !month) return `Versión ${version}`;
  return `Vigente desde el ${Number(match[3])} de ${month} de ${match[1]}`;
}
