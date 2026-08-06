import { PageHeader } from '@/shared/components/layout/page-header';
import { MembershipExperience } from './membership-experience';

export function MembershipPageClient() {
  return (
    <div className="grid gap-8">
      <PageHeader
        description="Consulta tu plan, accesos reales, historial y opciones disponibles."
        eyebrow="Mi cuenta"
        title="Membresía"
        tutorialId="page:membership"
      />
      <MembershipExperience />
    </div>
  );
}
