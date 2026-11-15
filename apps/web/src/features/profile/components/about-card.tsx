import { CirclePlus, Flag, Gauge, Heart } from 'lucide-react';
import Link from 'next/link';
import type { AboutChip } from '@/features/profile/hooks/use-own-profile';
import { Section } from '@/shared/components/mobile/section';

const CHIP_ICON = { goal: Flag, level: Gauge, interest: Heart } as const;

/**
 * «Sobre ti»: la bio y las fichas que también salen en tu carta. Se lee aquí y
 * se edita en «Editar perfil»; la tarjeta entera lleva allí.
 */
export function AboutCard({ bio, chips }: Readonly<{ bio: string | null; chips: readonly AboutChip[] }>) {
  return (
    <Section title="Sobre ti">
      <Link
        aria-label={bio ? `Tu bio: ${bio}. Editar` : 'Escribe tu bio'}
        className="panel grid gap-4 p-5 transition-colors duration-[var(--dur-2)] hover:bg-[var(--surface)]"
        data-testid="profile-about"
        href="/profile/editar#sobre-ti"
      >
        {bio ? (
          <p className="t-body">{bio}</p>
        ) : (
          <span className="t-subhead inline-flex items-center gap-2 font-semibold text-[var(--accent-ink)]">
            <CirclePlus aria-hidden className="size-5" />
            Escribe unas líneas sobre ti
          </span>
        )}
        {chips.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {chips.map((chip) => {
              const Icon = CHIP_ICON[chip.kind];
              return (
                <li className="t-subhead inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-high)] px-3 py-1.5" key={chip.key}>
                  <Icon aria-hidden className="size-4 text-[var(--text-muted)]" />
                  {chip.label}
                </li>
              );
            })}
          </ul>
        ) : null}
      </Link>
    </Section>
  );
}
