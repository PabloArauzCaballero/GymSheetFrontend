import type { KycDocument, KycDocumentKind, KycState, LegalKind } from '@gymsheet/schemas';
import type { BusinessWizardStep } from './business-onboarding';

/**
 * Business KYC (franja 8b, plan §4.1 steps 4–7, backend ADR-0021), shared by
 * web and mobile: where the wizard resumes from `GET /business/me/kyc`, the
 * parts of «Datos legales» (≤ 4 fields each), the document slots and the
 * readability verdict. Voice: de tú, short, verb first.
 */

/** «Datos legales» is split so no screen asks for more than four things. */
export type KycLegalPart = 'business' | 'company' | 'representative' | 'person';

export function kycLegalParts(legalKind: LegalKind, purpose: string | null | undefined): KycLegalPart[] {
  const own: KycLegalPart[] = legalKind === 'COMPANY' ? ['company', 'representative'] : ['person'];
  // A material change of an approved business may also rename it or change its category.
  return purpose === 'MATERIAL_CHANGE' ? ['business', ...own] : own;
}

export type KycPlace = { kind: 'wizard'; step: BusinessWizardStep; part?: KycLegalPart } | { kind: 'result' };

const STEP_OF_MISSING: Readonly<Record<string, BusinessWizardStep>> = {
  EMAIL_VERIFIED: 2,
  HANDLE: 3,
  CATEGORY: 3,
  CITY: 3,
  PHONE: 4,
  LEGAL_NAME: 5,
  NIT: 5,
  ADDRESS: 5,
  REP_FULL_NAME: 5,
  REP_CI: 5,
  SPECIALTY: 5,
  LOGO: 6,
  DOCUMENT_CI_FRONT: 6,
  DOCUMENT_CI_BACK: 6,
  DOCUMENT_SELFIE: 6,
};

/** The earliest step that a `missing[]` list (GET kyc or 422 KYC_INCOMPLETE) sends the business to. */
export function stepForMissing(missing: readonly string[]): BusinessWizardStep | null {
  const steps = missing.map((code) => STEP_OF_MISSING[code]).filter((step): step is BusinessWizardStep => step !== undefined);
  return steps.length > 0 ? (Math.min(...steps) as BusinessWizardStep) : null;
}

/** Which part of «Datos legales» holds the first missing datum. */
export function legalPartForMissing(legalKind: LegalKind, missing: readonly string[]): KycLegalPart | undefined {
  if (legalKind === 'INDIVIDUAL') return missing.some((code) => STEP_OF_MISSING[code] === 5) ? 'person' : undefined;
  if (missing.some((code) => ['LEGAL_NAME', 'NIT', 'ADDRESS'].includes(code))) return 'company';
  if (missing.some((code) => ['REP_FULL_NAME', 'REP_CI'].includes(code))) return 'representative';
  return undefined;
}

/**
 * Where a business with steps 0–3 done resumes: the exact KYC step while its
 * attempt is a DRAFT (or none exists yet), the result screen otherwise.
 */
export function kycPlace(state: KycState): KycPlace {
  const submission = state.submission;
  if (submission ? submission.status !== 'DRAFT' : state.kycStatus !== 'DRAFT') return { kind: 'result' };
  if (!state.phone) return { kind: 'wizard', step: 4 };
  if (!submission) return { kind: 'wizard', step: 5 };
  const step = stepForMissing(state.missing);
  if (step !== null) {
    const part = step === 5 ? legalPartForMissing(submission.legalKind, state.missing) : undefined;
    return { kind: 'wizard', step, ...(part ? { part } : {}) };
  }
  // A material change starts from the approved data: it opens where the data is edited.
  return { kind: 'wizard', step: submission.purpose === 'MATERIAL_CHANGE' ? 5 : 7 };
}

export type KycSlotKey = KycDocumentKind | 'LOGO';
export type KycDocumentSlot = {
  key: KycSlotKey;
  title: string;
  hint: string;
  required: boolean;
  /** Which camera the mobile opens first. */
  camera: 'back' | 'front';
};

