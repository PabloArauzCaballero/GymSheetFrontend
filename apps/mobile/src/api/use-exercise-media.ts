import { useQueries } from '@tanstack/react-query';
import type { Exercise } from '@gymsheet/types';
import { exerciseService } from '@/api/services';

/**
 * Fills in artwork for exercises embedded in another payload.
 *
 * Routines and workout sessions return their exercises nested, and the backend
 * omits `media` there — which is why those rows showed a placeholder while the
 * catalogue showed illustrations. Fetching each exercise on its own is the only
 * way to get it, so it is done in parallel and cached under the same key the
 * detail screen uses (`['exercise', id]`): opening one afterwards is instant,
 * and revisiting the routine costs no requests at all.
 */
export function useExerciseMedia(exercises: ReadonlyArray<Exercise | null>) {
  // Only ask for the ones actually missing artwork; a routine whose payload
  // already carries media should not trigger a single request.
  const missing = [
    ...new Set(
      exercises
        .filter((item): item is Exercise => item !== null && item.media.length === 0)
        .map((item) => item.id),
    ),
  ];

  const results = useQueries({
    queries: missing.map((id) => ({
      queryKey: ['exercise', id],
      queryFn: () => exerciseService.get(id),
      // Artwork does not change during a session; keep it for the whole run.
      staleTime: 30 * 60 * 1000,
    })),
  });

  const byId = new Map<string, Exercise>();
  results.forEach((result) => {
    if (result.data) byId.set(result.data.id, result.data);
  });

  /** Returns the richest version available, preferring one that has media. */
  return function withMedia(exercise: Exercise | null): Exercise | null {
    if (!exercise) return null;
    if (exercise.media.length > 0) return exercise;
    return byId.get(exercise.id) ?? exercise;
  };
}
