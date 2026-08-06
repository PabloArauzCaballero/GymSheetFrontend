'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import type { TutorialProgressRecord, TutorialProgressUpsert } from '@/shared/api/contracts';
import {
  loadProgress,
  resetProgress,
  saveProgress,
  type LoadResult,
} from '../storage/tutorial-progress-gateway';

const EMPTY: LoadResult = { records: [], source: 'local' };

function mergeRecord(previous: LoadResult | undefined, record: TutorialProgressRecord): LoadResult {
  const base = previous ?? EMPTY;
  const records = base.records.filter((item) => item.tutorialId !== record.tutorialId);
  records.push(record);
  return { records, source: base.source };
}

/**
 * React-Query binding over the progress gateway. Reads once per session and
 * applies optimistic cache updates on save/reset so the UI reflects progress
 * immediately even when persistence degrades to local storage.
 */
export function useProgressStore(userId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.tutorialProgress,
    queryFn: () => loadProgress(userId),
    enabled: userId.length > 0,
    staleTime: 60_000,
  });

  const save = useCallback(
    async (tutorialId: string, input: TutorialProgressUpsert): Promise<TutorialProgressRecord> => {
      const { record } = await saveProgress(userId, tutorialId, input);
      queryClient.setQueryData<LoadResult>(queryKeys.tutorialProgress, (previous) =>
        mergeRecord(previous, record),
      );
      return record;
    },
    [queryClient, userId],
  );

  const reset = useCallback(
    async (tutorialId: string): Promise<void> => {
      const { records } = await resetProgress(userId, tutorialId);
      queryClient.setQueryData<LoadResult>(queryKeys.tutorialProgress, (previous) => ({
        records,
        source: previous?.source ?? 'local',
      }));
    },
    [queryClient, userId],
  );

  return {
    records: query.data?.records ?? [],
    source: query.data?.source ?? 'local',
    isLoading: query.isLoading,
    isError: query.isError,
    save,
    reset,
  };
}
