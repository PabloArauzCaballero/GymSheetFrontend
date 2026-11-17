import type { OrderMethod, OrderStatus, OrderTimelineEntry } from '@gymsheet/schemas';

/**
 * Marketplace orders (franja 8d, backend ADR-0024) as both sides read them:
 * the person follows a three-step track, the business reads «Por confirmar»
 * with a deadline. Voice: de tú, short, verb first. Money is formatted from
 * the server's decimal strings, never through a float.
 */

export type OrderTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

/** `"1234.5"` + `BOB` → `Bs 1.234,50`: digits only, no float on the way. */
export function formatMoney(amount: string, currency: string): string {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/u.exec(amount.trim());
  const symbol = currency.trim() === 'BOB' ? 'Bs' : currency.trim();
  if (!match) return `${symbol} ${amount}`;
  const whole = (match[1] ?? '0').replace(/^0+(?=\d)/u, '').replace(/\B(?=(\d{3})+(?!\d))/gu, '.');
  const cents = (match[2] ?? '').padEnd(2, '0');
  return `${symbol} ${whole},${cents}`;
}

/** `unit × quantity` in whole cents (integers only), as a server-style decimal string. */
export function multiplyMoney(unit: string, quantity: number): string {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/u.exec(unit.trim());
  if (!match || !Number.isInteger(quantity) || quantity < 0) return unit;
  const cents = (Number.parseInt(match[1] ?? '0', 10) * 100 + Number.parseInt((match[2] ?? '').padEnd(2, '0'), 10)) * quantity;
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/** Only a product is bought by several units (backend `ORDER_MAX_QUANTITY` = 20). */
export const ORDER_MAX_QUANTITY = 20;
export function maxOrderQuantity(offerKind: string | null | undefined): number {
  return offerKind === 'PRODUCT' ? ORDER_MAX_QUANTITY : 1;
}

type OrderLike = { status: OrderStatus; method: OrderMethod; receipt?: { uploaded: boolean }; cancelReason?: string | null };

/** The chip of an order in «Mis compras». */
export function buyerOrderChip(order: OrderLike): { label: string; tone: OrderTone } {
  switch (order.status) {
    case 'PENDING_PAYMENT':
      return { label: 'Pendiente de pago', tone: 'warning' };
    case 'PENDING_VERIFICATION':
      return order.method === 'CASH' ? { label: 'Paga en el negocio', tone: 'warning' } : { label: 'En verificación', tone: 'info' };
    case 'CONFIRMED':
      return { label: 'Confirmado', tone: 'success' };
    case 'REJECTED':
      return { label: 'Rechazado', tone: 'danger' };
    case 'EXPIRED':
      return { label: 'Vencido', tone: 'neutral' };
    case 'CANCELLED':
      return { label: 'Cancelado', tone: 'neutral' };
  }
}

/** The chip of an order in the business inbox: what the business has to do. */
export function businessOrderChip(order: OrderLike): { label: string; tone: OrderTone } {
  switch (order.status) {
    case 'PENDING_VERIFICATION':
      return { label: 'Por confirmar', tone: 'warning' };
    case 'PENDING_PAYMENT':
      return { label: 'Esperando el pago', tone: 'neutral' };
    default:
      return buyerOrderChip(order);
  }
}

export type OrderStepState = 'done' | 'current' | 'upcoming' | 'stopped';
export type OrderStep = { key: 'payment' | 'verification' | 'confirmed'; label: string; state: OrderStepState };

const STOPPED_LABEL: Partial<Record<OrderStatus, string>> = { REJECTED: 'Rechazado', CANCELLED: 'Cancelado', EXPIRED: 'Vencido' };

/**
 * The buyer's track (plan §4.3): Pendiente de pago → En verificación por el
 * negocio → Confirmado. A rejected, cancelled or expired order stops at the
 * step where it was, with that word in its place. Cash skips the receipt.
 */
export function buyerOrderSteps(order: OrderLike): OrderStep[] {
  const cash = order.method === 'CASH';
  const labels: Array<[OrderStep['key'], string]> = [
    ['payment', cash ? 'Pedido enviado' : 'Pendiente de pago'],
    ['verification', cash ? 'Paga en efectivo en el negocio' : 'En verificación por el negocio'],
    ['confirmed', 'Confirmado'],
  ];
  const stopped = STOPPED_LABEL[order.status];
  const at = order.status === 'CONFIRMED' ? 3 : order.status === 'PENDING_PAYMENT' ? 0 : order.status === 'PENDING_VERIFICATION' ? 1 : cash || order.status === 'REJECTED' || order.receipt?.uploaded ? 1 : 0;
  return labels.map(([key, label], index) => {
    if (index < at) return { key, label, state: 'done' };
    if (index === at) return stopped ? { key, label: stopped, state: 'stopped' } : { key, label, state: 'current' };
    return { key, label, state: 'upcoming' };
  });
}

/** What the order detail offers the buyer next. */
export type BuyerNextStep = 'pay' | 'resend' | 'wait' | 'cash' | 'done' | 'closed';
export function buyerNextStep(order: OrderLike & { actions: { canUploadReceipt: boolean } }): BuyerNextStep {
  if (order.status === 'CONFIRMED') return 'done';
  if (order.status === 'PENDING_PAYMENT') return order.actions.canUploadReceipt ? 'pay' : 'closed';
  if (order.status === 'REJECTED') return order.actions.canUploadReceipt ? 'resend' : 'closed';
  if (order.status === 'PENDING_VERIFICATION') return order.method === 'CASH' ? 'cash' : 'wait';
  return 'closed';
}

/** One line of the order's history, in words. */
export function timelineEntryText(entry: Pick<OrderTimelineEntry, 'status' | 'by' | 'reasonCode'>, method: OrderMethod): string {
  switch (entry.status) {
    case 'PENDING_PAYMENT':
      return 'Pedido creado';
    case 'PENDING_VERIFICATION':
      return method === 'CASH' ? 'Pedido en efectivo creado' : 'Comprobante enviado';
    case 'CONFIRMED':
      return 'El negocio confirmó el pago';
    case 'REJECTED':
      return 'El negocio observó el pago';
    case 'EXPIRED':
      return 'Venció sin pago';
    case 'CANCELLED':
      if (entry.reasonCode === 'BUSINESS_UNAVAILABLE') return 'Cancelado: el negocio no está disponible';
      return entry.by === 'BUYER' ? 'Cancelaste el pedido' : 'Pedido cancelado';
  }
}

const HOUR = 3_600_000;

function span(ms: number): string {
  const hours = Math.floor(ms / HOUR);
  if (hours < 1) return `${Math.max(1, Math.floor(ms / 60_000))} min`;
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 día' : `${days} días`;
}

/**
 * The deadline badge of the business inbox: an order waiting for payment (or
 * a cash order) shows when it expires; a receipt waiting for the business shows
 * how long it has waited (the backend reminds at 24 h and 48 h).
 */
export function orderDeadline(
  order: { status: OrderStatus; expiresAt: string | null; submittedAt: string | null },
  now: number = Date.now(),
): { label: string; tone: OrderTone } | null {
  if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PENDING_VERIFICATION') return null;
  if (order.expiresAt) {
    const left = new Date(order.expiresAt).getTime() - now;
    if (Number.isNaN(left)) return null;
    if (left <= 0) return { label: 'Vence ya', tone: 'danger' };
    return { label: `Vence en ${span(left)}`, tone: left < 6 * HOUR ? 'warning' : 'neutral' };
  }
  if (!order.submittedAt) return null;
  const waited = now - new Date(order.submittedAt).getTime();
  if (Number.isNaN(waited)) return null;
  return { label: `Espera hace ${span(Math.max(waited, 60_000))}`, tone: waited >= 48 * HOUR ? 'danger' : waited >= 24 * HOUR ? 'warning' : 'neutral' };
}

/** «Mensual · 2 unidades» for the rows of both lists. */
export function orderItemLine(order: { listing: { name: string }; quantity: number }): string {
  return order.quantity > 1 ? `${order.listing.name} · ${order.quantity} unidades` : order.listing.name;
}
