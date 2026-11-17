import type { CreateListingInput, EntityType, OfferKind, UpdateListingInput } from '@gymsheet/schemas';

/**
 * Business listings (franja 8c, plan §4.2 «Publicaciones», backend ADR-0022):
 * the offer kinds, which fields each kind takes (a mirror of the backend's
 * `SHAPE_BY_KIND`, so the form never sends what the server refuses) and the
 * four-step creation form. Voice: de tú, short, verb first.
 */

export const OFFER_KIND_ORDER: readonly OfferKind[] = [
  'MEMBERSHIP',
  'DAY_PASS',
  'MULTI_DAY_PASS',
  'CLASS_PACK',
  'SERVICE_SESSION',
  'SERVICE_PACK',
  'PRODUCT',
];

export const offerKindCopy: Readonly<Record<OfferKind, { label: string; description: string }>> = {
  MEMBERSHIP: { label: 'Membresía', description: 'Acceso por un tiempo: un mes, un trimestre, un año.' },
  DAY_PASS: { label: 'Pase de un día', description: 'Una visita, para probar o de paso.' },
  MULTI_DAY_PASS: { label: 'Pase de varios días', description: 'Acceso libre por algunos días seguidos.' },
  CLASS_PACK: { label: 'Paquete de clases', description: 'Un número de clases para usar cuando quieras.' },
  SERVICE_SESSION: { label: 'Sesión', description: 'Una sesión de entrenamiento, nutrición o fisio.' },
  SERVICE_PACK: { label: 'Paquete de sesiones', description: 'Varias sesiones de tu servicio juntas.' },
  PRODUCT: { label: 'Producto', description: 'Suplementos, ropa o equipamiento.' },
};

export function offerKindName(kind: string): string {
  return offerKindCopy[kind as OfferKind]?.label ?? 'Publicación';
}

/** Tabs of the panel and the public profile: kinds grouped as a buyer thinks of them. */
export type OfferKindGroup = 'access' | 'sessions' | 'products';
export const offerKindGroups: ReadonlyArray<{ id: OfferKindGroup; label: string; kinds: readonly OfferKind[] }> = [
  { id: 'access', label: 'Membresías y pases', kinds: ['MEMBERSHIP', 'DAY_PASS', 'MULTI_DAY_PASS'] },
  { id: 'sessions', label: 'Clases y sesiones', kinds: ['CLASS_PACK', 'SERVICE_SESSION', 'SERVICE_PACK'] },
  { id: 'products', label: 'Productos', kinds: ['PRODUCT'] },
];

export function offerKindGroupOf(kind: OfferKind): OfferKindGroup {
  return offerKindGroups.find((group) => group.kinds.includes(kind))?.id ?? 'access';
}

/** Kinds a business type usually sells first: they go on top of step 1, the rest follow. */
const SUGGESTED: Readonly<Partial<Record<EntityType, readonly OfferKind[]>>> = {
  GYM: ['MEMBERSHIP', 'DAY_PASS', 'MULTI_DAY_PASS', 'CLASS_PACK'],
  COACH: ['SERVICE_SESSION', 'SERVICE_PACK'],
  CENTER: ['SERVICE_SESSION', 'SERVICE_PACK', 'CLASS_PACK'],
  STORE: ['PRODUCT'],
  SERVICE_PROVIDER: ['SERVICE_SESSION', 'SERVICE_PACK'],
};

export function offerKindsFor(type: EntityType | null | undefined): OfferKind[] {
  const first = (type && SUGGESTED[type]) || [];
  return [...first, ...OFFER_KIND_ORDER.filter((kind) => !first.includes(kind))];
}

type Presence = 'REQUIRED' | 'OPTIONAL' | 'FORBIDDEN';
export type ListingShape = { validity: Presence; minValidityDays: number; sessions: Presence; product: boolean };

/** Same table as the backend's `listing.catalog.ts` (`SHAPE_BY_KIND`). */
export const LISTING_SHAPE: Readonly<Record<OfferKind, ListingShape>> = {
  MEMBERSHIP: { validity: 'REQUIRED', minValidityDays: 1, sessions: 'FORBIDDEN', product: false },
  DAY_PASS: { validity: 'FORBIDDEN', minValidityDays: 1, sessions: 'FORBIDDEN', product: false },
  MULTI_DAY_PASS: { validity: 'REQUIRED', minValidityDays: 2, sessions: 'FORBIDDEN', product: false },
  CLASS_PACK: { validity: 'OPTIONAL', minValidityDays: 1, sessions: 'REQUIRED', product: false },
  SERVICE_SESSION: { validity: 'FORBIDDEN', minValidityDays: 1, sessions: 'FORBIDDEN', product: false },
  SERVICE_PACK: { validity: 'OPTIONAL', minValidityDays: 1, sessions: 'REQUIRED', product: false },
  PRODUCT: { validity: 'FORBIDDEN', minValidityDays: 1, sessions: 'FORBIDDEN', product: true },
};

