'use client';

import { useState } from 'react';
import type { EntityPaymentConfig, EntityPlan } from '@gymsheet/schemas';
import { OrderCheckoutModal } from './order-checkout-modal';

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
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </section>
  );
}
