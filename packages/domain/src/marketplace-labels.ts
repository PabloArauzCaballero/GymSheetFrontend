/**
 * Textos del Marketplace (precio, tipo de oferta y de vendedor, valoración),
 * compartidos por la web y el móvil. Tipos estructurales: el paquete de
 * dominio no depende de `@gymsheet/schemas`.
 */
export type MarketplaceOfferKind = 'MEMBERSHIP_PLAN' | 'PASS' | 'PRODUCT' | 'SERVICE';


/** Precio con la moneda del vendedor; sin `Intl` para la moneda, cae a «COD 250». */
export function formatPrice(amount: string | number, currency: string, durationDays?: number | null): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '';
  let text: string;
  try {
    text = new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency,
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  } catch {
    text = `${currency} ${Number.isInteger(value) ? value : value.toFixed(2)}`;
  }
  if (!durationDays || durationDays <= 0) return text;
  return `${text} · ${durationDays} ${durationDays === 1 ? 'día' : 'días'}`;
}

const OFFER_KIND: Record<MarketplaceOfferKind, string> = {
  MEMBERSHIP_PLAN: 'Membresía',
  PASS: 'Pase',
  PRODUCT: 'Producto',
  SERVICE: 'Servicio',
};

export function offerKindLabel(type: MarketplaceOfferKind): string {
  return OFFER_KIND[type] ?? 'Servicio';
}

const SELLER_KIND: Record<string, string> = {
  GYM: 'Gimnasio',
  STORE: 'Tienda',
  COACH: 'Coach',
};

export function sellerKindLabel(type: string): string {
  return SELLER_KIND[type] ?? 'Centro';
}

/** Sin reseñas se dice «Nuevo»: nunca una nota inventada. */
export function ratingLabel(average: number, count: number): string {
  return average > 0 && count > 0 ? `${average.toFixed(1)} (${count})` : 'Nuevo';
}

/** Primeras letras del nombre para el avatar de reserva. */
export function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}
