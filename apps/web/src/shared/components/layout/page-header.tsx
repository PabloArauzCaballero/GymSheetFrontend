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
  tutorialId,
}: Readonly<{
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
          <p className="text-[15px] font-semibold leading-5 text-[var(--accent-ink)]">{eyebrow}</p>
        ) : null}
        <h1 className="display-title">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-[15px] leading-5 text-[var(--text-muted)] sm:text-[17px] sm:leading-6">
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
