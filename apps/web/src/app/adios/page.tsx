import { goodbyeCopy } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { BrandLockup } from '@/shared/components/brand/brand-mark';
import { ButtonLink } from '@/shared/components/ui/button';

export const metadata: Metadata = { title: goodbyeCopy.title, robots: { index: false } };

/** Where a closed account lands, after the BFF cleared its session cookie. */
export default function GoodbyePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-10">
      <section
        aria-labelledby="goodbye-title"
        className="reveal grid w-full max-w-[28rem] justify-items-center gap-4 text-center"
      >
        <BrandLockup size={26} />
        <h1 className="title-text mt-4" id="goodbye-title">
          {goodbyeCopy.title}
        </h1>
        <p className="text-[15px] leading-6 text-[var(--text-muted)]">{goodbyeCopy.description}</p>
        <ButtonLink className="mt-2" href="/login" variant="secondary">
          {goodbyeCopy.action}
        </ButtonLink>
      </section>
    </main>
  );
}
