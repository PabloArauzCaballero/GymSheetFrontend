'use client';

import { useState } from 'react';
import type { EntityPaymentConfig, EntityPlan, PaymentOrder } from '@gymsheet/schemas';
import { directoryClient } from '../services/directory-client';

interface MarketplacePlansSectionProps {
  plans: EntityPlan[];
  paymentConfig: EntityPaymentConfig | null;
  entityId: string;
  entityName: string;
}

const PLAN_TYPE_LABELS: Record<string, string> = {
  MEMBERSHIP_PLAN: 'Membresía',
  PASS: 'Pase de Acceso',
  SERVICE: 'Servicio / Asesoría',
  PRODUCT: 'Producto Físico',
};

export function MarketplacePlansSection({
  plans,
  paymentConfig,
  entityId,
  entityName,
}: MarketplacePlansSectionProps) {
  const [selectedPlan, setSelectedPlan] = useState<EntityPlan | null>(null);

  if (!plans || plans.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-neutral-200/80 dark:border-neutral-800 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
            Marketplace Oficial
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Planes y Membresías Disponibles
          </h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
            Adquiere tu plan con pago directo vía QR y activación de membresía verificada.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const typeLabel = PLAN_TYPE_LABELS[plan.type] ?? plan.type;
          const isMembership = plan.type === 'MEMBERSHIP_PLAN';

          return (
            <div
              key={plan.id}
              className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/60 p-6 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 hover:border-amber-500/40"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {typeLabel}
                  </span>
                  {plan.durationDays && (
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                      {plan.durationDays} {plan.durationDays === 1 ? 'día' : 'días'}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-neutral-900 dark:text-white leading-snug">
                  {plan.name}
                </h3>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight">
                    {plan.currentPrice}
                  </span>
                  <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400">
                    {plan.currency}
                  </span>
                  {isMembership && plan.durationDays && (
                    <span className="text-xs text-neutral-400 ml-1">
                      / {plan.durationDays >= 30 ? 'mes' : `${plan.durationDays}d`}
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed line-clamp-3">
                  {plan.description}
                </p>

                {plan.benefits && plan.benefits.length > 0 && (
                  <ul className="mt-5 space-y-2 border-t border-neutral-100 dark:border-neutral-800/80 pt-4">
                    {plan.benefits.map((benefit, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300"
                      >
                        <svg
                          className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 2h2v3h-2v-3zm3 3h3v3h-3v-3zm-5 1h2v2h-2v-2zm0-4h2v2h-2v-2z" />
                  </svg>
                  Adquirir / Pagar con QR
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPlan && (
        <OrderCheckoutModal
          plan={selectedPlan}
          paymentConfig={paymentConfig}
          entityId={entityId}
          entityName={entityName}
          isOpen={true}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </section>
  );
}

interface OrderCheckoutModalProps {
  plan: EntityPlan;
  paymentConfig: EntityPaymentConfig | null;
  entityId: string;
  entityName: string;
  isOpen: boolean;
  onClose: () => void;
}

function OrderCheckoutModal({
  plan,
  paymentConfig,
  entityId,
  entityName,
  isOpen,
  onClose,
}: OrderCheckoutModalProps) {
  const [step, setStep] = useState<'create_order' | 'upload_receipt' | 'completed'>('create_order');
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comprobante
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptReference, setReceiptReference] = useState('');
  const [athleteNotes, setAthleteNotes] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const created = await directoryClient.createPaymentOrder({
        planId: plan.id,
        athleteNotes: athleteNotes.trim() ? athleteNotes.trim() : undefined,
      });
      setOrder(created);
      setStep('upload_receipt');
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo generar la orden de pago. Asegúrate de haber iniciado sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!receiptUrl.trim()) {
      setError('Debes ingresar la URL o comprobante de tu transferencia.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updated = await directoryClient.submitReceipt(order.id, {
        receiptUrl: receiptUrl.trim(),
        receiptReference: receiptReference.trim() ? receiptReference.trim() : undefined,
        athleteNotes: athleteNotes.trim() ? athleteNotes.trim() : undefined,
      });
      setOrder(updated);
      setStep('completed');
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo enviar el comprobante.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fakeUrl = `https://storage.gymsheet.com/receipts/${Date.now()}_${encodeURIComponent(file.name)}`;
    setReceiptUrl(fakeUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
              Pago QR & Activación Inmediata
            </span>
            <h3 className="text-xl font-black text-neutral-900 dark:text-white">
              {plan.name}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Comercio: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{entityName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between text-xs font-semibold px-2">
          <div className={`flex items-center gap-1.5 ${step === 'create_order' ? 'text-amber-500' : 'text-emerald-500'}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Cuenta & QR</span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-neutral-200 dark:bg-neutral-800" />
          <div className={`flex items-center gap-1.5 ${step === 'upload_receipt' ? 'text-amber-500' : step === 'completed' ? 'text-emerald-500' : 'text-neutral-400'}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold">2</span>
            <span>Comprobante</span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-neutral-200 dark:bg-neutral-800" />
          <div className={`flex items-center gap-1.5 ${step === 'completed' ? 'text-emerald-500' : 'text-neutral-400'}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold">3</span>
            <span>Verificación</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* STEP 1: Datos Bancarios y QR */}
        {step === 'create_order' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold block">Total a transferir</span>
                <span className="text-2xl font-black text-neutral-900 dark:text-white">
                  {plan.currentPrice} {plan.currency}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-neutral-950">
                Tarifa Oficial
              </span>
            </div>

            {paymentConfig ? (
              <div className="space-y-4">
                {/* QR Display */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                  <div className="w-48 h-48 rounded-2xl bg-white p-3 shadow-md flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={paymentConfig.qrImageUrl}
                      alt="Código QR de Pago"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 mt-3 font-medium">
                    Escanea este código desde la app de tu banco
                  </span>
                </div>

                {/* Datos Bancarios Copiables */}
                <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-neutral-100 dark:border-neutral-800/60">
                    <span className="text-neutral-500">Banco:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{paymentConfig.bankName}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-neutral-100 dark:border-neutral-800/60">
                    <span className="text-neutral-500">Titular:</span>
                    <span className="font-semibold text-neutral-900 dark:text-white">{paymentConfig.accountHolderName}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-neutral-100 dark:border-neutral-800/60">
                    <span className="text-neutral-500">N° de Cuenta:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-neutral-900 dark:text-white">{paymentConfig.accountNumber}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(paymentConfig.accountNumber, 'acc')}
                        className="text-[10px] px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-amber-500 hover:text-black transition-colors"
                      >
                        {copiedKey === 'acc' ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  {paymentConfig.taxId && (
                    <div className="flex justify-between items-center py-1 border-b border-neutral-100 dark:border-neutral-800/60">
                      <span className="text-neutral-500">NIT / CI / Tax ID:</span>
                      <span className="font-mono text-neutral-900 dark:text-white">{paymentConfig.taxId}</span>
                    </div>
                  )}

                  {paymentConfig.aliasOrPhone && (
                    <div className="flex justify-between items-center py-1 border-b border-neutral-100 dark:border-neutral-800/60">
                      <span className="text-neutral-500">Alias / Móvil:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900 dark:text-white">{paymentConfig.aliasOrPhone}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(paymentConfig.aliasOrPhone!, 'alias')}
                          className="text-[10px] px-2 py-0.5 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-amber-500 hover:text-black transition-colors"
                        >
                          {copiedKey === 'alias' ? '¡Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentConfig.instructions && (
                    <div className="pt-2 text-neutral-600 dark:text-neutral-400">
                      <span className="font-semibold block mb-0.5">Instrucciones del oferente:</span>
                      <p className="leading-relaxed">{paymentConfig.instructions}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-xs text-neutral-600 dark:text-neutral-300 space-y-2">
                <p>
                  El comercio aún no ha subido un QR automático, pero puedes generar tu orden de compra oficial para coordinar el pago.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={loading}
                className="px-6 py-3 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Generando orden...' : 'Continuar y Subir Comprobante →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Subir Comprobante */}
        {step === 'upload_receipt' && order && (
          <form onSubmit={handleSubmitReceipt} className="space-y-5">
            <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-xs flex justify-between items-center">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Número de Orden</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{order.orderNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Importe</span>
                <span className="font-bold text-neutral-900 dark:text-white">{order.amount} {order.currency}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Comprobante de Transferencia (Foto o Captura)
              </label>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleSimulateUpload}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-amber-500/10 file:text-amber-600 dark:file:text-amber-400 hover:file:bg-amber-500/20 text-neutral-600 dark:text-neutral-400"
                />
                <input
                  type="url"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="O pega la URL del comprobante..."
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                N° de Referencia de la Transferencia (Opcional)
              </label>
              <input
                type="text"
                value={receiptReference}
                onChange={(e) => setReceiptReference(e.target.value)}
                placeholder="Ej. TRX-12345678 o código de operación"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Notas para el Administrador (Opcional)
              </label>
              <textarea
                value={athleteNotes}
                onChange={(e) => setAthleteNotes(e.target.value)}
                rows={2}
                placeholder="Indica cualquier detalle adicional..."
                className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Subiendo comprobante...' : 'Confirmar y Enviar Comprobante'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Confirmación Final */}
        {step === 'completed' && order && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h4 className="text-xl font-bold text-neutral-900 dark:text-white">
                ¡Comprobante Enviado con Éxito!
              </h4>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
                Tu orden <span className="font-mono font-bold text-amber-500">{order.orderNumber}</span> está en proceso de verificación por el equipo de <span className="font-semibold text-neutral-800 dark:text-neutral-200">{entityName}</span>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 text-xs text-left space-y-1.5 text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Activación Automática de Membresía
              </div>
              <p>
                Una vez confirmado por el administrador, tu membresía quedará inmediatamente vinculada a tu cuenta de GymSheet y recibirás una notificación dentro de la plataforma.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 rounded-full text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
