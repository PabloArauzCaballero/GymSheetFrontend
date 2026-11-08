import { useState } from 'react';
import type { EntityPaymentConfig, EntityPlan, PaymentOrder } from '@gymsheet/schemas';
import { directoryClient } from '../services/directory-client';
import { CheckoutBankDetails } from './checkout-bank-details';
import { ReceiptForm } from './receipt-form';

export interface OrderCheckoutModalProps {
  plan: EntityPlan;
  paymentConfig: EntityPaymentConfig | null;
  entityId: string;
  entityName: string;
  onClose: () => void;
}

export function OrderCheckoutModal({
  plan,
  paymentConfig,
  entityId,
  entityName,
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
    } catch (err: unknown) {
      setError(messageOf(err) ?? 'No se pudo generar la orden de pago. Asegúrate de haber iniciado sesión.');
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
    } catch (err: unknown) {
      setError(messageOf(err) ?? 'No se pudo enviar el comprobante.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-low)] p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <div>
            <span className="text-xs font-boldr text-[var(--accent-ink)]">
              Pago QR & Activación Inmediata
            </span>
            <h3 className="text-xl font-display font-bold text-[var(--text)]">
              {plan.name}
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Comercio: <span className="font-semibold text-[var(--text-muted)]">{entityName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-muted)] hover:bg-[var(--surface-high)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between text-xs font-semibold px-2">
          <div className={`flex items-center gap-1.5 ${step === 'create_order' ? 'text-[var(--accent-ink)]' : 'text-[var(--success)]'}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold">1</span>
            <span>Cuenta & QR</span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-[var(--surface-highest)]" />
          <div className={`flex items-center gap-1.5 ${step === 'upload_receipt' ? 'text-[var(--accent-ink)]' : step === 'completed' ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold">2</span>
            <span>Comprobante</span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-[var(--surface-highest)]" />
          <div className={`flex items-center gap-1.5 ${step === 'completed' ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold">3</span>
            <span>Verificación</span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-[var(--danger-bg)] border border-[var(--danger-border)] text-xs text-[var(--danger-text)]">
            {error}
          </div>
        )}

        {step === 'create_order' && (
          <div className="space-y-6">
            <CheckoutBankDetails plan={plan} paymentConfig={paymentConfig} />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={loading}
                className="px-6 py-3 rounded-full text-xs font-bold bg-[var(--volt)] hover:bg-[var(--volt)] text-[var(--accent-contrast)] transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Generando orden...' : 'Continuar y Subir Comprobante →'}
              </button>
            </div>
          </div>
        )}


        {step === 'upload_receipt' && order && (
          <ReceiptForm
            order={order}
            receiptUrl={receiptUrl}
            receiptReference={receiptReference}
            athleteNotes={athleteNotes}
            loading={loading}
            onReceiptUrl={setReceiptUrl}
            onReceiptReference={setReceiptReference}
            onAthleteNotes={setAthleteNotes}
            onSubmit={handleSubmitReceipt}
          />
        )}

        {/* STEP 3: Confirmación Final */}
        {step === 'completed' && order && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[var(--success-bg)] text-[var(--success)] flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h4 className="text-xl font-bold text-[var(--text)]">
                ¡Comprobante Enviado con Éxito!
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
                Tu orden <span className="font-mono font-bold text-[var(--accent-ink)]">{order.orderNumber}</span> está en proceso de verificación por el equipo de <span className="font-semibold text-[var(--text)]">{entityName}</span>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--surface-high)] text-xs text-left space-y-1.5 text-[var(--text-muted)]">
              <div className="flex items-center gap-2 text-[var(--success)] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
                Activación Automática de Membresía
              </div>
              <p>
                Una vez confirmado por el administrador, tu membresía quedará inmediatamente vinculada a tu cuenta de REPP y recibirás una notificación dentro de la plataforma.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 rounded-full text-xs font-bold bg-[var(--text)] text-[var(--background)] transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
function messageOf(error: unknown): string | null {
  return error instanceof Error && error.message ? error.message : null;
}
