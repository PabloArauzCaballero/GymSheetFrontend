import { orderCopy } from '@gymsheet/domain';
import { ordersOfPages, queryKeys, splitInbox } from '@gymsheet/hooks';
import type { BusinessOrder } from '@gymsheet/schemas';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/feedback';
import { Card, Divider, ScreenHeader, ScrollScreen, Section } from '@/components/layout';
import { Button } from '@/components/ui';
import { OrderRow } from '@/features/orders/order-row';
import { businessOrdersService } from '@/features/orders/orders-service';

function Rows({ orders, onOpen }: { orders: BusinessOrder[]; onOpen: (id: string) => void }) {
  return (
    <Card list>
      {orders.map((order, index) => (
        <View key={order.id}>
          {index > 0 ? <Divider /> : null}
          <OrderRow onPress={() => onOpen(order.id)} order={order} />
        </View>
      ))}
    </Card>
  );
}

/** «Pedidos» of the business shell (plan §4.2): «Por confirmar» first with its deadline, then the history. */
export default function BusinessOrdersScreen() {
  const router = useRouter();
  const orders = useInfiniteQuery({
    queryKey: queryKeys.business.ordersList,
    queryFn: ({ pageParam }) => businessOrdersService.list({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const { pending, history } = splitInbox(ordersOfPages(orders.data));
  const pendingCount = orders.data?.pages[0]?.pendingCount ?? pending.length;
  const open = (id: string) => router.push({ pathname: '/(business)/pedido/[id]', params: { id } });

  return (
    <ScrollScreen onRefresh={() => void orders.refetch()} refreshing={orders.isRefetching}>
      <ScreenHeader subtitle="Confirma cada pago cuando el dinero esté en tu cuenta." title={orderCopy.inbox} />
      {orders.isPending ? (
        <RowsSkeleton rows={4} thumb={40} />
      ) : orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : pending.length + history.length === 0 ? (
        <EmptyState icon="receipt-outline" message={orderCopy.emptyInbox} title="Todavía no hay pedidos" />
      ) : (
        <>
          {pending.length > 0 ? (
            <Section title={`${orderCopy.pendingSection} (${pendingCount})`}>
              <Rows onOpen={open} orders={pending} />
            </Section>
          ) : null}
          {history.length > 0 ? (
            <Section title={orderCopy.historySection}>
              <Rows onOpen={open} orders={history} />
            </Section>
          ) : null}
        </>
      )}
      {orders.hasNextPage ? <Button label="Ver más" loading={orders.isFetchingNextPage} onPress={() => void orders.fetchNextPage()} variant="ghost" /> : null}
    </ScrollScreen>
  );
}