/** Whether step 4 («Detalle») has anything to ask for this kind. */
export function hasListingDetail(kind: OfferKind): boolean {
  const shape = LISTING_SHAPE[kind];
  return shape.validity !== 'FORBIDDEN' || shape.sessions !== 'FORBIDDEN' || shape.product;
}

/** What the person types: strings, as inputs hold them. */
export type ListingForm = {
  offerKind: OfferKind | null;
  name: string;
  description: string;
  /** One benefit per line. */
  benefits: string;
  price: string;
  validityDays: string;
  sessionsCount: string;
  stockQuantity: string;
  productCategoryId: string;
};

export const EMPTY_LISTING_FORM: ListingForm = {
  offerKind: null,
  name: '',
  description: '',
  benefits: '',
  price: '',
  validityDays: '',
  sessionsCount: '',
  stockQuantity: '',
  productCategoryId: '',
};

/** "250", "250.5", "1.250,50" or "Bs 250" → 250.5; null when it is not a price with ≤ 2 decimals. */
export function parsePriceInput(text: string): number | null {
  let value = text.replace(/bs\.?|bob/giu, '').replace(/\s/gu, '');
  if (!value) return null;
  // The last separator is the decimal one when it has 1–2 digits after it; the rest group thousands.
  const decimal = /[.,](\d{1,2})$/u.exec(value);
  const whole = decimal ? value.slice(0, decimal.index) : value;
  value = `${whole.replace(/[.,]/gu, '')}${decimal ? `.${decimal[1]}` : ''}`;
  if (!/^\d+(\.\d{1,2})?$/u.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && number <= 10_000_000 ? number : null;
}

function parseCount(text: string): number | null {
  const value = text.trim();
  return /^\d{1,7}$/u.test(value) ? Number(value) : null;
}

export type ListingFormField = 'offerKind' | 'name' | 'description' | 'price' | 'validityDays' | 'sessionsCount' | 'stockQuantity';
export type ListingFormErrors = Partial<Record<ListingFormField, string>>;

export const listingFormCopy = {
  kindRequired: 'Elige qué vas a publicar.',
  nameRequired: 'Escribe un nombre de al menos 2 letras.',
  descriptionRequired: 'Cuenta qué incluye en al menos 5 letras.',
  priceInvalid: 'Escribe el precio en bolivianos, por ejemplo 250 o 250,50.',
  validityRequired: (min: number) => (min > 1 ? `Escribe cuántos días dura (desde ${min}).` : 'Escribe cuántos días dura.'),
  validityInvalid: 'Escribe un número de días entre 1 y 3650.',
  sessionsRequired: 'Escribe cuántas sesiones incluye (de 1 a 1000).',
  stockInvalid: 'Escribe cuántas unidades tienes, o déjalo vacío si no llevas stock.',
} as const;

/** Errors of the fields a step shows; the backend repeats every check (422 LISTING_SHAPE_INVALID). */
export function listingFormErrors(form: ListingForm): ListingFormErrors {
  const errors: ListingFormErrors = {};
  if (!form.offerKind) return { offerKind: listingFormCopy.kindRequired };
  const shape = LISTING_SHAPE[form.offerKind];
  if (form.name.trim().length < 2) errors.name = listingFormCopy.nameRequired;
  if (form.description.trim().length < 5) errors.description = listingFormCopy.descriptionRequired;
  if (parsePriceInput(form.price) === null) errors.price = listingFormCopy.priceInvalid;
  const validity = parseCount(form.validityDays);
  if (shape.validity === 'REQUIRED' && (validity === null || validity < shape.minValidityDays)) {
    errors.validityDays = listingFormCopy.validityRequired(shape.minValidityDays);
  } else if (shape.validity === 'OPTIONAL' && form.validityDays.trim() && (validity === null || validity < 1 || validity > 3650)) {
    errors.validityDays = listingFormCopy.validityInvalid;
  }
  const sessions = parseCount(form.sessionsCount);
  if (shape.sessions === 'REQUIRED' && (sessions === null || sessions < 1 || sessions > 1000)) {
    errors.sessionsCount = listingFormCopy.sessionsRequired;
  }
  if (shape.product && form.stockQuantity.trim() && parseCount(form.stockQuantity) === null) {
    errors.stockQuantity = listingFormCopy.stockInvalid;
  }
  return errors;
}

/** Fields shown by each step of the four-step creation (plan §4.2). */
export const LISTING_STEP_FIELDS: Readonly<Record<1 | 2 | 3 | 4, readonly ListingFormField[]>> = {
  1: ['offerKind'],
  2: [],
  3: ['name', 'description', 'price'],
  4: ['validityDays', 'sessionsCount', 'stockQuantity'],
};

export function stepErrors(form: ListingForm, step: 1 | 2 | 3 | 4): ListingFormErrors {
  const all = listingFormErrors(form);
  return Object.fromEntries(LISTING_STEP_FIELDS[step].filter((field) => all[field]).map((field) => [field, all[field]]));
}

export function splitBenefits(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^[-•·*]\s*/u, '').trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((line) => line.slice(0, 200));
}

