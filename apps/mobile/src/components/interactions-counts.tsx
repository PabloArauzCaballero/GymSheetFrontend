import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type { InteractionCounts } from '@gymsheet/schemas';
import { interactionsService } from '@/api/services';
import { accentContrast, colors, fontSizes, radii, semibold } from '@/theme';

/**
 * La clave de los contadores, en una constante.
 *
 * La consultan tres sitios a la vez —la barra de pestañas, la cabecera de
 * Comunidad y la propia pantalla de Interacciones— y la invalidan otros tantos.
 * Escrita a mano en seis ficheros, basta una errata para que el punto rojo se
 * quede encendido después de revisar la lista y nadie entienda por qué.
 */
export const INTERACTION_COUNTS_KEY = ['interactions', 'counts'] as const;

/**
 * Los contadores de interacciones, compartidos.
 *
 * `staleTime` de 60 s a propósito: esto se monta en la barra de pestañas, que
 * está viva durante toda la sesión, y sin ventana de frescura cada cambio de
 * pestaña dispararía una petición. Un minuto es suficiente para que un like
 * recién recibido aparezca «enseguida» sin convertir el badge en un sondeo.
 */
export function useInteractionCounts(): UseQueryResult<InteractionCounts, Error> {
  return useQuery({
    queryKey: INTERACTION_COUNTS_KEY,
    queryFn: () => interactionsService.counts(),
    staleTime: 60_000,
  });
}

/**
 * Lo que enciende el badge: likes recibidos sin resolver más visitas nuevas.
 *
 * Los descartes no suman. Un «next» no es algo que atender, y contarlo aquí
 * convertiría el número en una cuenta de cosas malas que no se pueden hacer
 * desaparecer haciendo nada.
 */
export function interactionsAlertTotal(counts: InteractionCounts | undefined): number {
  if (!counts) return 0;
  return counts.likesReceived + counts.profileViewsNew;
}

/** Tope visual del badge: a partir de aquí el dígito exacto deja de importar. */
const BADGE_MAX = 99;

export function formatBadgeCount(total: number): string {
  return total > BADGE_MAX ? `${BADGE_MAX}+` : String(total);
}

/**
 * El número sobre el icono.
 *
 * Relleno de acento, no texto de acento: la regla de `accentPolicy` es que el
 * acento como relleno usa `colors.volt` y lleva encima la tinta de contraste
 * de la marca. Un «3» en volt sobre la superficie oscura no llegaría al
 * contraste mínimo en todas las marcas.
 */
export function InteractionsBadge({ total }: { total: number }) {
  if (total <= 0) return null;
  const label = formatBadgeCount(total);

  return (
    <View
      // Decorativo para el lector de pantalla: quien lo necesita ya recibe la
      // cuenta en la etiqueta del botón que lo contiene, y anunciarla dos veces
      // hace que «Interacciones, 3, 3» sea lo que se escucha.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        minWidth: 20,
        height: 20,
        paddingHorizontal: 5,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radii.full,
        backgroundColor: colors.volt,
        borderWidth: 2,
        borderColor: colors.background,
      }}
    >
      <Text
        style={{
          color: accentContrast(),
          fontSize: fontSizes.xs,
          fontWeight: semibold,
          fontVariant: ['tabular-nums'],
        }}
      >
        {label}
      </Text>
    </View>
  );
}
