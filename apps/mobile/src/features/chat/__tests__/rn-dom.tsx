/**
 * React Native como DOM para las pruebas de pantalla del chat: cada primitiva
 * se pinta con el elemento HTML más cercano y conserva lo que las pruebas usan
 * (etiqueta accesible, `testID`, toque y pulsación larga).
 */
import { createElement, type ReactNode } from 'react';

type Common = {
  children?: ReactNode;
  accessibilityLabel?: string;
  testID?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
};

export function Box({ children, accessibilityLabel, testID }: Common) {
  return createElement('div', { 'aria-label': accessibilityLabel, 'data-testid': testID }, children);
}

export function Press({ children, accessibilityLabel, testID, onPress, onLongPress, disabled }: Common) {
  return createElement(
    'button',
    {
      'aria-label': accessibilityLabel,
      'data-testid': testID,
      disabled,
      onClick: disabled ? undefined : onPress,
      onContextMenu: (event: { preventDefault: () => void }) => {
        event.preventDefault();
        onLongPress?.();
      },
      type: 'button',
    },
    children,
  );
}

export function Txt({ children, accessibilityLabel }: Common) {
  return createElement('span', { 'aria-label': accessibilityLabel }, children);
}

export function TextField({
  value,
  onChangeText,
  accessibilityLabel,
  placeholder,
}: {
  value?: string;
  onChangeText?: (text: string) => void;
  accessibilityLabel?: string;
  placeholder?: string;
}) {
  return createElement('input', {
    'aria-label': accessibilityLabel,
    placeholder,
    value: value ?? '',
    onChange: (event: { target: { value: string } }) => onChangeText?.(event.target.value),
  });
}

export function List<T>({
  data,
  renderItem,
  keyExtractor,
  ListEmptyComponent,
}: {
  data: T[];
  renderItem: (info: { item: T; index: number }) => ReactNode;
  keyExtractor: (item: T) => string;
  ListEmptyComponent?: ReactNode;
}) {
  if (!data.length) return createElement('div', null, ListEmptyComponent ?? null);
  return createElement(
    'ul',
    { 'data-testid': 'thread' },
    data.map((item, index) => createElement('li', { key: keyExtractor(item) }, renderItem({ item, index }))),
  );
}

export function ModalBox({ visible, children }: { visible: boolean; children?: ReactNode }) {
  return visible ? createElement('div', { role: 'dialog' }, children) : null;
}

export function reactNativeMock() {
  return {
    View: Box,
    ScrollView: Box,
    KeyboardAvoidingView: Box,
    SafeAreaView: Box,
    Pressable: Press,
    Text: Txt,
    TextInput: TextField,
    FlatList: List,
    Modal: ModalBox,
    ActivityIndicator: () => createElement('span', { 'aria-label': 'Cargando' }),
    Switch: ({ value, onValueChange, accessibilityLabel }: { value: boolean; onValueChange: (next: boolean) => void; accessibilityLabel?: string }) =>
      createElement('input', { type: 'checkbox', checked: value, 'aria-label': accessibilityLabel, onChange: () => onValueChange(!value) }),
    StatusBar: { currentHeight: 0 },
    Platform: { OS: 'ios', select: (options: { ios?: unknown; default?: unknown }) => options.ios ?? options.default },
    Alert: { alert: () => undefined },
    Linking: { openURL: () => Promise.resolve(), openSettings: () => Promise.resolve() },
    AppState: { currentState: 'active', addEventListener: () => ({ remove: () => undefined }) },
    AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove: () => undefined }) },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  };
}

const anything = new Proxy({}, { get: () => 8 });
const ink = new Proxy({}, { get: () => '#000' });

export function themeMock() {
  return {
    colors: ink,
    accentPolicy: ink,
    socialMapColors: ink,
    overlay: ink,
    bubbleInkFaint: '#000',
    bubbleInkMuted: '#000',
    readReceiptTick: '#000',
    fontSizes: anything,
    iconSizes: anything,
    radii: anything,
    spacing: anything,
    maxContentWidth: 640,
    maxWideContentWidth: 960,
    minTouchTarget: 44,
    semibold: '600',
  };
}
