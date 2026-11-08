import { useState } from 'react';
import type { EntityPaymentConfig, EntityPlan } from '@gymsheet/schemas';

/** Paso 1 del pago: el importe, el QR y los datos bancarios del comercio. */
export function CheckoutBankDetails({
  plan,
  paymentConfig,
}: {
  plan: EntityPlan;
  paymentConfig: EntityPaymentConfig | null;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <>
      <div className="p-4 rounded-2xl bg-[color-mix(in_srgb,var(--volt)_12%,transparent)] border border-[color-mix(in_srgb,var(--volt)_20%,transparent)] flex items-center justify-between">
        <div>
          <span className="text-xs text-[var(--accent-ink)] font-semibold block">Total a transferir</span>
          <span className="text-2xl font-display font-bold text-[var(--text)]">
            {plan.currentPrice} {plan.currency}
          </span>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--volt)] text-[var(--accent-contrast)]">
          Tarifa Oficial
        </span>
      </div>

      {paymentConfig ? (
        <div className="space-y-4">
          {/* QR Display */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-high)]">
            <div className="w-48 h-48 rounded-2xl bg-[var(--surface-low)] p-3 shadow-md flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={paymentConfig.qrImageUrl}
                alt="Código QR de Pago"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xs text-[var(--text-muted)] mt-3 font-medium">
              Escanea este código desde la app de tu banco
            </span>
          </div>

          {/* Datos Bancarios Copiables */}
          <div className="rounded-2xl border border-[var(--border-subtle)] p-4 space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)]">Banco:</span>
              <span className="font-bold text-[var(--text)]">{paymentConfig.bankName}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)]">Titular:</span>
              <span className="font-semibold text-[var(--text)]">{paymentConfig.accountHolderName}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-muted)]">N° de Cuenta:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[var(--text)]">{paymentConfig.accountNumber}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(paymentConfig.accountNumber, 'acc')}
                  className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface-highest)] text-[var(--text-muted)] hover:bg-[var(--volt)] hover:text-[var(--text)] transition-colors"
                >
                  {copiedKey === 'acc' ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {paymentConfig.taxId && (
              <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">NIT / CI / Tax ID:</span>
                <span className="font-mono text-[var(--text)]">{paymentConfig.taxId}</span>
              </div>
            )}

            {paymentConfig.aliasOrPhone && (
              <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Alias / Móvil:</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[var(--text)]">{paymentConfig.aliasOrPhone}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(paymentConfig.aliasOrPhone ?? '', 'alias')}
                    className="text-[10px] px-2 py-0.5 rounded bg-[var(--surface-highest)] text-[var(--text-muted)] hover:bg-[var(--volt)] hover:text-[var(--text)] transition-colors"
                  >
                    {copiedKey === 'alias' ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            {paymentConfig.instructions && (
              <div className="pt-2 text-[var(--text-muted)]">
                <span className="font-semibold block mb-0.5">Instrucciones del oferente:</span>
                <p className="leading-relaxed">{paymentConfig.instructions}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-high)] text-xs text-[var(--text-muted)] space-y-2">
          <p>
            El comercio aún no ha subido un QR automático, pero puedes generar tu orden de compra oficial para coordinar el pago.
          </p>
        </div>
      )}
    </>
  );
}
