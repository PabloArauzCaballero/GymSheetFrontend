'use client';

import Link from 'next/link';
import { BrandLockup } from '@/shared/components/brand/brand-mark';

/** Logotipo enlazado al inicio, como la cabecera del móvil. */
export function Brand() {
  return (
    <Link aria-label="Ir al inicio" className="group inline-flex items-center" href="/dashboard">
      <BrandLockup size={28} />
    </Link>
  );
}
