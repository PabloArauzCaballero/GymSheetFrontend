import {
  CONSENT_REQUIRED,
  SOCIAL_MAP_DISABLED,
  consentKinds,
  type Consent,
  type ConsentKind,
  type ConsentVersion,
  type SetConsentInput,
} from '@gymsheet/schemas';

/** Copy and pure rules of the separate consents (ADR-0014), shared by web and mobile. */

export type ConsentCopy = {
  title: string;
  /** What the datum is used for, in one line. */
  purpose: string;
  /** What revoking erases, in one line. */
  revokeEffect: string;
  /** Checkbox label where the datum is asked for. */
  grantLabel: string;
};

export const consentCopy: Readonly<Record<ConsentKind, ConsentCopy>> = {
  HEALTH: {
    title: 'Datos de salud',
    purpose:
      'Guardamos lo que escribes sobre tus lesiones o condiciones físicas. Solo lo ves tú, en la copia de tus datos. Hoy no cambia tus rutinas.',
    revokeEffect: 'Borramos tus consideraciones físicas.',
    grantLabel:
      'Acepto que REPP guarde lo que escribo sobre mi salud y mis condiciones físicas. Es opcional y lo puedo retirar en Ajustes.',
  },
  ORIENTATION: {
    title: 'Orientación',
    purpose:
      'Guardamos tu orientación para tu perfil de Conocer. Solo se ve si activas «Mostrar en mi perfil». Nunca la usamos para ordenar ni filtrar perfiles.',
    revokeEffect: 'Borramos tu orientación y dejamos de mostrarla.',
    grantLabel:
      'Acepto que REPP guarde mi orientación (dato sensible) para mi perfil de Conocer. Solo se ve si activo «Mostrar en mi perfil».',
  },
  VERIFICATION_SELFIE: {
    title: 'Selfie de verificación',
    purpose:
      'Una persona de moderación compara tu selfie con tus fotos para darte la marca «Verificado». Borramos la selfie 30 días después de decidir.',
    revokeEffect:
      'Borramos tus selfies y cancelamos la verificación en curso. Si ya estás verificado, la marca se queda.',
    grantLabel:
      'Acepto que REPP guarde mi selfie de verificación para que una persona de moderación la compare con mis fotos. Se borra 30 días después de la decisión.',
  },
  PRECISE_LOCATION: {
    title: 'Ubicación precisa',
    purpose:
      'Guardamos tu última ubicación para mostrarte en el mapa social, en una zona de unos 2 km, y para calcular distancias en Conocer. Nadie ve tu punto exacto.',
    revokeEffect: 'Borramos tu ubicación y te quitamos del mapa. Conocer calcula distancias desde tu sede.',
    grantLabel:
      'Acepto que REPP guarde mi última ubicación para mostrarme en el mapa social en una zona aproximada y para calcular distancias en Conocer.',
  },
};

/** Helper lines under the health checkbox of onboarding: without and with considerations typed. */
export const onboardingHealthConsentHint = {
  optional: 'Opcional. Solo hace falta si escribes consideraciones físicas.',
  needed: 'Necesario para guardar tus consideraciones físicas. Lo retiras en Ajustes y las borramos.',
} as const;

export const consentsSectionCopy = {
  title: 'Consentimientos',
  description: 'Datos sensibles que solo guardamos si aceptas. Retíralos cuando quieras.',
  granted: 'Aceptado',
  notGranted: 'Sin aceptar',
  outdated: 'El texto cambió. Vuelve a aceptarlo.',
  grant: 'Aceptar',
  renew: 'Aceptar de nuevo',
  revoke: 'Retirar',
  revokeTitle: (kind: ConsentKind) => `¿Retirar «${consentCopy[kind].title}»?`,
  revokeConfirm: 'Retirar y borrar',
  grantedNotice: 'Consentimiento guardado.',
  revokedNotice: 'Consentimiento retirado. Borramos el dato.',
  versionChanged: 'El texto cambió mientras lo leías. Revísalo y acéptalo otra vez.',
  promptTitle: (kind: ConsentKind) => `Falta tu consentimiento: ${consentCopy[kind].title}`,
  promptConfirm: 'Aceptar y continuar',
} as const;

/** Every kind, in the backend's order, so lists look the same on every platform. */
export const consentKindOrder: readonly ConsentKind[] = consentKinds;

/**
 * The kinds the settings list shows, in `consentKindOrder`. VERIFICATION_SELFIE
 * stays out until the selfie screen exists (franja 6): add it back here.
 */
export const settingsConsentKinds: readonly ConsentKind[] = consentKindOrder.filter(
  (kind) => kind !== 'VERIFICATION_SELFIE',
);

/** The consents of the settings list: only `settingsConsentKinds`, in that order. */
export function settingsConsents<T extends Pick<Consent, 'kind'>>(consents: readonly T[]): T[] {
  return consents
    .filter((consent) => settingsConsentKinds.includes(consent.kind))
    .sort((a, b) => settingsConsentKinds.indexOf(a.kind) - settingsConsentKinds.indexOf(b.kind));
}

const isConsentKind = (value: unknown): value is ConsentKind =>
  typeof value === 'string' && (consentKinds as readonly string[]).includes(value);

/**
 * The consent a failed write asks for (400 `CONSENT_REQUIRED`, `details.kind`),
 * or null for any other failure. Duck-typed so this package stays HTTP-free.
 */
export function consentRequiredKind(error: unknown): ConsentKind | null {
  const { code, details } = (error ?? {}) as { code?: unknown; details?: unknown };
  if (code !== CONSENT_REQUIRED) return null;
  const kind = (details as { kind?: unknown } | null | undefined)?.kind;
  return isConsentKind(kind) ? kind : null;
}

/** Granted to the current text: nothing to ask. */
export function isConsentActive(consent: Pick<Consent, 'granted' | 'upToDate'> | undefined): boolean {
  return Boolean(consent?.granted && consent.upToDate);
}

/** The current version of one consent text, from `/me/consents` or `/legal/current`. */
export function currentConsentVersion(
  source: readonly (Pick<Consent, 'kind' | 'currentVersion'> | ConsentVersion)[] | undefined,
  kind: ConsentKind,
): string | undefined {
  const entry = source?.find((item) => item.kind === kind);
  if (!entry) return undefined;
  return 'currentVersion' in entry ? entry.currentVersion : entry.version;
}

/** `PUT /me/consents/:kind` body. */
export function consentInput(granted: boolean, version?: string): SetConsentInput {
  if (!granted) return { granted: false };
  if (!version) throw new Error('A consent is granted to a known text version.');
  return { granted: true, version };
}

/** The current version a 409 `CONSENT_VERSION_OUTDATED` carries in `details.currentVersion`. */
export function outdatedConsentVersion(details: unknown): string | undefined {
  const value = (details as { currentVersion?: unknown } | null | undefined)?.currentVersion;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Social map closed to a viewer who does not share (403 `SOCIAL_MAP_DISABLED`). */
export function isSocialMapDisabled(error: unknown): boolean {
  return (error as { code?: unknown } | null | undefined)?.code === SOCIAL_MAP_DISABLED;
}

export const socialMapDisabledCopy = {
  title: 'Comparte para ver',
  description: 'Para ver a otras personas en el mapa, activa tu perfil social y tu visibilidad en el mapa.',
  action: 'Activar en mi perfil',
} as const;
