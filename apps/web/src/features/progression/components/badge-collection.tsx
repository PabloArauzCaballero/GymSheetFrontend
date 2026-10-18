'use client';

import { groupBadgeChains, sortChainGroups } from '@gymsheet/domain';
import { useMemo, useState } from 'react';
import type { ProgressionBadge } from '@/shared/api/schemas';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { BadgeChainTile, ChainDialog, type BadgeChain } from './badge-chains';
import { RarityLegend } from './rarity-legend';

/**
 * La colección: las insignias agrupadas en cadenas («Nivel 2 de 4»), las que
 * tienen algo conseguido primero. Abrir una cadena enseña sus pasos.
 */
export function BadgeCollection({
  badges,
  onCelebrate,
}: Readonly<{
  badges: readonly ProgressionBadge[];
  onCelebrate: (badge: ProgressionBadge) => void;
}>) {
  const chains = useMemo(() => sortChainGroups(groupBadgeChains(badges)), [badges]);
  const [open, setOpen] = useState<BadgeChain | null>(null);
  const earned = badges.filter((badge) => badge.earned).length;

  return (
    <Card data-tutorial-id="progression:badges">
      <CardHeader
        description="Las insignias del mismo reto van en cadena: cada ficha dice en qué nivel vas y cuál es la siguiente."
        title={`Tu colección · ${earned}/${badges.length}`}
      />
      <div className="px-5 pt-5">
        <RarityLegend />
      </div>
      <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {chains.map((chain) => (
          <BadgeChainTile
            chain={chain}
            key={chain.key}
            onCelebrate={onCelebrate}
            onOpenChain={setOpen}
          />
        ))}
      </CardContent>
      <ChainDialog chain={open} onCelebrate={onCelebrate} onClose={() => setOpen(null)} />
    </Card>
  );
}
