import { Children, type ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '@/components/ambient';
import { EnterUp, PressableScale } from '@/components/motion';
import {
  colors,
  fontSizes,
  maxContentWidth,
  maxWideContentWidth,
  radii,
  spacing,
  tabletBreakpoint,
  tones,
} from '@/theme';

/**
 * One place decides what "wide" means, so a tablet layout cannot drift between
 * screens. Reads live dimensions rather than a device flag: a tablet in
 * portrait is narrow, and split-screen makes any device narrow.
 */
export function useResponsive(): { wide: boolean; width: number } {
  const { width } = useWindowDimensions();
  return { wide: width >= tabletBreakpoint, width };
}

/**
 * Side-by-side on a wide screen, stacked on a phone. The point is not symmetry
 * for its own sake: on a tablet a single column leaves most of the screen black
 * and the page reads as unfinished.
 */
export function Columns({ children }: { children: ReactNode }) {
  const { wide } = useResponsive();
  const items = Children.toArray(children).filter(Boolean);
  if (!wide || items.length < 2) return <>{children}</>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg }}>
      {items.map((child, index) => (
        // eslint-disable-next-line react/no-array-index-key -- positional slots
        <View key={index} style={{ flex: 1 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/**
 * Screen chrome shared by every tab. Scrolls by default (a phone list always
 * outgrows the viewport), honours the notch through the top inset and leaves
 * room above the tab bar so the last card is never trapped under it.
 *
 * Horizontal insets follow the safe area too: in landscape on a notched device
 * the cutout eats into the side, and a fixed gutter would run content under it.
 * Past {@link maxContentWidth} the extra width becomes gutter instead of longer
 * lines, so text stays readable on a tablet.
 */
export function ScrollScreen({
  children,
  center = false,
  onRefresh,
  overlay,
  refreshing = false,
}: {
  children: ReactNode;
  /**
   * Centres content vertically when it is shorter than the viewport. For pages
   * that are a single short form — on a tablet those otherwise sit in the top
   * third with two thirds of empty screen under them.
   */
  center?: boolean;
  onRefresh?: () => void;
  /**
   * Pinned just above the tab bar, on top of the scrolling content. For state
   * that must stay reachable however far down the list the user has scrolled —
   * a running rest timer is useless if finding it costs a dozen swipes.
   */
  overlay?: ReactNode;
  refreshing?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { wide, width } = useResponsive();
  // A two-column page needs room for two columns; keeping the phone cap on a
  // tablet is what leaves a narrow strip of content framed by black.
  const gutter = Math.max(spacing.lg, (width - (wide ? maxWideContentWidth : maxContentWidth)) / 2);
  // On Android the safe-area inset can come back shorter than the drawn status
  // bar, which left scrolled content half-visible under the clock.
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AmbientBackground />
      <ScrollView
        contentContainerStyle={{
          paddingTop: topInset + spacing.lg,
          paddingBottom: insets.bottom + spacing['2xl'],
          paddingLeft: gutter + insets.left,
          paddingRight: gutter + insets.right,
          gap: spacing.lg,
          // flexGrow lets a short page fill the viewport so it can centre; a
          // tall one still scrolls normally because the content wins over it.
          ...(center ? { flexGrow: 1, justifyContent: 'center' as const } : null),
        }}
        refreshControl={
          onRefresh
            ? // Volt spinner on black: the default is invisible on this theme.
              <RefreshControl
                colors={[colors.volt]}
                onRefresh={onRefresh}
                progressBackgroundColor={colors.surface}
                refreshing={refreshing}
                tintColor={colors.volt}
              />
            : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {overlay ? (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + spacing.md,
            left: gutter + insets.left,
            right: gutter + insets.right,
          }}
        >
          {overlay}
        </View>
      ) : null}

      {/* Opaque band over the status bar: without it, scrolled content slides
          under the clock and battery and the two become unreadable. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: topInset,
          backgroundColor: colors.background,
        }}
      />
    </View>
  );
}

/** Page title plus an optional line of context underneath. */
export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text
        accessibilityRole="header"
        // Caps the title at two lines: at the largest system text size a long
        // name would otherwise push the whole screen down.
        numberOfLines={2}
        style={{
          color: colors.text,
          // The one place the display size is used. A title only reads as a
          // title when the step down to body text is unmistakable; at 32 against
          // a 16 body it was merely "bigger", and the page leaned on colour for
          // hierarchy instead of on type.
          fontSize: fontSizes.display,
          fontWeight: '600',
          // Optical tracking: large type set at default spacing looks loose and
          // amateur. Negative tracking is most of what separates a display face
          // from body text scaled up.
          letterSpacing: fontSizes.display * -0.03,
          lineHeight: fontSizes.display * 1.05,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Groups related rows under a label, the way a settings list reads.
 *
 * `index` drives the entrance cascade: sections arrive in reading order so the
 * eye is led down the screen once, instead of everything landing at once.
 */
export function Section({
  title,
  children,
  index = 0,
}: {
  title: string;
  children: ReactNode;
  index?: number;
}) {
  return (
    <EnterUp index={index} style={{ gap: spacing.sm }}>
      <Text
        accessibilityRole="header"
        style={{
          color: colors.textMuted,
          fontSize: fontSizes.xs,
          fontWeight: '700',
          letterSpacing: fontSizes.xs * 0.1,
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Text>
      {children}
    </EnterUp>
  );
}

/**
 * Elevated surface. Pass `onPress` and it becomes tactile: the whole card
 * springs under the finger instead of only a child row reacting, which is what
 * made taps feel unanswered.
 */
export function Card({
  children,
  accent,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  accent?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Escape hatch for a card that carries a whole screen, not a summary. */
  style?: StyleProp<ViewStyle>;
}) {
  const surface = {
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderLeftWidth: accent ? 3 : 1,
    borderLeftColor: accent ?? colors.borderSubtle,
    // A lit top edge: on a black canvas a flat fill reads as a hole, while a
    // hairline highlight reads as a surface catching light from above.
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceLow,
    padding: spacing.md,
    // Shadows do nothing on black; separation comes from luminance instead.
    // Elevation keeps Android's own compositing consistent with that.
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  } as const;

  if (onPress) {
    return (
      <PressableScale
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={[surface, style]}
      >
        {children}
      </PressableScale>
    );
  }

  return <View style={[surface, style]}>{children}</View>;
}

/** Label on the left, value on the right — the workhorse of profile/settings. */
export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        minHeight: 28,
      }}
    >
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{label}</Text>
      <Text
        style={{
          color: colors.text,
          fontSize: fontSizes.sm,
          fontWeight: '600',
          flexShrink: 1,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * One number that matters, with its caption. Used in a row of three.
 *
 * The figure is the largest type in the app on purpose — in a training app the
 * number is the content. Tabular figures keep the three tiles optically aligned
 * whatever the digits are.
 */
export function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        gap: spacing.xs,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        borderTopColor: colors.border,
        backgroundColor: colors.surface,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
      }}
    >
      <Text
        adjustsFontSizeToFit
        // Without a floor, shrink-to-fit keeps going: a long value like a full
        // date would end up smaller than its own caption, which reads as a bug
        // rather than as a long value. Below this it truncates instead.
        minimumFontScale={0.55}
        numberOfLines={1}
        style={{
          // Near-white, not volt. Three tiles in a row all shouting in the
          // brand colour is what made these screens feel loud: the accent stops
          // meaning "look here" when everything wears it. Size and weight carry
          // the emphasis instead, and volt is left for the primary action.
          color: colors.text,
          fontSize: fontSizes['2xl'],
          fontWeight: '600',
          fontVariant: ['tabular-nums'],
          letterSpacing: fontSizes['2xl'] * -0.045,
        }}
      >
        {value}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{label}</Text>
    </View>
  );
}

export type BadgeTone = keyof typeof tones.dark;

export function Badge({ label, tone = 'info' }: { label: string; tone?: BadgeTone }) {
  const palette = tones.dark[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.bg,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
      }}
    >
      <Text style={{ color: palette.text, fontSize: fontSizes.xs, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

/** Thin divider for stacked rows inside one card. */
export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}
