'use client';

import Link from 'next/link';
import { BrandLockup, BrandMark, ReppMark } from '@/shared/components/brand/brand-mark';
import { useBrand } from '@/shared/theme/brand-provider';
import { gymsheetTenant } from '@gymsheet/design-tokens';

/**
 * Logotipo enlazado al inicio, como la cabecera del móvil. `compact`: under pressure (very large text on a
 * phone, the header's `@max-[16rem]`) the wordmark steps aside and the mark stays — the bar still says
 * whose app this is. The lockup is drawn in px, so the mark alone is 28 px at any text size.
 */
export function Brand({ compact = false }: Readonly<{ compact?: boolean }>) {
  const repp = useBrand().name === gymsheetTenant.name;
  return (
    <Link aria-label="Ir al inicio" className="group inline-flex min-h-11 items-center" href="/dashboard">
      <BrandLockup className={compact ? '@max-[16rem]:hidden' : undefined} size={28} />
      {compact ? (
        <span className="hidden @max-[16rem]:inline-flex">
          {repp ? <ReppMark size={28} /> : <BrandMark glow={false} size={28} />}
        </span>
      ) : null}
    </Link>
  );
}
