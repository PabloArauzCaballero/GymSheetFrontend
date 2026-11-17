import type { AccountKind, UserRole } from '@gymsheet/types';
import type { BusinessNextStep, CategoryTreeNode, EntityType, LegalKind } from '@gymsheet/schemas';
import { signupRejectedMessage } from './account-security';
import { legalGateCopy } from './legal';

/**
 * Business signup (franja 8a, plan §4.1) and the business shell (§4.2),
 * shared by web and mobile: copy, the wizard's steps and where a session
 * resumes. Voice: de tú, short, verb first.
 */

/** A principal's shell. Older backends send no `accountKind`: the role decides. */
export function accountKindOf(principal: { role: UserRole; accountKind?: AccountKind }): AccountKind {
  return principal.accountKind ?? (principal.role === 'NEGOCIO' ? 'BUSINESS' : 'PERSON');
}

export const businessDestination = {
  web: { home: '/negocio', signup: '/negocio/registro', kyc: '/negocio/verificacion', newListing: '/negocio/publicaciones/nueva', orders: '/negocio/pedidos', payments: '/negocio/cobro' },
  mobile: {
    home: '/(business)',
    signup: '/(auth)/negocio-registro',
    completion: '/(business)/completar',
    kycWizard: '/(business)/verificar',
    kyc: '/(business)/verificacion',
    newListing: '/(business)/publicacion-nueva',
    orders: '/(business)/(tabs)/pedidos',
    payments: '/(business)/cobro',
  },
} as const;

export const businessEntryCopy = {
  prompt: '¿Tienes un negocio?',
  action: 'Regístralo',
} as const;

/** Step 0: one big card per type, one line each. */
export const businessTypeCards: ReadonlyArray<{ type: EntityType; title: string; description: string }> = [
  { type: 'GYM', title: 'Gimnasio', description: 'Sala, clases y membresías.' },
  { type: 'COACH', title: 'Coach o entrenador', description: 'Entrenas a personas por tu cuenta.' },
  { type: 'CENTER', title: 'Centro', description: 'Nutrición, fisioterapia, spa o bienestar.' },
  { type: 'STORE', title: 'Tienda', description: 'Suplementos, ropa o equipo deportivo.' },
  { type: 'SERVICE_PROVIDER', title: 'Servicio', description: 'Otro servicio para quien entrena.' },
];

export function businessTypeLabel(type: EntityType): string {
  return businessTypeCards.find((card) => card.type === type)?.title ?? 'Negocio';
}

/** Only SERVICE_PROVIDER chooses; the backend fixes the legal kind of the other types. */
export function needsLegalKind(type: EntityType | null | undefined): boolean {
  return type === 'SERVICE_PROVIDER';
}

export const legalKindChoices: ReadonlyArray<{ value: LegalKind; title: string; description: string }> = [
  { value: 'COMPANY', title: 'Empresa', description: 'Tienes razón social y NIT.' },
  { value: 'INDIVIDUAL', title: 'Persona', description: 'Ofreces el servicio a tu nombre.' },
];

/** Why step 0 cannot be left yet; null when it can. */
export function businessKindProblem(type: EntityType | null, legalKind: LegalKind | null): string | null {
  if (!type) return '¿Qué eres? Elige una opción para seguir.';
  if (needsLegalKind(type) && !legalKind) return 'Indica si eres empresa o persona.';
  return null;
}

/** Steps 0–3 create the account (franja 8a); 4–7 verify the business (KYC, franja 8b). */
export type BusinessWizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const BUSINESS_WIZARD_STEP_COUNT = 8;

export const businessWizardCopy = {
  progress: (step: BusinessWizardStep) => `Paso ${step + 1} de ${BUSINESS_WIZARD_STEP_COUNT}`,
  steps: [
    { title: '¿Qué eres?', description: 'Elige lo que mejor describe tu negocio.' },
    { title: 'Tu cuenta', description: 'Con este correo entras a tu panel de negocio.' },
    { title: 'Verifica tu correo', description: 'Te enviamos un código de seis dígitos.' },
    { title: 'Tu negocio', description: 'Así te van a encontrar en REPP.' },
    { title: 'Tu teléfono', description: 'Te enviamos un código por WhatsApp.' },
    { title: 'Datos legales', description: 'Los guardamos cifrados. Solo REPP los ve.' },
    { title: 'Documentos', description: 'Cada foto te dice al instante si se lee bien.' },
    { title: 'Revisa y envía', description: 'Si todo está bien, publicamos tu negocio en segundos.' },
  ],
  legalKindLegend: '¿Cómo ofreces el servicio?',
  chooseLegalKind: 'Indica si eres empresa o persona.',
  next: 'Seguir',
  back: 'Atrás',
  createAccount: 'Crear cuenta de negocio',
  saveBusiness: 'Guardar y seguir',
  fields: {
    businessName: { label: 'Nombre de tu negocio', placeholder: 'Top Fitness' },
    category: { label: 'Categoría', placeholder: 'Elige una categoría' },
    city: { label: 'Ciudad', placeholder: 'Santa Cruz' },
  },
  categoriesFailed: 'No pudimos cargar las categorías.',
  retry: 'Reintentar',
  saveFailed: 'No pudimos guardar tu negocio. Inténtalo de nuevo.',
  personSession: 'Cierra tu sesión personal para registrar un negocio.',
  logout: 'Cerrar sesión',
  signIn: 'Inicia sesión',
  signInSuffix: 'si ya registraste tu negocio.',
} as const;

