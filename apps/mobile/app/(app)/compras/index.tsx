import { orderCopy } from '@gymsheet/domain';
import { ordersOfPages, queryKeys } from '@gymsheet/hooks';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { Card, Divider, ScreenHeader, ScrollScreen } from '@/components/layout';
import { Button } from '@/components/ui';
import { OrderRow } from '@/features/orders/order-row';
import { buyerOrdersService } from '@/features/orders/orders-service';

/** «Mis compras» under Perfil (franja 8d): every order of the person, newest first, by cursor. */
export default function MyOrdersScreen() {
  const router = useRouter();
  const orders = useInfiniteQuery({
    queryKey: queryKeys.orders.list,
    queryFn: ({ pageParam }) => buyerOrdersService.list({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const items = ordersOfPages(orders.data);
  return (
    <ScrollScreen onRefresh={() => void orders.refetch()} refreshing={orders.isRefetching}>
      <ScreenHeader subtitle="Lo que compraste y en qué va cada pedido." title={orderCopy.myOrders} />
      {orders.isPending ? (
        <RowsSkeleton rows={4} thumb={40} />
      ) : orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon="bag-outline" message={orderCopy.emptyMine} title="Todavía no compraste nada" />
      ) : (
        <Card list>
          {items.map((order, index) => (
            <View key={order.id}>
              {index > 0 ? <Divider /> : null}
              <OrderRow onPress={() => router.push({ pathname: '/compras/[id]', params: { id: order.id } })} order={order} />
            </View>
          ))}
        </Card>
      )}
      {orders.hasNextPage ? <Button label="Ver más" loading={orders.isFetchingNextPage} onPress={() => void orders.fetchNextPage()} variant="ghost" /> : null}
    </ScrollScreen>
  );
}
