import { registerBenefitLabels, valuePitch } from '@gymsheet/domain';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ChevronDown, ChevronRight, Dumbbell, Trophy, Users } from 'lucide-react';
import { BranchCard } from '@/features/public-facilities/components/branch-card';
import { LandingPreview } from '@/features/public-facilities/components/landing-preview';
import { PublicFooter } from '@/features/public-facilities/components/public-footer';
import { PublicHeader } from '@/features/public-facilities/components/public-header';
import { listPublicBranches } from '@/features/public-facilities/services/public-facilities-server';
import { AmbientBackground } from '@/shared/components/background/ambient-background';
import { HeroSurface } from '@/shared/components/mobile/hero-surface';
import { IconBadge } from '@/shared/components/mobile/icon-badge';
import { Divider, ListCard } from '@/shared/components/mobile/nav-row';
import { Section } from '@/shared/components/mobile/section';
import { Reveal } from '@/shared/components/motion/reveal';
import { Badge } from '@/shared/components/ui/badge';
import { ButtonLink } from '@/shared/components/ui/button';

export const metadata: Metadata = {
  title: 'REPP · La red social de tu gimnasio',
  description: valuePitch.subline,
};

/** Las tres ventajas del alta del móvil, con el color de su magnitud. */
const BENEFIT_ICONS = [
  { icon: Dumbbell, tone: 'weight' },
  { icon: Users, tone: 'reps' },
  { icon: Trophy, tone: 'record' },
] as const;

const FEATURES = [
  {
    ...BENEFIT_ICONS[0],
    title: 'Entrena guiado',
    description: 'Abre la app y mira qué toca hoy, con series y carga. Registra cada serie en dos toques.',
  },
  {
    ...BENEFIT_ICONS[1],
    title: 'Tu gente',
    description: 'Descubre socios de tu gimnasio, conecta y chatea con quienes aceptaste.',
  },
  {
    ...BENEFIT_ICONS[2],
    title: 'Tu senda',
    description: 'Rangos, insignias y una racha que premia la constancia, semana a semana.',
  },
];

const PLANS = [
  { name: 'Inicio', price: 'Gratis', copy: 'Registro, historial y directorio para empezar.', featured: false },
  { name: 'Progreso', price: 'Bs 39/mes', copy: 'Rutinas, métricas avanzadas, rangos e insignias.', featured: true },
  { name: 'Gimnasio', price: 'A medida', copy: 'Membresías, accesos y la identidad de tu sede.', featured: false },
];

const FAQS = [
  ['¿Necesito pertenecer a un gimnasio asociado?', 'No. Registras tus entrenamientos desde el primer día. Si tu gimnasio está asociado, también accedes a sus funciones de sede y comunidad.'],
  ['¿Puedo usar REPP mientras entreno?', 'Sí. Cada serie se registra en pocos toques, con botones grandes pensados para el gimnasio.'],
  ['¿Mis datos están protegidos?', 'La sesión y los permisos se validan en el servidor. Tú decides qué compartes con la comunidad.'],
];

/**
 * Portada pública con el lenguaje de la app: el mensaje de la ficha de la
 * tienda, las ventajas del alta del móvil y, como ilustración, la pantalla de
 * Inicio pintada con los mismos componentes que el portal.
 */
