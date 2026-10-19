import { Share } from 'react-native';
import { getActiveTenant } from '@/theme';

/**
 * Compartir un logro con la firma de la marca («hecho en REPP»): cada
 * mensaje que sale de la app la nombra una vez, al final, sin emojis en
 * cadena. Texto por ahora; la tarjeta como imagen llega con
 * `react-native-view-shot` en un build nativo aparte.
 */
export function shareWithBrand(lines: readonly (string | null | undefined | false)[], link?: string): void {
  const body = lines.filter((line): line is string => Boolean(line)).join('\n');
  const signature = `— ${getActiveTenant().name}`;
  void Share.share({ message: [body, link, signature].filter(Boolean).join('\n\n') });
}
