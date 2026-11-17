import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/** «← Mensajes» above a thread: the person's /chat or the business inbox. */
export function ThreadBackLink({ href }: Readonly<{ href: string }>) {
  return (
    <Link
      className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
      href={href}
    >
      <ArrowLeft aria-hidden className="size-4" />
      Mensajes
    </Link>
  );
}
