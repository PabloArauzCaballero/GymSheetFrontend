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
        <label htmlFor="receipt-url" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          Enlace al comprobante de la transferencia
        </label>
        <input
          id="receipt-url"
          type="url"
          value={receiptUrl}
          onChange={(e) => onReceiptUrl(e.target.value)}
          placeholder="https://… (Drive, iCloud o la captura compartida)"
          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          N° de Referencia de la Transferencia (Opcional)
        </label>
        <input
          type="text"
          value={receiptReference}
          onChange={(e) => onReceiptReference(e.target.value)}
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
          onChange={(e) => onAthleteNotes(e.target.value)}
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
  );
}
