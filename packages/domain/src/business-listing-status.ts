import type { AdminListingFilter, ListingRejectionReason, ListingVisibility, SellerBadge } from '@gymsheet/schemas';

/**
 * Where a listing stands, said to its seller (franja 8c, plan §4.2): one chip
 * driven by the backend's `visibility`, with the reason when REPP or the
 * automatic checks are holding it. Never a raw code on screen.
 */

export type ListingChipTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';
export type ListingChip = { label: string; tone: ListingChipTone; detail: string | null };

/** Codes of the automatic checks (`autoCheckCodes`) and what the seller can do about them. */
export const listingCheckCopy: Readonly<Record<string, string>> = {
  PRICE_OUT_OF_BAND: 'El precio está fuera del rango permitido (de Bs 1 a Bs 50 000). Corrígelo y se publica sola.',
  PRICE_OUTLIER: 'El precio es muy distinto al de publicaciones parecidas. Revísalo o espera a que REPP la vea.',
  BANNED_TERMS: 'El texto usa palabras que no se permiten en el marketplace. Cámbialo y se publica sola.',
};

export const listingRejectionLabels: Readonly<Record<ListingRejectionReason, string>> = {
  PROHIBITED_PRODUCT: 'Producto o servicio no permitido',
  MISLEADING: 'Información engañosa',
  PRICE_ABUSE: 'Precio abusivo',
  DUPLICATE: 'Publicación repetida',
  OTHER: 'Otro motivo',
};

function reasonText(code: string | null | undefined): string | null {
  if (!code) return null;
  return listingCheckCopy[code] ?? listingRejectionLabels[code as ListingRejectionReason] ?? null;
}

export function listingChip(listing: {
  visibility: ListingVisibility;
  moderationReasonCode?: string | null;
  autoCheckCodes?: readonly string[];
}): ListingChip {
  switch (listing.visibility) {
    case 'PUBLIC':
      return { label: 'Publicada', tone: 'success', detail: null };
    case 'BUSINESS_NOT_PUBLIC':
      return { label: 'Tu negocio aún no es público', tone: 'info', detail: 'Se muestra cuando REPP apruebe tu negocio.' };
    case 'PAUSED':
      return { label: 'Pausada', tone: 'neutral', detail: 'Nadie la ve hasta que la reanudes.' };
    case 'ARCHIVED':
      return { label: 'Archivada', tone: 'neutral', detail: null };
    case 'UNDER_REVIEW': {
      const codes = listing.autoCheckCodes ?? [];
      const detail = codes.map((code) => listingCheckCopy[code]).find(Boolean) ?? 'REPP la revisa antes de mostrarla.';
      return { label: 'En revisión', tone: 'warning', detail };
    }
    case 'HIDDEN_BY_REPP':
      return {
        label: 'Oculta por REPP',
        tone: 'danger',
        detail: reasonText(listing.moderationReasonCode) ?? 'REPP la ocultó tras una denuncia. Te avisamos por la bandeja.',
      };
    case 'REJECTED_BY_REPP':
      return {
        label: 'Rechazada por REPP',
        tone: 'danger',
        detail: reasonText(listing.moderationReasonCode) ?? 'No puede mostrarse en el marketplace.',
      };
  }
}

/** Which state actions a listing offers (the backend refuses the rest with 409 LISTING_INVALID_TRANSITION). */
export function listingActions(status: string): { pause: boolean; resume: boolean; archive: boolean; edit: boolean } {
  return {
    pause: status === 'ACTIVE',
    resume: status === 'INACTIVE',
    archive: status === 'ACTIVE' || status === 'INACTIVE',
    edit: status !== 'ARCHIVED',
  };
}

/**
 * While REPP holds a listing HIDDEN or REJECTED its content (fields, price, new
 * photos) is frozen: `409 LISTING_LOCKED_BY_REPP`. Pause, resume, archive,
 * stock and removing a photo stay open. Null when nothing is locked.
 */
export function listingLockText(visibility: ListingVisibility | string | null | undefined): string | null {
  if (visibility === 'HIDDEN_BY_REPP' || visibility === 'HIDDEN') return 'REPP ocultó esta publicación: no puedes editarla mientras lo revisa.';
  if (visibility === 'REJECTED_BY_REPP' || visibility === 'REJECTED') return 'REPP rechazó esta publicación: ya no puedes editar su contenido.';
  return null;
}

export const sellerBadgeCopy: Readonly<Record<SellerBadge, string>> = {
  VERIFIED: 'Verificado por REPP',
  NEW: 'Nuevo',
};

/** REPP's «Publicaciones» tab: the three moderation queues. */
export const adminListingFilterLabels: Readonly<Record<AdminListingFilter, string>> = {
  HELD: 'Retenidas',
  HIDDEN: 'Ocultas',
  REJECTED: 'Rechazadas',
};

/** Errors of the listings flows, in Spanish; unknown codes fall back to the backend's own message. */
export const listingErrorCopy: Readonly<Record<string, string>> = {
  LISTING_SHAPE_INVALID: 'Faltan datos de este tipo de publicación. Revisa el detalle.',
  LISTING_CATEGORY_INVALID: 'Esa categoría no está disponible para tu negocio.',
  LISTING_LIMIT: 'Llegaste a 500 publicaciones abiertas. Archiva alguna para crear otra.',
  LISTING_NOT_EDITABLE: 'Una publicación archivada ya no se edita.',
  LISTING_SAME_PRICE: 'Ese ya es el precio. Escribe otro.',
  LISTING_STOCK_BELOW_RESERVED: 'Hay unidades reservadas en pedidos: el stock no puede ser menor.',
  LISTING_INVALID_TRANSITION: 'La publicación ya cambió de estado. Recarga para verla.',
  LISTING_MEDIA_LIMIT: 'Ya tiene 10 fotos. Quita una para subir otra.',
  LISTING_NOT_PUBLISHABLE: 'No cumple los datos de su tipo: el negocio tiene que corregirla.',
  LISTING_LOCKED_BY_REPP: 'REPP ocultó esta publicación: no puedes editarla mientras lo revisa.',
  LISTING_CHANGED_SINCE_REVIEW: 'La publicación cambió desde que la abriste. Revísala de nuevo.',
  LOCATION_NAME_TAKEN: 'Ya tienes una sede con ese nombre.',
  LOCATION_LIMIT: 'Llegaste a 50 sedes.',
  BUSINESS_GALLERY_LIMIT: 'La galería ya tiene 10 fotos. Quita una para subir otra.',
  BUSINESS_ACCOUNT_LOCKED: 'Tu cuenta de negocio está suspendida o cerrada.',
  EMAIL_VERIFICATION_REQUIRED: 'Verifica tu correo para publicar.',
};

export function listingErrorMessage(
  code: string | null | undefined,
  fallback: string,
  details?: Readonly<Record<string, unknown>> | null,
): string {
  if (code === 'LISTING_LOCKED_BY_REPP') return listingLockText(String(details?.moderationStatus ?? 'HIDDEN')) ?? fallback;
  return (code && listingErrorCopy[code]) || fallback;
}