/**
 * Where a signed-in business resumes the account part of the wizard, from
 * `GET /business/me` `nextSteps`: verify the email first, then «Tu negocio».
 * Null once steps 0–3 are done; the KYC steps resume from `kycPlace`.
 */
export function businessResumeStep(nextSteps: readonly BusinessNextStep[]): BusinessWizardStep | null {
  if (nextSteps.includes('VERIFY_EMAIL')) return 2;
  if (nextSteps.includes('CHOOSE_HANDLE') || nextSteps.includes('COMPLETE_PROFILE')) return 3;
  return null;
}

/** Step 1 checkbox (`textos-app-negocios.md` §1). Both names link to the current versions. */
export const businessTermsCopy = {
  prefix: 'Acepto los',
  businessTermsLabel: 'Términos para negocios',
  connector: 'y el',
  businessDpaLabel: 'Acuerdo de tratamiento de datos',
  helper: 'Tu selfie de verificación se pide aparte, en el paso de documentos.',
  required: 'Marca la casilla para crear tu cuenta de negocio.',
  reviewNotice: 'Este documento está en revisión legal. Publicamos el texto final antes de abrir el alta.',
} as const;

/** What a refused `POST /business/signup` tells the person, by code; null = use the generic auth message. */
export function businessSignupErrorMessage(code: string | undefined): string | null {
  switch (code) {
    case 'EMAIL_ALREADY_REGISTERED':
      return 'Ya hay una cuenta con este correo. Inicia sesión o usa otro.';
    case 'BUSINESS_SIGNUP_DISABLED':
      return 'El alta de negocios todavía no está abierta.';
    case 'BUSINESS_LEGAL_KIND_INVALID':
      return businessWizardCopy.chooseLegalKind;
    case 'SIGNUP_REJECTED':
      return signupRejectedMessage;
    case 'TERMS_VERSION_OUTDATED':
      return legalGateCopy.outdatedAtSignup;
    default:
      return null;
  }
}

/** One pending item of the business home, with where it is done. */
export const businessNextStepCopy: Readonly<
  Record<BusinessNextStep, { title: string; description: string; available: boolean }>
> = {
  VERIFY_EMAIL: { title: 'Verifica tu correo', description: 'Escribe el código que te enviamos.', available: true },
  CHOOSE_HANDLE: { title: 'Elige tu @usuario', description: 'Tu dirección pública en REPP.', available: true },
  COMPLETE_PROFILE: { title: 'Completa tu negocio', description: 'Categoría y ciudad.', available: true },
  SUBMIT_KYC: {
    title: 'Verifica tu negocio',
    description: 'Teléfono, datos legales y documentos.',
    available: true,
  },
};

export const businessHomeCopy = {
  title: 'Inicio',
  pendingTitle: 'Te falta',
  allDone: 'Tienes todo listo por ahora.',
  continue: 'Continuar',
  soon: 'Próximamente',
  handlePending: (handle: string) => `@${handle} · reservado hasta que verifiquemos tu negocio`,
  handleActive: (handle: string) => `@${handle}`,
  loadFailed: 'No pudimos cargar tu negocio.',
} as const;

export type KycBanner = { text: string; tone: 'success' | 'warning' | 'danger' | 'info'; action: string | null };

/** The KYC banner of the business home, by the account's `kycStatus` (and whether REPP already looked). */
export function kycBanner(kycStatus: string, accountStatus?: string): KycBanner {
  if (accountStatus === 'SUSPENDED' || kycStatus === 'SUSPENDED') {
    return { text: 'Tu negocio está suspendido · no se ve en REPP', tone: 'danger', action: 'Ver detalle' };
  }
  switch (kycStatus) {
    case 'DRAFT':
      return { text: 'Tu negocio está en borrador · completa la verificación', tone: 'warning', action: 'Continuar' };
    case 'AUTO_APPROVED':
      return { text: 'Tu negocio está publicado · REPP revisa tus datos', tone: 'success', action: 'Ver estado' };
    case 'APPROVED':
      return { text: 'Tu negocio está publicado · Verificado por REPP', tone: 'success', action: 'Ver estado' };
    case 'REJECTED':
      return { text: 'No pudimos verificar tu negocio · mira qué corregir', tone: 'danger', action: 'Ver qué falta' };
    default:
      return { text: 'Estamos revisando tu negocio · te avisamos cuando haya novedades', tone: 'info', action: 'Ver estado' };
  }
}

/** The banner's text alone (kept for callers that only show it). */
export function kycBannerCopy(kycStatus: string): string {
  return kycBanner(kycStatus).text;
}

/** The category tree as select options, parents before children: «Fitness · Gimnasio». */
export function categoryOptions(
  tree: readonly CategoryTreeNode[],
  trail: readonly string[] = [],
): Array<{ id: string; label: string }> {
  return tree.flatMap((node) => {
    const path = [...trail, node.name];
    return [{ id: node.id, label: path.join(' · ') }, ...categoryOptions(node.children, path)];
  });
}
