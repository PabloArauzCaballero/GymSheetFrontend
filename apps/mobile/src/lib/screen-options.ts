import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { colors } from '@/theme';

/**
 * Shared push/pop behaviour for every detail stack (routines, workouts,
 * exercises). It lived copy-pasted in three `_layout.tsx` files, which is how
 * navigation feel drifts between sections without anyone deciding to.
 *
 * `ios_from_right` rather than `slide_from_right`: the plain slide moves the
 * incoming screen and leaves the outgoing one parked underneath, which reads as
 * two flat layers. The iOS curve also drags the outgoing screen out at ~30% of
 * the distance and draws a shadow along the incoming edge, so the two screens
 * are visibly at different depths — that parallax is what people recognise as
 * "an iPhone transition", not the direction of travel.
 *
 * 350ms sits in the Premium band (350-600ms) from the motion personality this
 * app already follows elsewhere; 280 felt clipped against the parallax, which
 * needs travel time to be legible.
 */
export const detailStackOptions: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background },
  animation: 'ios_from_right',
  animationDuration: 350,
  // The edge swipe must agree with the animation, or the gesture feels bolted
  // on: dragging back plays the same curve in reverse, under the finger.
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};
