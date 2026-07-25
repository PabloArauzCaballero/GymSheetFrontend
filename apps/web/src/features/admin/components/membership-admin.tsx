'use client';

import type { UserRole } from '@/shared/api/contracts';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { CustomerPanel } from './customer-panel';
import { MembershipPanel } from './membership-panel';
import { PlanPanel } from './plan-panel';
import { StaffPanel } from './staff-panel';

export function MembershipAdmin({ role }: Readonly<{ role: UserRole }>) {
  const admin = role === 'ADMIN';
  return (
    <div className="grid gap-8">
      <PageHeader
        description="Operaciones transaccionales de clientes, planes, membresías y personal."
        eyebrow="Gestión comercial"
        title="Membresías y clientes"
      />
      <Tabs defaultValue={admin ? 'plans' : 'customers'}>
        <TabsList>
          {admin ? <TabsTrigger value="plans">Planes</TabsTrigger> : null}
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="memberships">Membresías</TabsTrigger>
          {admin ? <TabsTrigger value="staff">Personal</TabsTrigger> : null}
        </TabsList>
        {admin ? (
          <TabsContent value="plans">
            <PlanPanel />
          </TabsContent>
        ) : null}
        <TabsContent value="customers">
          <CustomerPanel />
        </TabsContent>
        <TabsContent value="memberships">
          <MembershipPanel />
        </TabsContent>
        {admin ? (
          <TabsContent value="staff">
            <StaffPanel />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
