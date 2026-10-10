'use client';

import { Fragment } from 'react';
import { blockRestLabel, blockTitle, buildDayBlocks, transitionLabel } from '@gymsheet/hooks';
import type { ExerciseLine } from '../view-model';
import { ExerciseRow } from './exercise-row';

/**
 * Los ejercicios del día agrupados en sueltos, superseries y circuitos (C3):
 * cada bloque lleva su título («Superserie A · 3 vueltas»), A1/A2 en sus
 * ejercicios, la transición entre ellos y el descanso tras la vuelta.
 */
export function DayBlocksList({
  lines,
  isOwner,
  showCommunity,
}: Readonly<{ lines: readonly ExerciseLine[]; isOwner: boolean; showCommunity: boolean }>) {
  const blocks = buildDayBlocks(lines.map((line) => ({ ...line, series: line.series })));
  return (
    <ol className="list-none divide-y divide-[var(--border-subtle)]" data-testid="day-blocks">
      {blocks.map((block, blockIndex) => {
        if (block.kind === 'single') {
          const item = block.items[0];
          if (!item) return null;
          const numero = blocks.slice(0, blockIndex).reduce((n, b) => n + b.items.length, 0) + 1;
          return (
            <ExerciseRow
              isOwner={isOwner}
              key={item.routineExerciseId}
              line={item}
              marca={String(numero)}
              showCommunity={showCommunity}
            />
          );
        }
        const rest = blockRestLabel(block);
        return (
          <li
            aria-label={blockTitle(block) ?? undefined}
            className="bg-[var(--surface-low)]"
            data-testid="day-block"
            key={block.label}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 pb-1 pt-3">
              <p className="data-label text-[var(--accent-ink)]">{blockTitle(block)}</p>
              {rest ? <p className="text-xs text-[var(--text-muted)]">{rest}</p> : null}
            </div>
            <ol className="list-none">
              {block.items.map((item, index) => (
                <Fragment key={item.routineExerciseId}>
                  <ExerciseRow
                    isOwner={isOwner}
                    line={item}
                    marca={item.posicion ?? ''}
                    showCommunity={showCommunity}
                  />
                  {index < block.items.length - 1 ? (
                    <li aria-hidden className="px-4 pl-[3.75rem] text-xs text-[var(--text-muted)]">
                      Transición · {transitionLabel(block.descansoEntreSeg)}
                    </li>
                  ) : null}
                </Fragment>
              ))}
            </ol>
          </li>
        );
      })}
    </ol>
  );
}
