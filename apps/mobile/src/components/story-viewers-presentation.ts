/**
 * El contrato visual del acceso a espectadores de una story propia.
 *
 * Deja fuera del visor la gramática, el estado de carga y la decisión de si se
 * puede abrir la hoja. Así el control compacto y la cabecera de la hoja no
 * pueden divergir al traducirse o cambiar el diseño.
 */
const storyViewerCountFormatter = new Intl.NumberFormat('es-BO');

export function storyViewersPresentation(total: number | null): {
  controlLabel: string;
  accessibilityLabel: string;
  detailLabel: string;
  isOpenable: boolean;
} {
  if (total === null) {
    return {
      controlLabel: 'Vistas',
      accessibilityLabel: 'Cargando las vistas de tu story',
      detailLabel: 'Cargando vistas…',
      isOpenable: false,
    };
  }

  if (total === 0) {
    return {
      controlLabel: '0',
      accessibilityLabel: 'Tu story todavía no tiene vistas',
      detailLabel: 'Todavía nadie vio esta story',
      isOpenable: false,
    };
  }

  if (total === 1) {
    return {
      controlLabel: '1',
      accessibilityLabel: 'Ver la persona que vio tu story',
      detailLabel: '1 persona vio esta story',
      isOpenable: true,
    };
  }

  const formattedTotal = storyViewerCountFormatter.format(total);
  return {
    controlLabel: formattedTotal,
    accessibilityLabel: `Ver las ${formattedTotal} personas que vieron tu story`,
    detailLabel: `${formattedTotal} personas vieron esta story`,
    isOpenable: true,
  };
}
