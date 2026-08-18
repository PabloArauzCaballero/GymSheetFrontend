import { Stack } from 'expo-router';
import { detailStackOptions } from '@/lib/screen-options';

/** Catalogue → detail. Headers are drawn by each screen, not by the navigator. */
export default function ExercisesLayout() {
  return <Stack screenOptions={detailStackOptions} />;
}
