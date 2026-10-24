/* eslint-disable @typescript-eslint/no-require-imports -- Metro resuelve los recursos estáticos con require(). */
import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  resizable,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { createWidget, widgetsDirectory, type WidgetEnvironment } from 'expo-widgets';
import { MASCOT_MOODS, type MascotMood } from './mascot';
import type { NudgeSnapshot, StoredEntry } from './snapshot';

/**
 * Widgets de iOS (`expo-widgets`). Dos, con el mismo dibujo: «Repi» (te manda
 * a rutinas) y «Matches». La app escribe su línea de tiempo y WidgetKit la va
 * mostrando sola; aquí no hay red ni sesión.
 *
 * La función marcada con `'widget'` corre aislada: no ve nada de fuera de su
 * cuerpo, así que colores y ruta de la imagen le llegan como props.
 */
type RepiWidgetProps = {
  title: string;
  body: string;
  bodyPrivate: string;
  image: string;
  url: string;
  background: string;
  text: string;
  muted: string;
};

const RepiLayout = (props: RepiWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const family = environment.widgetFamily;
  const background = containerBackground(props.background, 'widget');
  if (family === 'accessoryInline') {
    return <Text modifiers={[widgetURL(props.url)]}>{props.title}</Text>;
  }
  if (family === 'accessoryRectangular') {
    // Pantalla bloqueada: nunca nombres, solo la versión privada.
    return (
      <VStack alignment="leading" spacing={1} modifiers={[widgetURL(props.url), background, frame({ maxWidth: 400, alignment: 'leading' })]}>
        <Text modifiers={[font({ textStyle: 'headline' }), lineLimit(1)]}>{props.title}</Text>
        <Text modifiers={[font({ textStyle: 'caption' }), lineLimit(2)]}>{props.bodyPrivate}</Text>
      </VStack>
    );
  }
  const mascot = (size: number) => (
    <Image uiImage={props.image} modifiers={[resizable(), frame({ width: size, height: size })]} />
  );
  if (family === 'systemMedium') {
    return (
      <HStack spacing={12} modifiers={[widgetURL(props.url), background]}>
        {mascot(112)}
        <VStack alignment="leading" spacing={6}>
          <Text modifiers={[font({ size: 17, weight: 'semibold' }), foregroundStyle(props.text), lineLimit(2)]}>{props.title}</Text>
          <Text modifiers={[font({ size: 15 }), foregroundStyle(props.muted), lineLimit(4)]}>{props.body}</Text>
          <Spacer />
        </VStack>
        <Spacer />
      </HStack>
    );
  }
  return (
    <VStack alignment="leading" spacing={4} modifiers={[widgetURL(props.url), background]}>
      <HStack>
        {mascot(46)}
        <Spacer />
      </HStack>
      <Spacer />
      <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(props.text), lineLimit(2), fixedSize({ vertical: true })]}>{props.title}</Text>
      <Text modifiers={[font({ size: 13 }), foregroundStyle(props.muted), lineLimit(3)]}>{props.body}</Text>
    </VStack>
  );
};

const gymWidget = createWidget('RepiGym', RepiLayout);
const matchesWidget = createWidget('RepiMatches', RepiLayout);

const MASCOT_SOURCES: Readonly<Record<MascotMood, number>> = {
  proud: require('../../../assets/mascot/proud.png'),
  wink: require('../../../assets/mascot/wink.png'),
  impatient: require('../../../assets/mascot/impatient.png'),
  dramatic: require('../../../assets/mascot/dramatic.png'),
  asleep: require('../../../assets/mascot/asleep.png'),
  resting: require('../../../assets/mascot/resting.png'),
  flirty: require('../../../assets/mascot/flirty.png'),
};

const imagePath = (mood: MascotMood) => `${widgetsDirectory.replace(/\/?$/u, '/')}repi-${mood}.png`;

let imagesReady: Promise<void> | null = null;

/** Copia los PNG de Repi a la carpeta compartida con la extensión (una vez por arranque). */
function ensureImages(): Promise<void> {
  imagesReady ??= Promise.all(
    MASCOT_MOODS.map(async (mood) => {
      const asset = await Asset.fromModule(MASCOT_SOURCES[mood]).downloadAsync();
      if (!asset.localUri) return;
      await FileSystem.copyAsync({ from: asset.localUri, to: imagePath(mood) });
    }),
  ).then(() => undefined);
  return imagesReady;
}

function timeline(entries: readonly StoredEntry[], snapshot: NudgeSnapshot) {
  return entries.map((entry) => ({
    date: new Date(entry.at),
    props: {
      title: entry.title,
      body: entry.body,
      bodyPrivate: entry.bodyPrivate,
      image: imagePath(entry.mood),
      url: entry.url,
      ...snapshot.palette,
    },
  }));
}

export async function publishWidgets(snapshot: NudgeSnapshot): Promise<void> {
  try {
    await ensureImages();
  } catch {
    // Sin imágenes el widget sigue mostrando el texto: no bloquea.
    imagesReady = null;
  }
  if (snapshot.gym.length > 0) gymWidget.updateTimeline(timeline(snapshot.gym, snapshot));
  if (snapshot.matches.length > 0) matchesWidget.updateTimeline(timeline(snapshot.matches, snapshot));
}
