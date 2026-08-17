import { Stack } from 'expo-router';
import { detailStackOptions } from '@/lib/screen-options';

export default function RoutinesLayout() {
  return <Stack screenOptions={detailStackOptions} />;
}