export default async function LandingPage() {
  const branches = await listPublicBranches({});
  const preview = branches.slice(0, 3);

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-[var(--background)]">
      <AmbientBackground behind fixed reactive variant="auth" />
      <PublicHeader />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-20 px-6 pb-20 pt-10 sm:px-8 sm:pt-16">
        <section className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-16">
          <div className="reveal grid min-w-0 gap-6">
            <div className="grid gap-3">
              <h1 className="display-title max-w-xl sm:text-[52px]">{valuePitch.headline}</h1>
              <p className="max-w-lg text-[17px] leading-7 text-[var(--text-muted)]">{valuePitch.subline}</p>
            </div>
            <ul className="m-0 grid list-none gap-3 p-0">
              {registerBenefitLabels.map((label, index) => (
                <li className="flex items-center gap-3" key={label}>
                  <IconBadge icon={BENEFIT_ICONS[index]!.icon} tone={BENEFIT_ICONS[index]!.tone} />
                  <span className="text-[17px]">{label}</span>
                </li>
              ))}
            </ul>
            <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
              <ButtonLink href="/register" size="lg" variant="primary">
                Crear cuenta gratis <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
              <ButtonLink href="/login" size="lg" variant="ghost">
                Ya tengo cuenta
              </ButtonLink>
            </div>
            <p className="t-footnote text-[var(--text-muted)]">Sin tarjeta. Tus datos, bajo tu control.</p>
          </div>
          <div className="reveal min-w-0">
            <LandingPreview />
          </div>
        </section>

        <Reveal>
          <Section title="Así funciona">
            <div className="grid scroll-mt-28 gap-4 sm:grid-cols-3" id="producto">
              {FEATURES.map((feature) => (
                <div className="panel grid content-start gap-3 p-5" key={feature.title}>
                  <IconBadge icon={feature.icon} size={40} tone={feature.tone} />
                  <h2 className="title-text">{feature.title}</h2>
                  <p className="t-subhead text-[var(--text-muted)]">{feature.description}</p>
                </div>
              ))}
            </div>
          </Section>
        </Reveal>

        <Reveal>
          <Section title="Planes">
            <div className="grid scroll-mt-28 gap-4 lg:grid-cols-3" id="planes">
              {PLANS.map((plan) => (
                <article
                  className={`panel grid content-start gap-3 p-5 ${plan.featured ? 'border-[color-mix(in_srgb,var(--volt)_55%,transparent)]' : ''}`}
                  key={plan.name}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="t-headline">{plan.name}</h2>
                    {plan.featured ? <Badge tone="success">Recomendado</Badge> : null}
                  </div>
                  <p className="display-title text-[34px]">{plan.price}</p>
                  <p className="t-subhead min-h-10 text-[var(--text-muted)]">{plan.copy}</p>
                  <ButtonLink
                    href={plan.name === 'Gimnasio' ? '/gimnasios' : '/register'}
                    variant={plan.featured ? 'primary' : 'secondary'}
                  >
                    {plan.name === 'Gimnasio' ? 'Conocer opciones' : 'Elegir plan'}
                  </ButtonLink>
                </article>
              ))}
            </div>
          </Section>
        </Reveal>

        {preview.length > 0 ? (
          <Reveal>
            <Section
              action={
                <Link className="t-subhead inline-flex items-center gap-0.5 font-semibold text-[var(--accent-ink)]" href="/gimnasios">
                  Ver todas <ChevronRight aria-hidden className="size-4" />
                </Link>
              }
              title="Sedes cerca de ti"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                {preview.map((branch) => (
                  <BranchCard branch={branch} key={branch.id} />
                ))}
              </div>
            </Section>
          </Reveal>
        ) : null}

        <Reveal>
          <Section className="mx-auto w-full max-w-3xl" title="Preguntas frecuentes">
            <ListCard className="scroll-mt-28" id="preguntas">
              {FAQS.map(([question, answer], index) => (
                <div key={question}>
                  {index > 0 ? <Divider /> : null}
                  <details className="group py-2">
                    <summary className="t-headline flex min-h-12 cursor-pointer list-none items-center justify-between gap-4">
                      {question}
                      <ChevronDown
                        aria-hidden
                        className="size-5 shrink-0 text-[var(--text-muted)] transition-transform duration-[var(--dur-2)] group-open:rotate-180"
                      />
                    </summary>
                    <p className="t-subhead pb-3 text-[var(--text-muted)]">{answer}</p>
                  </details>
                </div>
              ))}
            </ListCard>
          </Section>
        </Reveal>

        <Reveal>
          <HeroSurface className="justify-items-center px-6 py-12 text-center" watermark>
            <h2 className="display-title max-w-xl">Entrena con tu gente.</h2>
            <p className="max-w-md text-[17px] leading-7 text-[var(--text-muted)]">
              Crea tu cuenta gratis y lleva tus rutinas, tu racha y tu gimnasio contigo.
            </p>
            <ButtonLink className="mt-2" href="/register" size="lg" variant="primary">
              Crear mi cuenta <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          </HeroSurface>
        </Reveal>
      </main>
      <PublicFooter />
    </div>
  );
}
