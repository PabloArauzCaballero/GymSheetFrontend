import * as FileSystem from 'expo-file-system/legacy';
import { FlexWidget, SvgWidget, TextWidget, requestWidgetUpdate, type WidgetTaskHandler } from 'react-native-android-widget';
import { fontSizes } from '@/theme';
import { mascotXml } from './mascot';
import { currentEntry, parseSnapshot, type NudgeSnapshot, type StoredEntry } from './snapshot';

/**
 * Widgets de Android (`react-native-android-widget`). Android no tiene línea de
 * tiempo como WidgetKit: guarda la instantánea en un archivo y la tarea en
 * segundo plano (cada 30 min como mucho, ver `app.json`) elige la entrada que
 * toca ahora. Así Repi se impacienta a las 18:00 sin abrir la app.
 */
export const ANDROID_WIDGETS = { gym: 'RepiGym', matches: 'RepiMatches' } as const;

type Hex = `#${string}`;
const FILE_NAME = 'nudge-snapshot.v1.json';

function snapshotFile(): string | null {
  return FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${FILE_NAME}` : null;
}

async function readSnapshot(): Promise<NudgeSnapshot | null> {
  const file = snapshotFile();
  if (!file) return null;
  try {
    return parseSnapshot(await FileSystem.readAsStringAsync(file));
  } catch {
    return null;
  }
}

export function RepiAndroidWidget({ entry, palette, wide }: { entry: StoredEntry; palette: NudgeSnapshot['palette']; wide: boolean }) {
  return (
    <FlexWidget
      accessibilityLabel={`${entry.title}. ${entry.body}`}
      clickAction="OPEN_URI"
      clickActionData={{ uri: entry.url }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: wide ? 'row' : 'column',
        alignItems: wide ? 'center' : 'flex-start',
        backgroundColor: palette.background as Hex,
        borderRadius: 24,
        padding: 14,
      }}
    >
      <SvgWidget svg={mascotXml(entry.mood)} style={{ height: wide ? 96 : 56, width: wide ? 96 : 56 }} />
      <FlexWidget style={{ flex: 1, flexDirection: 'column', marginLeft: wide ? 12 : 0, marginTop: wide ? 0 : 8 }}>
        <TextWidget maxLines={1} style={{ color: palette.text as Hex, fontSize: fontSizes.sm, fontWeight: '600' }} text={entry.title} />
        <TextWidget maxLines={wide ? 4 : 3} style={{ color: palette.muted as Hex, fontSize: fontSizes.footnote, marginTop: 2 }} text={entry.body} />
      </FlexWidget>
    </FlexWidget>
  );
}

function renderFor(snapshot: NudgeSnapshot, name: string, width: number) {
  const entries = name === ANDROID_WIDGETS.matches ? snapshot.matches : snapshot.gym;
  const entry = currentEntry(entries, Date.now());
  return entry ? <RepiAndroidWidget entry={entry} palette={snapshot.palette} wide={width >= 250} /> : null;
}

export async function publishWidgets(snapshot: NudgeSnapshot): Promise<void> {
  const file = snapshotFile();
  if (file) {
    try {
      await FileSystem.writeAsStringAsync(file, JSON.stringify(snapshot));
    } catch {
      // Sin archivo, la tarea en segundo plano repetirá lo último que pintó.
    }
  }
  await Promise.all(
    Object.values(ANDROID_WIDGETS).map((widgetName) =>
      requestWidgetUpdate({
        widgetName,
        renderWidget: (info) => renderFor(snapshot, widgetName, info.width) ?? <FlexWidget />,
      }),
    ),
  );
}

/** Tarea en segundo plano: al añadir, redimensionar o en el refresco periódico. */
export const nudgeWidgetTaskHandler: WidgetTaskHandler = async ({ widgetInfo, widgetAction, renderWidget }) => {
  if (widgetAction === 'WIDGET_DELETED' || widgetAction === 'WIDGET_CLICK') return;
  const snapshot = await readSnapshot();
  const widget = snapshot ? renderFor(snapshot, widgetInfo.widgetName, widgetInfo.width) : null;
  // Sin instantánea (aún no se abrió la app tras instalar): una invitación neutra.
  renderWidget(
    widget ?? (
      <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', padding: 14 }}>
        <TextWidget style={{ fontSize: fontSizes.sm }} text="Abre REPP y Repi te dirá qué toca hoy." />
      </FlexWidget>
    ),
  );
};
