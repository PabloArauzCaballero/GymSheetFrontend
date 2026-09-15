import Link from 'next/link';

/** Cierre de las páginas públicas: sin esto, el scroll terminaba en el vacío. */
export function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-lowest)]">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div><Link className="text-xl font-semibold tracking-[-0.03em]" href="/">GymSheet</Link><p className="mt-4 max-w-xs text-sm leading-6 text-[var(--text-muted)]">Entrenamiento, progreso y comunidad en una experiencia precisa.</p></div>
        {[
          ['Producto', [['Cómo funciona', '/#producto'], ['Planes', '/#planes'], ['Gimnasios', '/gimnasios']]],
          ['Cuenta', [['Crear cuenta', '/register'], ['Iniciar sesión', '/login'], ['Recuperar acceso', '/recover-password']]],
          ['Legal', [['Privacidad', '/privacidad'], ['Términos', '/terminos'], ['Preguntas', '/#preguntas']]],
          /* Cada columna se nombra con su propio título: cuatro `<nav>` sin
             nombre en la misma página se anuncian todos como «navegación» y
             quien salta entre regiones no puede distinguirlos (axe:
             landmark-unique). */
        ].map(([title, links]) => <nav aria-label={title as string} key={title as string}><p className="data-label text-[var(--text)]">{title as string}</p><div className="mt-4 grid gap-3">{(links as string[][]).map(([label, href]) => <Link className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]" href={href!} key={href}>{label}</Link>)}</div></nav>)}
      </div>
      <div className="mx-auto max-w-6xl border-t border-[var(--border-subtle)] px-5 py-6 text-xs text-[var(--text-muted)] sm:px-8">© {year} GymSheet. Hecho para que cada progreso cuente.</div>
    </footer>
  );
}
