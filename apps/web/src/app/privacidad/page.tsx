import type { Metadata } from 'next';
import { LegalDocument } from '@/shared/components/layout/legal-document';

export const metadata: Metadata = { title: 'Política de privacidad' };

function Section({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="grid gap-2">
      <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
      <div className="grid gap-2 text-sm leading-6 text-[var(--text-muted)]">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <LegalDocument title="Política de privacidad" updatedAt="25 de agosto de 2026">
      <Section title="1. Qué datos guardamos">
        <p>
          Datos de cuenta (nombre, correo, gimnasio), entrenamientos y series registradas, medidas
          antropométricas, y —solo si las activas— género (para personalizar la progresión),
          ubicación al verificar una racha, fotos de perfil y datos de las funciones sociales
          (conexiones, estado social, mensajes).
        </p>
      </Section>
      <Section title="2. Para qué los usamos">
        <p>
          Para mostrarte tu progreso, calcular rachas e insignias, generar la clasificación de tu
          gimnasio y, en las funciones sociales, mostrarte a otros socios según lo que decidas
          compartir. No vendemos tus datos a terceros.
        </p>
      </Section>
      <Section title="3. Quién los ve">
        <p>
          La clasificación del gimnasio solo muestra tu nombre e inicial, nunca tu nombre completo.
          El personal del gimnasio ve los datos necesarios para tu membresía; no ve tus
          conversaciones ni tu ubicación exacta.
        </p>
      </Section>
      <Section title="4. Tus derechos">
        <p>
          Puedes pedir la eliminación de tu cuenta y de tus datos en cualquier momento contactando al
          gimnasio donde tienes tu membresía.
        </p>
      </Section>
      <Section title="5. Cambios en esta política">
        <p>
          Si cambia de forma relevante, se te pedirá aceptar la nueva versión la próxima vez que
          inicies sesión.
        </p>
      </Section>
    </LegalDocument>
  );
}
