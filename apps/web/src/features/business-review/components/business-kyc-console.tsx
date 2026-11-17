'use client';

import { kycReviewCopy } from '@gymsheet/domain';
import { useState } from 'react';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { BusinessAccountsPanel } from './business-accounts-panel';
import { KycQueuePanel } from './kyc-queue-panel';

/**
 * `/moderacion/negocios`: REPP's business KYC console (backend ADR-0021):
 * the review and post-review queues with the case beside them, and the
 * business accounts with suspend / reinstate. The backend authorizes every
 * call (MODERATOR, SYSTEM_ADMIN) and audits every read of identity data.
 */
export function BusinessKycConsole({ viewerId }: Readonly<{ viewerId: string }>) {
  const [tab, setTab] = useState('queue');
  return (
    <div className="flex flex-col gap-6">
      <PageHeader description={kycReviewCopy.description} title={kycReviewCopy.title} />
      <Tabs onValueChange={setTab} value={tab}>
        <TabsList aria-label="Secciones de negocios">
          <TabsTrigger value="queue">Solicitudes</TabsTrigger>
          <TabsTrigger value="accounts">Cuentas</TabsTrigger>
        </TabsList>
        <TabsContent className="pt-5" value="queue">
          <KycQueuePanel viewerId={viewerId} />
        </TabsContent>
        <TabsContent className="pt-5" value="accounts">
          <BusinessAccountsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
