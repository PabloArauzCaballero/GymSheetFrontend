import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, ArrowRight, ArrowUpRight, BarChart3, Check, Dumbbell, MapPin, ShieldCheck, Sparkles, TrendingUp, Users2 } from 'lucide-react';
import { BranchCard } from '@/features/public-facilities/components/branch-card';
import { PublicFooter } from '@/features/public-facilities/components/public-footer';
import { PublicHeader } from '@/features/public-facilities/components/public-header';
import { listPublicBranches } from '@/features/public-facilities/services/public-facilities-server';
import { AmbientBackground } from '@/shared/components/background/ambient-background';
import { Reveal } from '@/shared/components/motion/reveal';
import { ButtonLink } from '@/shared/components/ui/button';

export const metadata: Metadata = {
  title: 'GymSheet — Registro de entrenamiento y comunidad de gimnasio',
  description:
    'Lleva tu progreso de entrenamiento, conecta con otros socios de tu gimnasio y encuentra la sede más cercana.',
};

const FEATURES = [
  {
    icon: Activity,
    title: 'Entrenamientos y rutinas',
    description: 'Registra cada serie, sigue tus rutinas y consulta tu historial completo.',
  },
  {
    icon: TrendingUp,
    title: 'Tu senda',
    description: 'Progresión gamificada: rangos, insignias y una racha que premia la constancia.',
  },
  {
    icon: Users2,
    title: 'Comunidad',
    description: 'Conecta con otros socios de tu gimnasio y chatea con quienes ya aceptaste.',
  },
];

const PLANS = [
  { name: 'Inicio', price: 'Gratis', copy: 'Registro, historial y directorio para empezar con claridad.' },
  { name: 'Progreso', price: 'Bs 39/mes', copy: 'Rutinas, métricas avanzadas, rangos e insignias.', featured: true },
  { name: 'Gimnasio', price: 'A medida', copy: 'Membresías, accesos y una identidad propia para tu sede.' },
];

