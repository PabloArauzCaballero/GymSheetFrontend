import { forwardRef, useEffect, useRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Un `<select>` sin nombre accesible se anuncia como «cuadro combinado» y nada
 * más. En `/admin/facilities` habia nueve seguidos —un selector de estado por
 * fila de tabla— y ninguno decía de qué fila era (A-7 en
 * hive/reports/qa-frontend.md).
 *
 * El nombre puede llegar por dos caminos legítimos: `aria-label` propio, o el
 * `<label htmlFor>` que `<Field>` cablea en tiempo de ejecución. Por eso NO se
 * exige `aria-label` en el tipo, como se hizo con `ProgressTrack`: allí el
 * componente era la única fuente posible del nombre, aquí obligarlo en los ~50
 * usos que ya viven dentro de `<Field>` pisaría la etiqueta visible con un
 * texto duplicado (WCAG 2.5.3). Lo que sí se puede comprobar es el resultado:
 * este aviso mira el DOM ya montado y aplica la misma regla que axe, así que
 * cubre también el caso que el tipo jamás vería —un `<Select>` suelto dentro de
 * una celda de tabla— y no da falsos positivos sobre los que sí están bien.
 */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    const guardRef = useRef<HTMLSelectElement | null>(null);

    useEffect(() => {
      if (process.env.NODE_ENV === 'production') return;
      const node = guardRef.current;
      if (!node) return;
      const named =
        Boolean(node.getAttribute('aria-label')?.trim()) ||
        Boolean(node.getAttribute('aria-labelledby')?.trim()) ||
        Boolean(node.closest('label')) ||
        (node.id !== '' && document.querySelector(`label[for="${CSS.escape(node.id)}"]`) !== null);
      if (!named) {
        console.error(
          '[Select] sin nombre accesible: envuélvelo en <Field> o pásale aria-label. name=%s',
          node.name || '(sin name)',
        );
      }
    });

    return (
      <select
        ref={(node) => {
          guardRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          'h-11 w-full rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-low)] px-3 text-base text-[var(--text)] transition-all duration-200 hover:border-[var(--border)] focus:border-[var(--volt)] focus:shadow-[0_0_0_3px_rgb(var(--accent-channels)/0.14)]  disabled:opacity-50 sm:text-sm',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