/** The `POST` body: forbidden fields go as null, so a kind never carries another's data. */
export function listingPayload(form: ListingForm): CreateListingInput | null {
  if (!form.offerKind || Object.keys(listingFormErrors(form)).length > 0) return null;
  const shape = LISTING_SHAPE[form.offerKind];
  const validity = parseCount(form.validityDays);
  return {
    offerKind: form.offerKind,
    name: form.name.trim(),
    description: form.description.trim(),
    benefits: splitBenefits(form.benefits),
    price: parsePriceInput(form.price) ?? 0,
    validityDays: shape.validity === 'FORBIDDEN' ? null : validity,
    sessionsCount: shape.sessions === 'FORBIDDEN' ? null : parseCount(form.sessionsCount),
    stockQuantity: shape.product ? parseCount(form.stockQuantity) : null,
    productCategoryId: shape.product && form.productCategoryId ? form.productCategoryId : null,
  };
}

/** The `PATCH` body of an edit (no kind, price or stock: those have their own routes). */
export function listingPatch(form: ListingForm): UpdateListingInput | null {
  const payload = listingPayload(form);
  if (!payload) return null;
  return {
    name: payload.name,
    description: payload.description,
    benefits: payload.benefits,
    validityDays: payload.validityDays,
    sessionsCount: payload.sessionsCount,
    productCategoryId: payload.productCategoryId,
  };
}

/** The form an existing listing opens with. */
export function listingFormOf(listing: {
  offerKind: OfferKind;
  name: string;
  description: string;
  benefits: string[];
  price: string;
  validityDays: number | null;
  sessionsCount: number | null;
  stockQuantity: number | null;
  productCategoryId: string | null;
}): ListingForm {
  const text = (value: number | null) => (value === null ? '' : String(value));
  return {
    offerKind: listing.offerKind,
    name: listing.name,
    description: listing.description,
    benefits: listing.benefits.join('\n'),
    price: listing.price.replace(/\.00$/u, ''),
    validityDays: text(listing.validityDays),
    sessionsCount: text(listing.sessionsCount),
    stockQuantity: text(listing.stockQuantity),
    productCategoryId: listing.productCategoryId ?? '',
  };
}

/** «30 días», «10 sesiones · vence a los 60 días», «Sin stock»: what the kind promises, in one line. */
export function listingTerms(listing: {
  offerKind: OfferKind;
  validityDays: number | null;
  sessionsCount: number | null;
  inStock?: boolean | null;
}): string {
  const days = (count: number) => `${count} ${count === 1 ? 'día' : 'días'}`;
  const parts: string[] = [];
  if (listing.sessionsCount) parts.push(`${listing.sessionsCount} ${listing.sessionsCount === 1 ? 'sesión' : 'sesiones'}`);
  if (listing.validityDays) parts.push(parts.length > 0 ? `vence a los ${days(listing.validityDays)}` : days(listing.validityDays));
  if (listing.offerKind === 'DAY_PASS') parts.push('1 día');
  if (listing.offerKind === 'SERVICE_SESSION') parts.push('1 sesión');
  if (listing.offerKind === 'PRODUCT' && listing.inStock === false) parts.push('Sin stock');
  return parts.join(' · ');
}
