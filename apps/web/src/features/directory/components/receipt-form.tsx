import type { PaymentOrder } from '@gymsheet/schemas';

interface ReceiptFormProps {
  order: PaymentOrder;
  receiptUrl: string;
  receiptReference: string;
  athleteNotes: string;
  loading: boolean;
  onReceiptUrl: (value: string) => void;
  onReceiptReference: (value: string) => void;
  onAthleteNotes: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

/**
 * Paso 2 del pago: el enlace al comprobante de la transferencia.
 *
 * La API todavía no recibe archivos de comprobante: se pide el enlace (Drive,
 * iCloud, la captura compartida) en vez de fingir una subida.
 */
export function ReceiptForm({
  order,
  receiptUrl,
  receiptReference,
  athleteNotes,
  loading,
  onReceiptUrl,
  onReceiptReference,
  onAthleteNotes,
  onSubmit,
}: ReceiptFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="p-3.5 rounded-2xl bg-[var(--surface-high)] text-xs flex justify-between items-center">
        <div>
          <span className="text-[var(--text-muted)] block text-xs font-bold">Número de Orden</span>
          <span className="font-mono font-bold text-[var(--text)]">{order.orderNumber}</span>
        </div>
        <div className="text-right">
          <span className="text-[var(--text-muted)] block text-xs font-bold">Importe</span>
          <span className="font-bold text-[var(--text)]">{order.amount} {order.currency}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="receipt-url" className="text-xs font-semibold text-[var(--text-muted)]">
          Enlace al comprobante de la transferencia
        </label>
        <input
          id="receipt-url"
          type="url"
          value={receiptUrl}
          onChange={(e) => onReceiptUrl(e.target.value)}
          placeholder="https://… (Drive, iCloud o la captura compartida)"
          className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-low)] text-[var(--text)] text-xs focus:ring-2 focus:ring-[color-mix(in_srgb,var(--volt)_22%,transparent)] focus:border-[var(--volt)] outline-none"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--text-muted)]">
          N° de Referencia de la Transferencia (Opcional)
        </label>
        <input
          type="text"
          value={receiptReference}
          onChange={(e) => onReceiptReference(e.target.value)}
          placeholder="Ej. TRX-12345678 o código de operación"
          className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-low)] text-[var(--text)] text-xs focus:ring-2 focus:ring-[color-mix(in_srgb,var(--volt)_22%,transparent)] focus:border-[var(--volt)] outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[var(--text-muted)]">
          Notas para el Administrador (Opcional)
        </label>
        <textarea
          value={athleteNotes}
          onChange={(e) => onAthleteNotes(e.target.value)}
          rows={2}
          placeholder="Indica cualquier detalle adicional..."
          className="w-full px-4 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-low)] text-[var(--text)] text-xs focus:ring-2 focus:ring-[color-mix(in_srgb,var(--volt)_22%,transparent)] focus:border-[var(--volt)] outline-none resize-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full text-xs font-bold bg-[var(--volt)] hover:bg-[var(--volt)] text-[var(--accent-contrast)] transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? 'Subiendo comprobante...' : 'Confirmar y Enviar Comprobante'}
        </button>
      </div>
    </form>
  );
}
