import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { nudgeWidgetTaskHandler } from './widgets.android';

// Android arranca este JS sin interfaz para pintar los widgets; tiene que
// estar registrado antes que el router.
registerWidgetTaskHandler(nudgeWidgetTaskHandler);