const CI_FRONT: KycDocumentSlot = {
  key: 'CI_FRONT',
  title: 'Carnet, lado de la foto',
  hint: 'Apóyalo en una mesa, con luz pareja y que entre entero.',
  required: true,
  camera: 'back',
};
const CI_BACK: KycDocumentSlot = {
  key: 'CI_BACK',
  title: 'Carnet, reverso',
  hint: 'El mismo carnet, dado vuelta.',
  required: true,
  camera: 'back',
};
const SELFIE: KycDocumentSlot = {
  key: 'SELFIE',
  title: 'Selfie con gesto',
  hint: 'Tu cara entera, con el gesto que te pedimos.',
  required: true,
  camera: 'front',
};
const LOGO: KycDocumentSlot = {
  key: 'LOGO',
  title: 'Logo del negocio',
  hint: 'Se ve en tu ficha pública. JPG o PNG.',
  required: true,
  camera: 'back',
};
const SEPREC: KycDocumentSlot = {
  key: 'SEPREC',
  title: 'Matrícula SEPREC',
  hint: 'Opcional. Ayuda a verificarte más rápido.',
  required: false,
  camera: 'back',
};

/** The photos step 6 asks for: the representative's CI and selfie; a company adds its logo and, optionally, SEPREC. */
export function kycDocumentSlots(legalKind: LegalKind): KycDocumentSlot[] {
  return legalKind === 'COMPANY' ? [CI_FRONT, CI_BACK, SELFIE, LOGO, SEPREC] : [CI_FRONT, CI_BACK, SELFIE];
}

const READABILITY_REASON: Readonly<Record<string, string>> = {
  TOO_SMALL: 'La foto es muy pequeña. Acércate más.',
  LOW_CONTRAST: 'Se ve borrosa. Enfoca bien y no la muevas.',
  TOO_DARK: 'Está muy oscura. Busca más luz.',
  TOO_BRIGHT: 'Tiene mucha luz o reflejo. Evita el flash.',
  UNDECODABLE: 'No pudimos abrir la foto. Toma otra.',
};

export type DocumentVerdict = { readable: boolean; label: string; reason: string | null };

/** What the upload answer tells the person at once: «Legible ✓» or «Vuelve a tomarla» with why. */
export function documentVerdict(document: Pick<KycDocument, 'readable' | 'readabilityCodes'>): DocumentVerdict {
  if (document.readable) return { readable: true, label: 'Legible ✓', reason: null };
  const first = document.readabilityCodes.find((code) => READABILITY_REASON[code]);
  return { readable: false, label: 'Vuelve a tomarla', reason: first ? READABILITY_REASON[first]! : READABILITY_REASON.UNDECODABLE! };
}

/** The live document of a kind in the attempt (the backend keeps one per kind). */
export function documentOf(documents: readonly KycDocument[], kind: KycDocumentKind): KycDocument | undefined {
  return documents.find((document) => document.kind === kind);
}

/** Whether step 6 can be left: every required slot has a photo (readable or not; REPP reviews the rest). */
export function documentsComplete(legalKind: LegalKind, documents: readonly KycDocument[], hasLogo: boolean): boolean {
  return kycDocumentSlots(legalKind)
    .filter((slot) => slot.required)
    .every((slot) => (slot.key === 'LOGO' ? hasLogo : Boolean(documentOf(documents, slot.key))));
}

/** Only JPEG and PNG reach the backend: HEIC is refused there, so it is refused here first, with the fix. */
export const KYC_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const;
export const KYC_DOCUMENT_MAX_BYTES = 8 * 1024 * 1024;

export function kycImageProblem(file: { type?: string | null; size?: number | null }): string | null {
  const type = (file.type ?? '').toLowerCase();
  if (type.startsWith('image/hei')) return 'Esa foto está en HEIC. Usa JPG o PNG (en el iPhone: Ajustes › Cámara › Formatos › Más compatible).';
  if (!(KYC_IMAGE_TYPES as readonly string[]).includes(type)) return 'Usa una foto JPG o PNG.';
  if (file.size && file.size > KYC_DOCUMENT_MAX_BYTES) return 'La foto pesa más de 8 MB. Toma otra.';
  return null;
}
