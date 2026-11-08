import { PageHeader } from '@/shared/components/layout/page-header';
import { MembershipExperience } from './membership-experience';

/** «Membresía» del móvil (`membership.tsx`): cabecera y sus secciones. */
export function MembershipPageClient() {
  return (
    <div className="mx-auto grid w-full max-w-[560px] gap-8 lg:max-w-[760px]">
      <PageHeader
        description="Tu plan, tus accesos y las opciones para renovar."
        title="Membresía"
        tutorialId="page:membership"
      />
      <MembershipExperience />
    </div>
  );
}
