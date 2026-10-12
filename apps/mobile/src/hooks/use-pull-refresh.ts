import { useCallback, useState } from 'react';

/**
 * «Tirar para actualizar» que solo se enciende cuando la persona TIRÓ.
 *
 * Con `refreshing={query.isRefetching}` cualquier recarga en segundo plano
 * (valorar, comentar, volver a la pantalla) encendía el control del sistema, que
 * en iOS empuja el contenido unos 60 pt hacia abajo y lo suelta al terminar: la
 * pantalla daba un salto sin que nadie la hubiera tocado.
 */
export function usePullRefresh(refresh: () => Promise<unknown> | void) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void Promise.resolve(refresh()).finally(() => setRefreshing(false));
  }, [refresh]);
  return { refreshing, onRefresh };
}
