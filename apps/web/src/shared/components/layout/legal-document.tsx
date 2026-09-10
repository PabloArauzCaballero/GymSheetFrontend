import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Chrome compartido de las páginas legales (`/terminos`, `/privacidad`).
 *
 * Deliberadamente ajeno al portal autenticado: se enlazan desde el registro,
 * antes de que exista una sesión, así que no pueden depender de su layout.
 */
export function LegalDocument({
  title,
  updatedAt,
  children,
}: Readonly<{ title: string; updatedAt: string; children: ReactNode }>) {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-14 sm:px-8">
      <Link
        className="text-sm font-medium text-[var(--text-muted)] underline decoration-[var(--volt)] underline-offset-4"
        href="/register"
      >
        ← Volver al registro
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-[var(--text)]">
        {title}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">Última actualización: {updatedAt}</p>
      <div className="mt-10 grid gap-6">{children}</div>
    </main>
  );
}
