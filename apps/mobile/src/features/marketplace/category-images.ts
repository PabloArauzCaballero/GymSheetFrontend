/* eslint-disable @typescript-eslint/no-require-imports -- Metro resuelve los recursos estáticos con require(). */
import type { ImageSourcePropType } from 'react-native';
import type { MarketplaceCategoryId } from '@gymsheet/domain';

/** Iconos 3D de las categorías (PNG 256 px, fondo navy de la marca). */
export const CATEGORY_IMAGES: Record<MarketplaceCategoryId, ImageSourcePropType> = {
  all: require('../../../assets/marketplace/todo.png'),
  gyms: require('../../../assets/marketplace/gimnasios.png'),
  supplements: require('../../../assets/marketplace/suplementos.png'),
  apparel: require('../../../assets/marketplace/indumentaria.png'),
  equipment: require('../../../assets/marketplace/equipamiento.png'),
  coaches: require('../../../assets/marketplace/coaches.png'),
  centers: require('../../../assets/marketplace/centros.png'),
  passes: require('../../../assets/marketplace/pases.png'),
};
