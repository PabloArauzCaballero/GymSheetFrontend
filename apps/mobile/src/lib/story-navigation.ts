import { firstAvailableStoryId } from './story-feed-reconciliation';

type StoryLike = { id: string; viewedByMe?: boolean };
type FeedEntryLike = { userId: string; stories: readonly StoryLike[] };
export type StoryCursorLike = { userId: string; storyId: string };

/** Adónde ir y si eso cambia de persona (para el háptico y la transición). */
export type StoryStep = { userId: string; storyId: string; changedPerson: boolean };

function position(feed: readonly FeedEntryLike[], cursor: StoryCursorLike) {
  const personIndex = feed.findIndex((entry) => entry.userId === cursor.userId);
  const entry = personIndex === -1 ? undefined : feed[personIndex];
  const storyIndex = entry ? entry.stories.findIndex((story) => story.id === cursor.storyId) : -1;
  return { personIndex, entry, storyIndex };
}

/**
 * La persona siguiente (o anterior) que tenga algo que enseñar, entrando por
 * su primera story sin ver. Se busca en bucle: una entrada vacía no es el final.
 */
export function adjacentPersonStep(
  feed: readonly FeedEntryLike[],
  userId: string,
  direction: 1 | -1,
): StoryStep | null {
  const start = feed.findIndex((entry) => entry.userId === userId);
  if (start === -1) return null;
  for (let index = start + direction; index >= 0 && index < feed.length; index += direction) {
    const candidate = feed[index];
    const storyId = firstAvailableStoryId(candidate);
    if (candidate && storyId) return { userId: candidate.userId, storyId, changedPerson: true };
  }
  return null;
}

/** La siguiente story: la próxima de esta persona o la primera sin ver de la siguiente. `null` = fin. */
export function nextStoryStep(feed: readonly FeedEntryLike[], cursor: StoryCursorLike): StoryStep | null {
  const { entry, storyIndex } = position(feed, cursor);
  if (!entry || storyIndex === -1) return null;
  const nextOwn = entry.stories[storyIndex + 1];
  if (nextOwn) return { userId: entry.userId, storyId: nextOwn.id, changedPerson: false };
  return adjacentPersonStep(feed, entry.userId, 1);
}

/**
 * La story anterior. Hacia atrás se entra en la persona previa por su ÚLTIMA
 * story (la que se acababa de ver). `null` = es la primera del todo.
 */
export function previousStoryStep(feed: readonly FeedEntryLike[], cursor: StoryCursorLike): StoryStep | null {
  const { personIndex, entry, storyIndex } = position(feed, cursor);
  if (!entry || storyIndex === -1) return null;
  const previousOwn = storyIndex > 0 ? entry.stories[storyIndex - 1] : undefined;
  if (previousOwn) return { userId: entry.userId, storyId: previousOwn.id, changedPerson: false };
  for (let index = personIndex - 1; index >= 0; index -= 1) {
    const candidate = feed[index];
    const last = candidate?.stories[candidate.stories.length - 1];
    if (candidate && last) return { userId: candidate.userId, storyId: last.id, changedPerson: true };
  }
  return null;
}

/** Las stories que conviene precargar: la siguiente y, si existe, la de la siguiente persona. */
export function storiesToPreload<T extends StoryLike>(
  feed: readonly { userId: string; stories: readonly T[] }[],
  cursor: StoryCursorLike,
): T[] {
  const steps = [nextStoryStep(feed, cursor), adjacentPersonStep(feed, cursor.userId, 1)];
  const seen = new Set<string>();
  const result: T[] = [];
  for (const step of steps) {
    if (!step || seen.has(step.storyId)) continue;
    seen.add(step.storyId);
    const story = feed.find((entry) => entry.userId === step.userId)?.stories.find((item) => item.id === step.storyId);
    if (story) result.push(story);
  }
  return result;
}
