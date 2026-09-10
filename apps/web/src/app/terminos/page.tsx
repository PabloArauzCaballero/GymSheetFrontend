import type { Metadata } from 'next';
import { LegalDocument } from '@/shared/components/layout/legal-document';

export const metadata: Metadata = { title: 'Términos y condiciones' };

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
      <div className="grid gap-2 text-sm leading-6 text-[var(--text-muted)]">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <LegalDocument title="Términos y condiciones" updatedAt="25 de agosto de 2026">
      <Section title="1. Qué es GymSheet">
        <p>
          GymSheet es una aplicación de registro de entrenamiento, progresión y funciones sociales
          entre socios de un mismo gimnasio. Al crear una cuenta aceptas estos términos y la{' '}
          <a
            className="font-medium text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4"
            href="/privacidad"
          >
            política de privacidad
          </a>
          .
        </p>
      </Section>
      <Section title="2. Tu cuenta">
        <p>
          Eres responsable de la confidencialidad de tu contraseña y de la información que registras
          (entrenamientos, medidas corporales y, si las activas, funciones de racha con
          geolocalización, fotos de perfil y funciones sociales). Puedes cerrar tu cuenta en
          cualquier momento desde el perfil.
        </p>
      </Section>
      <Section title="3. Uso aceptable">
        <p>
          No está permitido usar la aplicación para acosar a otros socios, suplantar identidades ni
          extraer datos de otras cuentas. El gimnasio puede suspender cuentas que incumplan estas
          reglas.
        </p>
      </Section>
      <Section title="4. Cambios en estos términos">
        <p>
          Si el texto cambia de forma relevante, se te pedirá aceptar la nueva versión la próxima vez
          que inicies sesión. La fecha de arriba indica la última revisión.
        </p>
      </Section>
      <Section title="5. Contacto">
        <p>Para dudas sobre estos términos, contacta al gimnasio donde tienes tu membresía.</p>
      </Section>
    </LegalDocument>
  );
}
