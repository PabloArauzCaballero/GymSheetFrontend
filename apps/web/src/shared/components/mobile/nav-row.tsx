import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Tarjeta que es una lista de filas (`Card list` del móvil): sin hueco entre
 * hijos y con menos relleno vertical; las filas traen su alto y el divisor
 * separa.
 */
export function ListCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('panel px-5 py-2', className)} {...props} />;
}

/** Divisor fino entre filas de una misma tarjeta (`Divider`). */
export function Divider({ className }: Readonly<{ className?: string }>) {
  return <hr className={cn('m-0 h-px border-0 bg-[var(--border)]', className)} />;
}

/**
 * Fila que navega (`NavRow`): cabecera, título 17/600 hasta dos líneas,
 * subtítulo 15 en tono apagado, un dato al final y el chevrón. Alto mínimo 48.
 */
export function NavRow({
  href,
  leading,
  title,
  subtitle,
  meta,
}: Readonly<{
  href: string;
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
}>) {
  return (
    <Link
      className="tap group flex min-h-12 items-center gap-3 py-2 transition-opacity duration-[var(--dur-2)] hover:opacity-90"
      href={href}
    >
      {leading}
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="t-headline line-clamp-2">{title}</span>
        {subtitle ? (
          <span className="t-subhead truncate text-[var(--text-muted)]">{subtitle}</span>
        ) : null}
      </span>
      {meta}
      <ChevronRight
        aria-hidden
        className="size-5 shrink-0 text-[var(--text-muted)] transition-transform duration-[var(--dur-2)] group-hover:translate-x-0.5"
      />
    </Link>
  );
}
