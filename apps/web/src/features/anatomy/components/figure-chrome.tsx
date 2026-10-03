import type { MuscleInfo } from '@gymsheet/anatomy';
import { List, Minus, Plus, ScanLine, Shrink } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { ANATOMY_CANVAS, ANATOMY_CANVAS_CLEAR } from '@/shared/theme/anatomy-canvas';

/** Pastilla de vidrio sobre la figura: se lee sobre cualquier parte de la lámina. */
const glass =
  'pointer-events-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-3 text-xs font-semibold text-white/75 backdrop-blur-md transition-[background-color,color,transform] duration-[var(--dur-1)] ease-[var(--ease-out)] hover:bg-black/65 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95';

function ToolButton({
  label,
  onClick,
  active,
  round = false,
  children,
}: Readonly<{ label: string; onClick: () => void; active?: boolean; round?: boolean; children: ReactNode }>) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(glass, round && 'size-9 px-0', active && 'bg-white/20 text-white')}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

/**
 * Herramientas arriba —a la izquierda qué se ve, a la derecha cuánto se ve— y
 * el resultado abajo: el músculo señalado o, sin selección, cómo se usa.
 */
export function FigureChrome({
  showZones,
  onToggleZones,
  zoomed,
  onZoomIn,
  onZoomOut,
  onReset,
  info,
}: Readonly<{
  showZones: boolean;
  onToggleZones: () => void;
  zoomed: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  info: MuscleInfo | undefined;
}>) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <div className="flex gap-2">
          <ToolButton active={showZones} label="Mostrar zonas" onClick={onToggleZones}>
            <ScanLine aria-hidden className="size-4" />
            Zonas
          </ToolButton>
          <Link className={glass} href="/exercises/muscles">
            <List aria-hidden className="size-4" />
            Lista
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          <ToolButton label="Acercar" onClick={onZoomIn} round>
            <Plus aria-hidden className="size-4" />
          </ToolButton>
          <ToolButton label="Alejar" onClick={onZoomOut} round>
            <Minus aria-hidden className="size-4" />
          </ToolButton>
          {zoomed ? (
            <ToolButton label="Vista completa" onClick={onReset} round>
              <Shrink aria-hidden className="size-4" />
            </ToolButton>
          ) : null}
        </div>
      </div>

      <div
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-4 pt-10 text-center"
        style={{ backgroundImage: `linear-gradient(to top, ${ANATOMY_CANVAS} 35%, ${ANATOMY_CANVAS_CLEAR})` }}
      >
        {info ? (
          <p className="text-white">
            <span className="font-semibold">{info.name}</span>
            <span className="ml-2 text-sm text-white/55">
              {info.group.name} · {info.latinName}
            </span>
          </p>
        ) : (
          <p className="text-xs text-white/55">
            {zoomed
              ? 'Arrastra para moverte'
              : 'Pasa el ratón para ver cada músculo · pellizca o Ctrl + rueda para acercar'}
          </p>
        )}
      </div>
    </>
  );
}
