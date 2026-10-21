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
                    onClick={() => copyToClipboard(paymentConfig.aliasOrPhone ?? '', 'alias')}
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
    </>
  );
}
