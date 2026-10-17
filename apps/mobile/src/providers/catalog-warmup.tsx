import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { exerciseService } from "@/api/services";
import {
  clearCatalogCache,
  persistCatalogCache,
  restoreCatalogCache,
} from "@/lib/query-cache";
import { useAuthStore } from "@/state/auth-store";

/**
 * Calienta el catálogo desde que se abre la app, no cuando se pisa la pantalla.
 *
 * 1. Rehidrata del disco lo que se vio la última vez (pinta al instante).
 * 2. Con sesión, pide en segundo plano las zonas del cuerpo, que son lo primero
 *    que ve quien entra a Ejercicios.
 * 3. Mientras la app corre, vuelca el catálogo al disco; al cerrar sesión lo borra.
 *
 * No renderiza nada y nunca bloquea el arranque: si algo falla, la pantalla
 * pide sus datos como antes.
 */
export function CatalogWarmup() {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    let stop = () => undefined as void;
    let cancelled = false;
    void restoreCatalogCache(queryClient).then(() => {
      if (!cancelled) stop = persistCatalogCache(queryClient);
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [queryClient]);

  useEffect(() => {
    if (status === "unauthenticated") {
      void clearCatalogCache();
      return;
    }
    if (status !== "authenticated") return;
    void queryClient.prefetchQuery({
      queryKey: ["exercises", "taxonomy"],
      queryFn: () => exerciseService.taxonomy(),
      staleTime: 30 * 60 * 1000,
    });
  }, [queryClient, status]);

  return null;
}
