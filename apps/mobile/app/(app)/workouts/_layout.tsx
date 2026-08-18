import { Stack } from 'expo-router';
import { detailStackOptions } from '@/lib/screen-options';

export default function WorkoutsLayout() {
  return <Stack screenOptions={detailStackOptions} />;
}
