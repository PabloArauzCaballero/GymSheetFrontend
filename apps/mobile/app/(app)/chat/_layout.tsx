import { Stack } from 'expo-router';
import { detailStackOptions } from '@/lib/screen-options';

export default function ChatLayout() {
  return <Stack screenOptions={detailStackOptions} />;
}
