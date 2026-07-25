'use client';

import type { UserRole } from '@/shared/api/contracts';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { AccessPointPanel } from './access-point-panel';
import { BranchPanel } from './branch-panel';
import { EquipmentAssignmentPanel } from './equipment-assignment-panel';
import { MaintenancePanel } from './maintenance-panel';
import { RoomPanel } from './room-panel';

export function FacilitiesAdmin({ role }: Readonly<{ role: UserRole }>) {
  const canManage = role === 'ADMIN';
  return (
    <div className="grid gap-8">
      <PageHeader
        description="Sedes, salas, puntos de acceso, asignación de activos y mantenimiento con transiciones explícitas."
        eyebrow="Operaciones físicas"
        title="Instalaciones"
      />
      <Tabs defaultValue="branches">
        <TabsList>
          <TabsTrigger value="branches">Sedes</TabsTrigger>
          <TabsTrigger value="rooms">Salas</TabsTrigger>
          <TabsTrigger value="access">Puntos de acceso</TabsTrigger>
          <TabsTrigger value="maintenance">Mantenimiento</TabsTrigger>
          {canManage ? <TabsTrigger value="assignment">Asignaciones</TabsTrigger> : null}
        </TabsList>
        <TabsContent value="branches">
          <BranchPanel canManage={canManage} />
        </TabsContent>
        <TabsContent value="rooms">
          <RoomPanel canManage={canManage} />
        </TabsContent>
        <TabsContent value="access">
          <AccessPointPanel canManage={canManage} />
        </TabsContent>
        <TabsContent value="maintenance">
          <MaintenancePanel />
        </TabsContent>
        {canManage ? (
          <TabsContent value="assignment">
            <EquipmentAssignmentPanel />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
