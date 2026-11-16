import type { ReactNode } from 'react';

/**
 * Cabecera de pantalla del móvil (`ScreenHeader`): título en la display propia
 * a 34 (40 en escritorio) y subtítulo `subhead` en tono secundario. Sin raya
 * inferior: la pantalla se ordena por espacio, como en la app.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  titleAction,
  tutorialId,
}: Readonly<{
  /** Atajo junto al título, como la `action` del `ScreenHeader` del móvil (la campana de Inicio). */
  titleAction?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Stable anchor for the tutorial engine (rendered as data-tutorial-id). */
  tutorialId?: string;
}>) {
  return (
    <header
      data-tutorial-id={tutorialId}
      className="reveal flex flex-col gap-5 pb-2 sm:flex-row sm:items-end sm:justify-between"
    >
      {/* `min-w-0` es lo que permite que este bloque se encoja: por defecto un
          elemento flex no baja de su contenido (`min-width: auto`), así que a
          anchuras intermedias —1024px, un portátil cualquiera— el título
          empujaba las acciones fuera de la pantalla y la página entera se
          desplazaba en horizontal. */}
      <div className="grid min-w-0 max-w-3xl gap-1">
        {eyebrow ? (
          <p className="text-[0.9375rem] font-semibold leading-[1.35] text-[var(--accent-ink)]">{eyebrow}</p>
        ) : null}
        {titleAction ? (
          // The action wraps under the title only when the title's longest word and the action no
          // longer fit side by side (very large text on a phone); otherwise the row is unchanged.
          <div className="flex flex-wrap items-start gap-2">
            <h1 className="display-title min-w-0 flex-1 basis-[min-content]">{title}</h1>
            {titleAction}
          </div>
        ) : (
          <h1 className="display-title">{title}</h1>
        )}
        {/* rem, not px: the description grows with the browser text size like the title does. */}
        {description ? (
          <p className="mt-1 max-w-2xl text-[0.9375rem] leading-[1.35] text-[var(--text-muted)] sm:text-[1.0625rem] sm:leading-[1.4]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">{actions}</div>
      ) : null}
    </header>
  );
}