const FAQS = [
  ['¿Necesito pertenecer a un gimnasio asociado?', 'No. Puedes registrar tus entrenamientos desde el primer día. Si tu gimnasio está asociado, también accedes a sus funciones de sede y comunidad.'],
  ['¿Puedo usar GymSheet mientras entreno?', 'Sí. Los flujos están pensados para registrar una serie en pocos toques, con controles claros y objetivos táctiles amplios.'],
  ['¿Mis datos están protegidos?', 'La sesión y los permisos se validan en el servidor. Tú decides qué información compartes con la comunidad.'],
];

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl" aria-label="Vista previa de una sesión en GymSheet">
      {/* El halo sangraba 32 px por cada lado también en móvil, y a 412 px eso
          empujaba la página 12 px a la derecha: barra de scroll horizontal en la
          portada por un adorno (M-12). Arriba y abajo puede sangrar sin coste; a
          los lados solo a partir de `sm`, donde ya sobra ancho. */}
      <div aria-hidden className="absolute inset-x-0 -inset-y-8 rounded-full bg-[color-mix(in_srgb,var(--volt)_12%,transparent)] blur-3xl sm:-inset-x-8" />
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-lowest)] shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4"><span className="data-label flex items-center gap-2 text-[var(--text-muted)]"><span className="size-2 rounded-full bg-[var(--volt)]" />Sesión en curso</span><span className="font-mono text-xs text-[var(--text-muted)]">42:18</span></div>
        <div className="grid gap-5 p-6">
          <div className="flex items-start justify-between"><div><p className="text-sm text-[var(--text-muted)]">Empuje · Semana 6</p><p className="mt-1 text-2xl font-bold">Press de banca</p></div><span className="grid size-11 place-items-center rounded-[var(--radius-lg)] bg-[var(--volt)] text-[var(--accent-contrast)]"><Dumbbell className="size-5" /></span></div>
          <div className="grid grid-cols-3 gap-2">{[['Peso','80 kg'],['Reps','8'],['RIR','2']].map(([label,value]) => <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-3" key={label}><p className="data-label text-[var(--text-disabled)]">{label}</p><p className="mt-2 text-lg font-bold tabular-nums">{value}</p></div>)}</div>
          <div><div className="mb-2 flex justify-between text-xs"><span className="text-[var(--text-muted)]">Volumen de la sesión</span><span className="font-semibold text-[var(--accent-ink)]">+12%</span></div><div className="h-2 rounded-full bg-[var(--surface-high)]"><div className="h-full w-[72%] rounded-full bg-[var(--volt)]" /></div></div>
          <div className="flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 text-sm"><span className="flex items-center gap-2 text-[var(--success-text)]"><TrendingUp className="size-4" />Mejor marca del mes</span><strong>6.240 kg</strong></div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const branches = await listPublicBranches({});
  const preview = branches.slice(0, 3);

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-[var(--background)]">
      <AmbientBackground behind fixed reactive variant="auth" />
      <PublicHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:py-28">
          <div>
            <p className="reveal data-label inline-flex items-center gap-2 text-[var(--accent-ink)]"><Sparkles className="size-4" />Tu entrenamiento, por fin conectado</p>
            <h1 className="reveal display-title text-gradient-volt mt-6 max-w-2xl" style={{ animationDelay: '80ms' } as CSSProperties}>Entrena con precisión. Progresa con propósito.</h1>
            <p className="reveal mt-6 max-w-xl text-lg leading-8 text-[var(--text-muted)]" style={{ animationDelay: '150ms' } as CSSProperties}>GymSheet convierte cada serie en una historia de progreso y conecta todo lo que vives en tu gimnasio, sin hojas sueltas ni aplicaciones fragmentadas.</p>
            <div className="reveal mt-8 flex flex-wrap gap-3" style={{ animationDelay: '220ms' } as CSSProperties}><ButtonLink href="/register" size="lg" variant="primary">Empezar gratis <ArrowRight className="size-4" /></ButtonLink><ButtonLink href="#producto" size="lg" variant="secondary">Ver cómo funciona</ButtonLink></div>
            <div className="reveal mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--text-muted)]" style={{ animationDelay: '280ms' } as CSSProperties}>{['Sin tarjeta', 'Listo en minutos', 'Control de tus datos'].map((item) => <span className="inline-flex items-center gap-1.5" key={item}><Check className="size-3.5 text-[var(--accent-ink)]" />{item}</span>)}</div>
          </div>
          <div className="reveal" style={{ animationDelay: '120ms' } as CSSProperties}><ProductPreview /></div>
        </section>

        <Reveal>
          <section className="mx-auto grid max-w-6xl gap-5 px-5 py-20 sm:grid-cols-3 sm:px-8" id="producto">
            {FEATURES.map((feature, index) => (
              <div
                className="hover-lift panel grid gap-3 p-6"
                key={feature.title}
                style={{ transitionDelay: `${index * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-low)] text-[var(--accent-ink)]">
                    <feature.icon aria-hidden className="size-5" />
                  </span>
                  <span className="data-label text-[var(--text-disabled)]">
                    0{index + 1}
                  </span>
                </div>
                <h2 className="text-lg font-bold tracking-[-0.02em]">{feature.title}</h2>
                <p className="text-sm leading-6 text-[var(--text-muted)]">{feature.description}</p>
              </div>
            ))}
          </section>
        </Reveal>

        <Reveal>
          <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
            <div className="grid overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-lowest)] lg:grid-cols-[1.15fr_0.85fr]">
              <div className="p-8 sm:p-12">
                <p className="data-label text-[var(--accent-ink)]">Diseñado alrededor de tu sesión</p>
                <h2 className="mt-5 text-3xl font-bold tracking-[-0.03em] sm:text-5xl">Menos administración. Más intención.</h2>
                <p className="mt-5 max-w-xl leading-7 text-[var(--text-muted)]">Antes, durante y después de entrenar, cada pantalla prioriza la siguiente decisión útil. Tus datos se convierten en contexto, no en ruido.</p>
              </div>
              <div className="grid gap-px bg-[var(--border-subtle)] sm:grid-cols-2 lg:grid-cols-1">
                {[{ icon: BarChart3, title: 'Progreso legible', text: 'Métricas que explican sin abrumar.' }, { icon: ShieldCheck, title: 'Privacidad por diseño', text: 'Permisos validados y control sobre lo que compartes.' }].map(({ icon: Icon, title, text }) => <div className="bg-[var(--surface-low)] p-7" key={title}><Icon className="size-5 text-[var(--accent-ink)]" /><h3 className="mt-5 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{text}</p></div>)}
              </div>
            </div>
          </section>
        </Reveal>

        <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8" id="planes">
          <Reveal><div className="text-center"><p className="data-label text-[var(--accent-ink)]">Planes simples</p><h2 className="mt-4 text-3xl font-bold tracking-[-0.03em] sm:text-5xl">Empieza hoy. Crece sin cambiar de sistema.</h2><p className="mx-auto mt-5 max-w-xl text-[var(--text-muted)]">Opciones claras para personas y una propuesta adaptable para gimnasios.</p></div></Reveal>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">{PLANS.map((plan) => <Reveal key={plan.name}><article className={`relative h-full rounded-[var(--radius-xl)] border p-7 ${plan.featured ? 'border-[var(--volt)] bg-[color-mix(in_srgb,var(--volt)_7%,var(--surface-lowest))]' : 'border-[var(--border-subtle)] bg-[var(--surface-lowest)]'}`}>{plan.featured ? <span className="absolute right-5 top-5 rounded-full bg-[var(--volt)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-contrast)]">Recomendado</span> : null}<p className="data-label text-[var(--text-muted)]">{plan.name}</p><p className="mt-6 text-3xl font-bold tracking-[-0.03em]">{plan.price}</p><p className="mt-4 min-h-12 text-sm leading-6 text-[var(--text-muted)]">{plan.copy}</p><ButtonLink className="mt-7 w-full" href={plan.name === 'Gimnasio' ? '/gimnasios' : '/register'} variant={plan.featured ? 'primary' : 'secondary'}>{plan.name === 'Gimnasio' ? 'Conocer opciones' : 'Elegir plan'}</ButtonLink></article></Reveal>)}</div>
        </section>

        {preview.length > 0 ? (
          <Reveal>
            <section className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="data-label mb-2 text-[var(--accent-ink)]">Directorio</p>
                  <h2 className="text-2xl font-bold tracking-[-0.02em]">Sedes cerca de ti</h2>
                </div>
                <Link
                  className="group inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent-ink)]"
                  href="/gimnasios"
                >
                  Ver todas
                  <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
              <div className="stagger grid gap-4 sm:grid-cols-3">
                {preview.map((branch, index) => (
                  <div key={branch.id} style={{ '--i': index } as CSSProperties}>
                    <BranchCard branch={branch} />
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        ) : null}

        <section className="mx-auto max-w-3xl px-5 pb-24 sm:px-8" id="preguntas">
          <Reveal><div className="text-center"><p className="data-label text-[var(--accent-ink)]">Preguntas frecuentes</p><h2 className="mt-4 text-3xl font-bold tracking-[-0.03em]">Todo claro antes de empezar.</h2></div></Reveal>
          <div className="mt-10 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">{FAQS.map(([question, answer]) => <details className="group py-5" key={question}><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">{question}<span className="text-xl text-[var(--accent-ink)] transition-transform group-open:rotate-45">+</span></summary><p className="max-w-2xl pt-4 text-sm leading-7 text-[var(--text-muted)]">{answer}</p></details>)}</div>
        </section>

        <Reveal><section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8"><div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-lowest)] px-7 py-12 text-center shadow-[var(--shadow-md)]"><div aria-hidden className="absolute inset-x-1/4 -top-20 h-40 rounded-full bg-[color-mix(in_srgb,var(--volt)_16%,transparent)] blur-3xl" /><div className="relative"><p className="data-label text-[var(--accent-ink)]">Tu próxima serie cuenta</p><h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-[-0.03em] sm:text-5xl">Haz visible el progreso que ya estás construyendo.</h2><p className="mx-auto mt-5 max-w-xl text-[var(--text-muted)]">Crea tu cuenta gratis y lleva tu entrenamiento, tu historia y tu gimnasio contigo.</p><ButtonLink className="mt-8" href="/register" size="lg" variant="primary">Crear mi cuenta <ArrowRight className="size-4" /></ButtonLink></div></div></section></Reveal>
      </main>
      <PublicFooter />
    </div>
  );
}
