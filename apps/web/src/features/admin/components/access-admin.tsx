'use client';

import type { UserRole } from '@/shared/api/contracts';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { AccessDevicePanel } from './access-device-panel';
import { AccessHistoryPanel } from './access-history-panel';
import { CredentialPanel } from './credential-panel';

export function AccessAdmin({ role }: Readonly<{ role: UserRole }>) {
  return (
    <div className="grid gap-8">
      <PageHeader
        description="Dispositivos, referencias de credenciales y decisiones del motor de políticas. El simulador mock no se publica en producción."
        eyebrow="Seguridad física"
        title="Control de acceso"
      />
      <Tabs defaultValue="devices">
        <TabsList>
          <TabsTrigger value="devices">Dispositivos</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="credentials">Credenciales</TabsTrigger>
        </TabsList>
        <TabsContent value="devices">
          <AccessDevicePanel canManage={role === 'ADMIN'} />
        </TabsContent>
        <TabsContent value="history">
          <AccessHistoryPanel />
        </TabsContent>
        <TabsContent value="credentials">
          <CredentialPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
