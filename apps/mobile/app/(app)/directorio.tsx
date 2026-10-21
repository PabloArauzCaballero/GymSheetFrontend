import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type {
  DirectoryEntityDetail,
  DirectoryEntitySummary,
  EntityReviewsResponse,
  EntityPlan,
  EntityPaymentConfig,
  PaymentOrder,
} from '@gymsheet/schemas';
import { directoryService, directoryPaymentsService, communityService, membershipService } from '@/api/services';
import { useAuthStore } from '@/state/auth-store';
import { AmbientBackground } from '@/components/ambient';
import { EmptyState, ErrorState } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { BackLink } from '@/components/nav';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { accentHues, alpha, colors, darkSurfaces, fontSizes, heroNumberFontSize, ink, radii, semibold, spacing } from '@/theme';

const MARKET_CATEGORIES = [
  { id: 'all', label: '🏷️ Todo', type: undefined, categoryPath: undefined },
  { id: 'gyms', label: '🏋️ Gimnasios', type: 'GYM', categoryPath: 'gimnasios' },
  { id: 'supplements', label: '💊 Suplementos', type: 'STORE', categoryPath: 'tiendas.nutricion' },
  { id: 'apparel', label: '👕 Indumentaria', type: 'STORE', categoryPath: 'tiendas.indumentaria' },
  { id: 'passes', label: '🎟️ Pases & Planes', type: undefined, categoryPath: undefined },
  { id: 'coaches', label: '🥋 Coaches', type: 'COACH', categoryPath: 'coaches' },
] as const;

export default function DirectorioScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const principal = useAuthStore((s) => s.principal);
  const userTenantId = principal?.tenantId || 'default';

  const [viewMode, setViewMode] = useState<'OFFERS' | 'ENTITIES'>('OFFERS');
  const [selectedPillId, setSelectedPillId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedEntitySlug, setSelectedEntitySlug] = useState<string | null>(null);

  const activeCategoryConfig = MARKET_CATEGORIES.find((c) => c.id === selectedPillId);
  const selectedType = activeCategoryConfig?.type;
  const selectedCategoryPath = activeCategoryConfig?.categoryPath;

  // Estados para modal de reseña
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerRating, setComposerRating] = useState(5);
  const [composerTitle, setComposerTitle] = useState('');
  const [composerBody, setComposerBody] = useState('');

  // Estados para Marketplace y Pagos por QR
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<EntityPlan | null>(null);
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [currentPaymentConfig, setCurrentPaymentConfig] = useState<EntityPaymentConfig | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptReference, setReceiptReference] = useState('');
  const [athleteNotes, setAthleteNotes] = useState('');
  const [isReceiptSubmitted, setIsReceiptSubmitted] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Estados para comentarios del plan (sistema community existente)
  const [selectedPlanForComments, setSelectedPlanForComments] = useState<EntityPlan | null>(null);
  const [isPlanCommentsOpen, setIsPlanCommentsOpen] = useState(false);
  const [newPlanCommentText, setNewPlanCommentText] = useState('');

  // 2. Cargar entidades (gimnasios, tiendas, coaches)
  const {
    data: entities = [],
    isLoading: loadingEntities,
    error: entitiesError,
    refetch: refetchEntities,
  } = useQuery<DirectoryEntitySummary[]>({
    queryKey: ['directory-entities', selectedType, selectedCategoryPath, search],
    queryFn: () =>
      directoryService.entities({
        type: selectedType,
        categoryPath: selectedCategoryPath,
        search: search.trim() || undefined,
        limit: 50,
      }),
  });

  // 3. Cargar todas las ofertas de productos y pases del Marketplace
  const {
    data: marketplaceOffers = [],
    isLoading: loadingOffers,
    error: offersError,
    refetch: refetchOffers,
  } = useQuery<EntityPlan[]>({
    queryKey: ['directory-marketplace-all-plans'],
    queryFn: () => directoryPaymentsService.allMarketplacePlans({ limit: 50 }),
  });

  // 4. Cargar membresía del usuario para destacar su condición
  const { data: myMembership } = useQuery({
    queryKey: ['my-membership-directorio'],
    queryFn: () => membershipService.getMine(),
  });

  // «Tu gimnasio» es el ente del mismo gimnasio que la sesión, sin excepciones
  // por nombre: el atajo anterior marcaba «topfitness» a cualquiera de `default`.
  const isGymOfUser = (item: { tenantId?: string | null }) =>
    Boolean(item.tenantId && item.tenantId === userTenantId);

  const myGym = entities.find((e) => isGymOfUser(e));

  const filteredOffers = marketplaceOffers.filter((plan) => {
    if (selectedPillId === 'gyms') {
      if (plan.type !== 'MEMBERSHIP_PLAN' && plan.type !== 'PASS') return false;
    } else if (selectedPillId === 'supplements') {
      const lower = (plan.name + ' ' + plan.description).toLowerCase();
      if (!lower.includes('protein') && !lower.includes('creatina') && !lower.includes('workout') && !lower.includes('nutri')) {
        return false;
      }
    } else if (selectedPillId === 'apparel') {
      const lower = (plan.name + ' ' + plan.description).toLowerCase();
      if (!lower.includes('cintur') && !lower.includes('strap') && !lower.includes('polera') && !lower.includes('indumentaria')) {
        return false;
      }
    } else if (selectedPillId === 'passes') {
      if (plan.type !== 'PASS' && plan.type !== 'MEMBERSHIP_PLAN') return false;
    } else if (selectedPillId === 'coaches') {
      if (plan.type !== 'SERVICE' && plan.entity?.entityType !== 'COACH') return false;
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = plan.name.toLowerCase().includes(q);
      const matchDesc = plan.description.toLowerCase().includes(q);
      const matchSeller = plan.entity?.name.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchSeller) return false;
    }

    return true;
  });

  const filteredEntities = entities.filter((item) => {
    if (selectedPillId === 'gyms' && item.entityType !== 'GYM') return false;
    if (selectedPillId === 'supplements' && item.primaryCategory?.slug !== 'tiendas-nutricion' && item.primaryCategory?.slug !== 'tiendas') return false;
    if (selectedPillId === 'apparel' && item.primaryCategory?.slug !== 'tiendas-indumentaria' && item.primaryCategory?.slug !== 'tiendas') return false;
    if (selectedPillId === 'coaches' && item.entityType !== 'COACH') return false;
    return true;
  });

  // 3. Cargar detalle de entidad seleccionada
  const { data: entityDetail, isLoading: loadingDetail } = useQuery<DirectoryEntityDetail | null>({
    queryKey: ['directory-entity-detail', selectedEntitySlug],
    queryFn: () => (selectedEntitySlug ? directoryService.entity(selectedEntitySlug) : null),
    enabled: Boolean(selectedEntitySlug),
  });

  // 4. Cargar reseñas de la entidad seleccionada
  const { data: reviewsData, isLoading: loadingReviews } = useQuery<EntityReviewsResponse | null>({
    queryKey: ['directory-entity-reviews', entityDetail?.id],
    queryFn: () => (entityDetail?.id ? directoryService.reviews(entityDetail.id) : null),
    enabled: Boolean(entityDetail?.id),
  });

  // 5. Cargar planes de la entidad seleccionada en el Marketplace
  const { data: entityPlans = [], isLoading: loadingPlans } = useQuery<EntityPlan[]>({
    queryKey: ['directory-entity-plans', entityDetail?.id],
    queryFn: () => (entityDetail?.id ? directoryPaymentsService.listPlans(entityDetail.id) : []),
    enabled: Boolean(entityDetail?.id),
  });

  // 6. Cargar configuración de pago y QR bancario de la entidad
  const { data: entityPaymentConfig } = useQuery<EntityPaymentConfig | null>({
    queryKey: ['directory-entity-payment-config', entityDetail?.id],
    queryFn: () => (entityDetail?.id ? directoryPaymentsService.getPaymentConfig(entityDetail.id) : null),
    enabled: Boolean(entityDetail?.id),
  });

  // 7. Cargar comentarios del plan seleccionado (Community)
  const { data: planCommentsData, isLoading: loadingPlanComments, refetch: refetchPlanComments } = useQuery({
    queryKey: ['directory-plan-comments', selectedPlanForComments?.id],
    queryFn: () =>
      selectedPlanForComments?.id
        ? communityService.comments('DIRECTORY_PRODUCT', selectedPlanForComments.id)
        : null,
    enabled: Boolean(selectedPlanForComments?.id),
  });

  // Mutación para publicar reseña de la entidad
  const reviewMutation = useMutation({
    mutationFn: (input: { entityId: string; rating: number; title: string; body: string }) =>
      directoryService.createReview(input.entityId, input),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      notify.success('¡Reseña publicada! Tu valoración ya es visible para toda la comunidad.');
      setIsComposerOpen(false);
      setComposerTitle('');
      setComposerBody('');
      setComposerRating(5);
      if (entityDetail?.id) {
        queryClient.invalidateQueries({ queryKey: ['directory-entity-reviews', entityDetail.id] });
        queryClient.invalidateQueries({ queryKey: ['directory-entity-detail', selectedEntitySlug] });
      }
    },
    onError: (err: unknown) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = err instanceof Error ? err.message : 'No se pudo guardar la reseña.';
      notify.error(message);
    },
  });

  // Mutación para iniciar compra de plan (genera orden con snapshot y QR)
  const checkoutMutation = useMutation({
    mutationFn: (plan: EntityPlan) =>
      directoryPaymentsService.createOrder({
        planId: plan.id,
      }),
    onSuccess: (data, plan) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedPlanForPayment(plan);
      setCurrentOrder(data.order);
      setCurrentPaymentConfig(data.paymentConfig ?? entityPaymentConfig ?? null);
      setReceiptUrl('');
      setReceiptReference('');
      setAthleteNotes('');
      setIsReceiptSubmitted(false);
      setIsPaymentModalOpen(true);
    },
    onError: (err: unknown) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : 'No se pudo iniciar la compra.';
      notify.error(msg);
    },
  });

  // Mutación para subir comprobante
  const submitReceiptMutation = useMutation({
    mutationFn: (input: { orderId: string; receiptUrl: string; receiptReference?: string; athleteNotes?: string }) =>
      directoryPaymentsService.submitReceipt(input.orderId, input),
    onSuccess: (updatedOrder) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCurrentOrder(updatedOrder);
      setIsReceiptSubmitted(true);
      notify.success('¡Comprobante enviado! El gimnasio validará tu transferencia.');
    },
    onError: (err: unknown) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : 'Error al enviar comprobante.';
      notify.error(msg);
    },
  });

  // Mutación para publicar comentario sobre un plan (sistema community existente)
  const planCommentMutation = useMutation({
    mutationFn: (input: { planId: string; text: string }) =>
      communityService.createComment('DIRECTORY_PRODUCT', input.planId, { texto: input.text }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewPlanCommentText('');
      refetchPlanComments();
      notify.success('Comentario enviado.');
    },
    onError: (err: unknown) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err instanceof Error ? err.message : 'No se pudo publicar el comentario.';
      notify.error(msg);
    },
  });

  // Mutación para voto útil
  const helpfulMutation = useMutation({
    mutationFn: (reviewId: string) => directoryService.toggleHelpful(reviewId),
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (entityDetail?.id) {
        queryClient.invalidateQueries({ queryKey: ['directory-entity-reviews', entityDetail.id] });
      }
    },
  });

  const handleOpenComposer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsComposerOpen(true);
  };

  const handleStarPress = (star: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComposerRating(star);
  };

  const handleSubmitReview = () => {
    if (!entityDetail?.id) return;
    if (composerTitle.trim().length < 3) {
      notify.warning('Escribe un título de al menos 3 caracteres.');
      return;
    }
    if (composerBody.trim().length < 10) {
      notify.warning('Escribe al menos 10 caracteres sobre tu experiencia.');
      return;
    }

    reviewMutation.mutate({
      entityId: entityDetail.id,
      rating: composerRating,
      title: composerTitle.trim(),
      body: composerBody.trim(),
    });
  };

  const handlePickReceiptImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        Haptics.selectionAsync();
        const asset = res.assets[0];
        setUploadingReceipt(true);
        try {
          const uploaded = await communityService.uploadAttachment({
            uri: asset.uri,
            name: asset.fileName ?? 'comprobante.jpg',
            mimeType: asset.mimeType ?? 'image/jpeg',
          });
          setReceiptUrl(uploaded.url);
          notify.success('Comprobante subido al servidor correctamente');
        } catch (uploadErr) {
          console.warn('[Directorio] Receipt upload fallback to local uri:', uploadErr);
          setReceiptUrl(asset.uri);
          notify.info('Comprobante seleccionado localmente.');
        } finally {
          setUploadingReceipt(false);
        }
      }
    } catch {
      notify.warning('No se pudo abrir la galería.');
    }
  };

  const handleSubmitReceipt = () => {
    if (!currentOrder?.id) return;
    if (!receiptUrl.trim()) {
      notify.warning('Por favor adjunta la captura o URL de tu comprobante bancario.');
      return;
    }
    submitReceiptMutation.mutate({
      orderId: currentOrder.id,
      receiptUrl: receiptUrl.trim(),
      receiptReference: receiptReference.trim() || undefined,
      athleteNotes: athleteNotes.trim() || undefined,
    });
  };

  const handleSendPlanComment = () => {
    if (!selectedPlanForComments?.id) return;
    if (!newPlanCommentText.trim()) {
      notify.warning('Escribe una pregunta o comentario sobre el plan.');
      return;
    }
    planCommentMutation.mutate({
      planId: selectedPlanForComments.id,
      text: newPlanCommentText.trim(),
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, spacing.md) + spacing.xs }]}>
      <StatusBar barStyle="light-content" />
      <AmbientBackground />

      {/* Header */}
      <View style={styles.header}>
        <BackLink label="Atrás" />
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.title}>Marketplace GymSheet</Text>
          <Text style={styles.headerSubtitle}>Directorio oficial de gimnasios, tiendas y pases</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Buscador Marketplace */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          placeholder="Buscar ofertas, marcas, suplementos, gyms..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <PressableScale onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </PressableScale>
        )}
      </View>

      {/* Píldoras de Categorías Estilo Marketplace (Fila única limpia) */}
      <View style={styles.pillsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
          {MARKET_CATEGORIES.map((cat) => {
            const isSelected = selectedPillId === cat.id;
            return (
              <PressableScale
                key={cat.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedPillId(cat.id);
                }}
                style={[styles.pill, isSelected && styles.pillSelected]}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                  {cat.label}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      {/* Selector Segmentado: Ofertas & Catálogo vs Tiendas & Gimnasios */}
      <View style={styles.segmentContainer}>
        <PressableScale
          onPress={() => {
            Haptics.selectionAsync();
            setViewMode('OFFERS');
          }}
          style={[styles.segmentButton, viewMode === 'OFFERS' && styles.segmentButtonActive]}
        >
          <Ionicons
            name="pricetags"
            size={15}
            color={viewMode === 'OFFERS' ? ink.black : colors.textMuted}
          />
          <Text style={[styles.segmentText, viewMode === 'OFFERS' && styles.segmentTextActive]}>
            Ofertas ({filteredOffers.length})
          </Text>
        </PressableScale>

        <PressableScale
          onPress={() => {
            Haptics.selectionAsync();
            setViewMode('ENTITIES');
          }}
          style={[styles.segmentButton, viewMode === 'ENTITIES' && styles.segmentButtonActive]}
        >
          <Ionicons
            name="business"
            size={15}
            color={viewMode === 'ENTITIES' ? ink.black : colors.textMuted}
          />
          <Text style={[styles.segmentText, viewMode === 'ENTITIES' && styles.segmentTextActive]}>
            Tiendas & Gyms ({filteredEntities.length})
          </Text>
        </PressableScale>
      </View>

      {/* Contenido Principal en Cuadrícula Marketplace */}
      {loadingEntities || loadingOffers ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.volt} />
        </View>
      ) : viewMode === 'OFFERS' && offersError ? (
        // Un fallo de red no es «sin ofertas»: se dice y se puede reintentar.
        <View style={{ flex: 1, padding: spacing.xl }}>
          <ErrorState error={offersError} onRetry={() => void refetchOffers()} />
        </View>
      ) : viewMode === 'ENTITIES' && entitiesError ? (
        <View style={{ flex: 1, padding: spacing.xl }}>
          <ErrorState error={entitiesError} onRetry={() => void refetchEntities()} />
        </View>
      ) : viewMode === 'OFFERS' ? (
        /* VISTA MARKETPLACE: OFERTAS & PRODUCTOS */
        filteredOffers.length === 0 ? (
          <View style={{ flex: 1, padding: spacing.xl }}>
            <EmptyState
              title="Sin ofertas encontradas"
              message="No encontramos artículos con esos filtros. Prueba con otro término de búsqueda o categoría."
            />
          </View>
        ) : (
          <FlatList
            key="marketplace-grid-offers"
            data={filteredOffers}
            numColumns={2}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
            ListHeaderComponent={
              /* Card Destacado: TU GIMNASIO ACTUAL (Siempre al tope) */
              myGym && (selectedPillId === 'all' || selectedPillId === 'gyms' || selectedPillId === 'passes') ? (
                <PressableScale
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedEntitySlug(myGym.slug);
                  }}
                  style={styles.myGymSpotlightCard}
                >
                  <View style={styles.myGymCoverWrapper}>
                    <Image source={{ uri: myGym.coverUrl ?? undefined }} style={styles.myGymCover} />
                    <View style={styles.myGymGradientOverlay} />
                    <View style={styles.myGymTopBadges}>
                      <View style={styles.myGymVoltBadge}>
                        <Ionicons name="flash" size={12} color={ink.black} />
                        <Text style={styles.myGymVoltBadgeText}>TU GIMNASIO ACTUAL</Text>
                      </View>
                      <View style={styles.myGymActiveBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={colors.accentInk} />
                        <Text style={styles.myGymActiveBadgeText}>
                          {myMembership?.membership?.estado === 'ACTIVE'
                            ? `Socio Activo (${myMembership.membership.diasRestantes}d)`
                            : 'Sede Principal'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.myGymBody}>
                    <View style={styles.myGymInfoRow}>
                      {myGym.logoUrl ? (
                        <Image source={{ uri: myGym.logoUrl }} style={styles.myGymLogo} />
                      ) : (
                        <View style={[styles.myGymLogo, styles.cardLogoPlaceholder]}>
                          <Text style={styles.logoInitials}>{myGym.name.slice(0, 2).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.myGymName} numberOfLines={1}>
                          {myGym.name}
                        </Text>
                        <Text style={styles.myGymHeadline} numberOfLines={1}>
                          {myGym.headline ?? myGym.city}
                        </Text>
                        <View style={styles.myGymRatingRow}>
                          <Ionicons name="star" size={12} color={accentHues.amber} />
                          <Text style={styles.myGymRatingText}>
                            {myGym.ratingAverage > 0 ? myGym.ratingAverage.toFixed(1) : '5.0'} ({myGym.ratingCount})
                          </Text>
                          <Text style={styles.myGymDot}>·</Text>
                          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                          <Text style={styles.myGymLocationText}>{myGym.city ?? 'La Paz'}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.myGymActionsRow}>
                      <PressableScale
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedEntitySlug(myGym.slug);
                        }}
                        style={styles.myGymCtaPrimary}
                      >
                        <Ionicons name="qr-code-outline" size={14} color={ink.black} />
                        <Text style={styles.myGymCtaPrimaryText}>Planes & QR</Text>
                      </PressableScale>

                      <PressableScale
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelectedEntitySlug(myGym.slug);
                        }}
                        style={styles.myGymCtaSecondary}
                      >
                        <Ionicons name="eye-outline" size={14} color={colors.text} />
                        <Text style={styles.myGymCtaSecondaryText}>Ver Ficha</Text>
                      </PressableScale>
                    </View>
                  </View>
                </PressableScale>
              ) : null
            }
            renderItem={({ item }) => {
              const itemIsFromMyGym = isGymOfUser({ tenantId: item.entity?.tenantId });
              const displayImage =
                (item.mediaUrls && item.mediaUrls[0]) ||
                item.entity?.coverUrl ||
                item.entity?.logoUrl ||
                'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=600';

              return (
                <PressableScale
                  onPress={() => {
                    Haptics.selectionAsync();
                    if (item.entity?.slug) {
                      setSelectedEntitySlug(item.entity.slug);
                    } else {
                      checkoutMutation.mutate(item);
                    }
                  }}
                  style={styles.marketCard}
                >
                  <View style={styles.marketCardImageWrapper}>
                    <Image source={{ uri: displayImage }} style={styles.marketCardImage} contentFit="cover" />
                    <View style={styles.marketCardTypeTag}>
                      <Text style={styles.marketCardTypeTagText}>
                        {item.type === 'MEMBERSHIP_PLAN'
                          ? 'Membresía'
                          : item.type === 'PASS'
                          ? 'Pase'
                          : item.type === 'PRODUCT'
                          ? 'Producto'
                          : 'Servicio'}
                      </Text>
                    </View>
                    {itemIsFromMyGym && (
                      <View style={styles.marketCardMyGymTag}>
                        <Text style={styles.marketCardMyGymTagText}>TU GYM</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.marketCardContent}>
                    <Text style={styles.marketCardPrice}>
                      {item.currency} {Number(item.currentPrice).toFixed(2)}
                    </Text>

                    <Text style={styles.marketCardTitle} numberOfLines={2}>
                      {item.name}
                    </Text>

                    {item.entity?.name ? (
                      <View style={styles.marketCardSellerRow}>
                        <Ionicons name="checkmark-circle" size={11} color={colors.volt} />
                        <Text style={styles.marketCardSellerName} numberOfLines={1}>
                          {item.entity.name}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.marketCardLocationRow}>
                      <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                      <Text style={styles.marketCardLocationText} numberOfLines={1}>
                        {item.entity?.city ?? 'Bolivia'}
                      </Text>
                    </View>

                    <PressableScale
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        checkoutMutation.mutate(item);
                      }}
                      style={styles.marketCardBuyBtn}
                    >
                      <Ionicons name="qr-code-outline" size={12} color={colors.accentInk} />
                      <Text style={styles.marketCardBuyBtnText}>Comprar QR</Text>
                    </PressableScale>
                  </View>
                </PressableScale>
              );
            }}
          />
        )
      ) : (
        /* VISTA MARKETPLACE: TIENDAS & GIMNASIOS */
        filteredEntities.length === 0 ? (
          <View style={{ flex: 1, padding: spacing.xl }}>
            <EmptyState
              title="Sin establecimientos"
              message="No encontramos comercios con esos filtros. Prueba cambiando de categoría o búsqueda."
            />
          </View>
        ) : (
          <FlatList
            key="marketplace-grid-entities"
            data={filteredEntities}
            numColumns={2}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item }) => {
              const itemIsMyGym = isGymOfUser(item);
              const coverImg = item.coverUrl || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800';

              return (
                <PressableScale
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedEntitySlug(item.slug);
                  }}
                  style={[styles.entityMarketCard, itemIsMyGym && styles.entityMarketCardMyGym]}
                >
                  <View style={styles.entityCardCoverWrapper}>
                    <Image source={{ uri: coverImg }} style={styles.entityCardCover} contentFit="cover" />
                    {itemIsMyGym && (
                      <View style={styles.marketCardMyGymTag}>
                        <Text style={styles.marketCardMyGymTagText}>TU GYM</Text>
                      </View>
                    )}
                    <View style={styles.entityCardTypeBadge}>
                      <Text style={styles.entityCardTypeBadgeText}>
                        {item.entityType === 'GYM'
                          ? 'Gimnasio'
                          : item.entityType === 'STORE'
                          ? 'Tienda'
                          : item.entityType === 'COACH'
                          ? 'Coach'
                          : 'Centro'}
                      </Text>
                    </View>

                    {/* Logo superpuesto */}
                    {item.logoUrl ? (
                      <Image source={{ uri: item.logoUrl }} style={styles.entityCardLogoOverlap} />
                    ) : (
                      <View style={[styles.entityCardLogoOverlap, styles.cardLogoPlaceholder]}>
                        <Text style={styles.logoInitialsSmall}>{item.name.slice(0, 2).toUpperCase()}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.entityCardBody}>
                    <Text style={styles.entityCardName} numberOfLines={2}>
                      {item.name}
                    </Text>

                    <View style={styles.entityCardRatingRow}>
                      <Ionicons name="star" size={11} color={accentHues.amber} />
                      <Text style={styles.entityCardRatingText}>
                        {item.ratingAverage > 0 ? item.ratingAverage.toFixed(1) : '5.0'} ({item.ratingCount})
                      </Text>
                      <Text style={styles.myGymDot}>·</Text>
                      <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                      <Text style={styles.entityCardLocationText} numberOfLines={1}>
                        {item.city ?? 'Bolivia'}
                      </Text>
                    </View>

                    {item.headline ? (
                      <Text style={styles.entityCardHeadline} numberOfLines={2}>
                        {item.headline}
                      </Text>
                    ) : null}

                    {item.isVerified && (
                      <View style={styles.entityVerifiedRow}>
                        <Ionicons name="checkmark-circle" size={11} color={colors.volt} />
                        <Text style={styles.entityVerifiedText}>Verificado</Text>
                      </View>
                    )}
                  </View>
                </PressableScale>
              );
            }}
          />
        )
      )}

      {/* Modal / BottomSheet de Detalle de Entidad y Reseñas App Store */}
      <Modal
        visible={Boolean(selectedEntitySlug)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedEntitySlug(null)}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />

          {/* Barra superior modal */}
          <View style={styles.modalBar}>
            <Text style={styles.modalBarTitle} numberOfLines={1}>
              {entityDetail?.name ?? 'Cargando...'}
            </Text>
            <PressableScale onPress={() => setSelectedEntitySlug(null)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={22} color={colors.text} />
            </PressableScale>
          </View>

          {loadingDetail || !entityDetail ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.volt} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Cover & Hero */}
              {entityDetail.coverUrl ? (
                <Image source={{ uri: entityDetail.coverUrl }} style={styles.modalCover} />
              ) : (
                <View style={styles.modalCoverPlaceholder} />
              )}

              <View style={styles.modalBody}>
                {/* Título y Verificado */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                  <Text style={styles.detailName}>{entityDetail.name}</Text>
                  {entityDetail.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.volt} />
                      <Text style={styles.verifiedText}>Oficial Verificado</Text>
                    </View>
                  )}
                </View>

                {entityDetail.headline ? (
                  <Text style={styles.detailHeadline}>{entityDetail.headline}</Text>
                ) : null}

                {/* Sobre nosotros */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Sobre este oferente</Text>
                  <Text style={styles.detailDescription}>{entityDetail.description}</Text>
                </View>

                {/* Sección de Planes y Servicios del Marketplace (Entidad Padre) */}
                <View style={styles.detailSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <View>
                      <Text style={styles.sectionTitle}>Planes y Suscripciones</Text>
                      <Text style={styles.sectionSubtitle}>Marketplace oficial del oferente</Text>
                    </View>
                    <View style={styles.planCountBadge}>
                      <Text style={styles.planCountText}>{entityPlans.length} disponibles</Text>
                    </View>
                  </View>

                  {loadingPlans ? (
                    <ActivityIndicator size="small" color={colors.volt} style={{ marginVertical: spacing.md }} />
                  ) : entityPlans.length === 0 ? (
                    <View style={styles.emptyPlansBox}>
                      <Ionicons name="pricetag-outline" size={24} color={colors.textMuted} />
                      <Text style={styles.emptyPlansText}>Este oferente no tiene planes publicados actualmente.</Text>
                    </View>
                  ) : (
                    <View style={{ gap: spacing.md }}>
                      {entityPlans.map((plan) => (
                        <View key={plan.id} style={styles.planCard}>
                          <View style={styles.planHeader}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 }}>
                                <View style={styles.planTypeBadge}>
                                  <Text style={styles.planTypeText}>
                                    {plan.type === 'MEMBERSHIP_PLAN' ? 'Membresía' : plan.type === 'PASS' ? 'Pase Diario' : 'Servicio'}
                                  </Text>
                                </View>
                                {plan.durationDays ? (
                                  <Text style={styles.planDurationText}>{plan.durationDays} días</Text>
                                ) : null}
                              </View>
                              <Text style={styles.planName}>{plan.name}</Text>
                            </View>
                            <View style={styles.planPriceBox}>
                              <Text style={styles.planPrice}>
                                {plan.currency} {Number(plan.currentPrice).toFixed(2)}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.planDescription}>{plan.description}</Text>

                          {plan.benefits && plan.benefits.length > 0 && (
                            <View style={styles.benefitsContainer}>
                              {plan.benefits.map((benefit, idx) => (
                                <View key={idx} style={styles.benefitRow}>
                                  <Ionicons name="checkmark-circle" size={14} color={colors.volt} />
                                  <Text style={styles.benefitText}>{benefit}</Text>
                                </View>
                              ))}
                            </View>
                          )}

                          <View style={styles.planActionsRow}>
                            <PressableScale
                              onPress={() => checkoutMutation.mutate(plan)}
                              style={styles.acquireButton}
                            >
                              <Ionicons name="qr-code-outline" size={16} color={colors.background} />
                              <Text style={styles.acquireButtonText}>Adquirir con QR</Text>
                            </PressableScale>

                            <PressableScale
                              onPress={() => {
                                Haptics.selectionAsync();
                                setSelectedPlanForComments(plan);
                                setIsPlanCommentsOpen(true);
                              }}
                              style={styles.planCommentsButton}
                            >
                              <Ionicons name="chatbubbles-outline" size={16} color={colors.text} />
                              <Text style={styles.planCommentsButtonText}>Preguntas</Text>
                            </PressableScale>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Sección de Calificación y Reseñas Estilo App Store */}
                <View style={styles.detailSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <Text style={styles.sectionTitle}>Calificaciones y Reseñas</Text>
                    <PressableScale onPress={handleOpenComposer} style={styles.writeButton}>
                      <Ionicons name="pencil" size={14} color={colors.background} />
                      <Text style={styles.writeButtonText}>Calificar</Text>
                    </PressableScale>
                  </View>

                  {/* Scorecard App Store */}
                  <View style={styles.scorecardContainer}>
                    {/* Puntuación Gigante Izquierda */}
                    <View style={styles.scoreLeft}>
                      <Text style={styles.scoreBig}>
                        {entityDetail.ratingAverage > 0 ? entityDetail.ratingAverage.toFixed(1) : '0.0'}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 2, marginVertical: spacing.xs }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= entityDetail.ratingAverage ? 'star' : 'star-outline'}
                            size={16}
                            color={accentHues.amber}
                          />
                        ))}
                      </View>
                      <Text style={styles.scoreTotal}>
                        {entityDetail.ratingCount} {entityDetail.ratingCount === 1 ? 'valoración' : 'valoraciones'}
                      </Text>
                    </View>

                    {/* Barras de Histograma Derecha */}
                    <View style={styles.scoreRight}>
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = entityDetail.ratingBreakdown?.[String(star) as '1'] || 0;
                        const pct = entityDetail.ratingCount > 0 ? (count / entityDetail.ratingCount) * 100 : 0;
                        return (
                          <View key={star} style={styles.histogramRow}>
                            <Text style={styles.starNum}>{star}★</Text>
                            <View style={styles.histogramTrack}>
                              <View style={[styles.histogramFill, { width: `${pct}%` }]} />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Reseñas de los Atletas */}
                  {loadingReviews ? (
                    <ActivityIndicator size="small" color={colors.volt} style={{ marginVertical: spacing.lg }} />
                  ) : reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
                    <View style={{ gap: spacing.md, marginTop: spacing.md }}>
                      {reviewsData.reviews.map((rev) => (
                        <View key={rev.id} style={styles.reviewItem}>
                          <View style={styles.reviewHeader}>
                            <View style={styles.reviewAuthorRow}>
                              <View style={styles.reviewAvatarCircle}>
                                <Text style={styles.reviewAvatarInitials}>
                                  {rev.author.displayName ? rev.author.displayName.slice(0, 2).toUpperCase() : 'GS'}
                                </Text>
                              </View>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={styles.reviewAuthor} numberOfLines={1}>
                                  {rev.author.displayName}
                                </Text>
                                <View style={styles.reviewMetaRow}>
                                  {rev.isVerifiedAthlete && (
                                    <View style={styles.verifiedAthletePill}>
                                      <Ionicons name="checkmark-circle" size={10} color={colors.accentInk} />
                                      <Text style={styles.verifiedAthleteText}>Atleta Verificado</Text>
                                    </View>
                                  )}
                                  <Text style={styles.reviewDate}>{rev.createdAt.slice(0, 10)}</Text>
                                </View>
                              </View>
                            </View>
                          </View>

                          {/* Estrellas */}
                          <View style={{ flexDirection: 'row', gap: 2, marginVertical: spacing.xs }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Ionicons
                                key={s}
                                name={s <= rev.rating ? 'star' : 'star-outline'}
                                size={14}
                                color={accentHues.amber}
                              />
                            ))}
                          </View>

                          <Text style={styles.reviewTitle}>{rev.title}</Text>
                          <Text style={styles.reviewBody}>{rev.body}</Text>

                          {/* Voto Útil */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.xs }}>
                            <PressableScale
                              onPress={() => helpfulMutation.mutate(rev.id)}
                              style={[styles.helpfulButton, rev.hasVotedHelpful && styles.helpfulButtonActive]}
                            >
                              <Ionicons
                                name="thumbs-up-outline"
                                size={12}
                                color={rev.hasVotedHelpful ? accentHues.amber : colors.textMuted}
                              />
                              <Text style={[styles.helpfulText, rev.hasVotedHelpful && { color: accentHues.amber }]}>
                                ¿Útil? {rev.helpfulCount > 0 ? `(${rev.helpfulCount})` : ''}
                              </Text>
                            </PressableScale>
                          </View>

                          {/* Respuesta Oficial */}
                          {rev.reply ? (
                            <View style={styles.replyBox}>
                              <Text style={styles.replyAuthor}>{rev.reply.authorName} (Oficial)</Text>
                              <Text style={styles.replyText}>{rev.reply.replyText}</Text>
                            </View>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noReviewsText}>
                      Aún no hay reseñas. ¡Sé el primero en dejar tu opinión!
                    </Text>
                  )}
                </View>
              </View>
            </ScrollView>
          )}

          {/* Modal de Composición de Reseña */}
          <Modal
            visible={isComposerOpen}
            animationType="fade"
            transparent
            onRequestClose={() => setIsComposerOpen(false)}
          >
            <View style={styles.composerOverlay}>
              <View style={styles.composerCard}>
                <Text style={styles.composerTitle}>Calificar a {entityDetail?.name}</Text>

                {/* Estrellas táctiles hápticas */}
                <View style={styles.starPicker}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <PressableScale key={s} onPress={() => handleStarPress(s)} style={{ padding: spacing.xs }}>
                      <Ionicons
                        name={s <= composerRating ? 'star' : 'star-outline'}
                        size={36}
                        color={accentHues.amber}
                      />
                    </PressableScale>
                  ))}
                </View>

                {/* Título de reseña */}
                <TextInput
                  placeholder="Título breve de tu reseña"
                  placeholderTextColor={colors.textMuted}
                  value={composerTitle}
                  onChangeText={setComposerTitle}
                  style={styles.composerInput}
                />

                {/* Comentario */}
                <TextInput
                  placeholder="Escribe tu opinión y experiencia..."
                  placeholderTextColor={colors.textMuted}
                  value={composerBody}
                  onChangeText={setComposerBody}
                  multiline
                  numberOfLines={4}
                  style={[styles.composerInput, { height: 100, textAlignVertical: 'top' }]}
                />

                <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                  <Button
                    label="Cancelar"
                    variant="ghost"
                    onPress={() => setIsComposerOpen(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Publicar"
                    loading={reviewMutation.isPending}
                    onPress={handleSubmitReview}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </View>
          </Modal>
        </View>
      </Modal>

      {/* Modal de Pago por QR Bancario y Envío de Comprobante */}
      <Modal
        visible={isPaymentModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPaymentModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />

          {/* Barra superior modal */}
          <View style={styles.modalBar}>
            <Text style={styles.modalBarTitle} numberOfLines={1}>
              Pago por QR Bancario
            </Text>
            <PressableScale onPress={() => setIsPaymentModalOpen(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={22} color={colors.text} />
            </PressableScale>
          </View>

          <ScrollView contentContainerStyle={styles.paymentModalScroll}>
            {isReceiptSubmitted ? (
              <View style={styles.successReceiptContainer}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-done" size={48} color={colors.volt} />
                </View>
                <Text style={styles.successReceiptTitle}>¡Comprobante Enviado!</Text>
                <Text style={styles.successReceiptSubtitle}>
                  Orden: {currentOrder?.orderNumber}
                </Text>

                <View style={styles.statusPillPending}>
                  <Ionicons name="time-outline" size={16} color={accentHues.amber} />
                  <Text style={styles.statusPillPendingText}>En Verificación por el Gimnasio</Text>
                </View>

                <View style={styles.successInfoCard}>
                  <Text style={styles.successInfoText}>
                    El personal de {entityDetail?.name} cotejará el pago contra su extracto bancario y activará tu suscripción de inmediato.
                  </Text>
                  <Text style={[styles.successInfoText, { marginTop: spacing.sm, color: colors.volt }]}>
                    ℹ️ Esta transacción queda guardada en tu historial y en el Chat oficial para tu respaldo y protección.
                  </Text>
                </View>

                <Button
                  label="Entendido, volver"
                  onPress={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedEntitySlug(null);
                  }}
                  style={{ width: '100%', marginTop: spacing.lg }}
                />
              </View>
            ) : (
              <View style={{ gap: spacing.md }}>
                {/* Resumen del Plan Adquirido */}
                <View style={styles.paymentPlanSummary}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentSummaryLabel}>Plan Seleccionado:</Text>
                    <Text style={styles.paymentSummaryPlanName}>{selectedPlanForPayment?.name}</Text>
                    {selectedPlanForPayment?.durationDays ? (
                      <Text style={styles.paymentSummaryDuration}>
                        {selectedPlanForPayment.durationDays} días de acceso
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.paymentSummaryAmountBox}>
                    <Text style={styles.paymentSummaryAmount}>
                      {currentOrder?.currency} {currentOrder ? Number(currentOrder.amount).toFixed(2) : ''}
                    </Text>
                  </View>
                </View>

                {/* Código de Glosa Obligatorio */}
                <View style={styles.orderCodeBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="alert-circle" size={16} color={colors.volt} />
                    <Text style={styles.orderCodeTitle}>Glosa / Concepto Obligatorio:</Text>
                  </View>
                  <View style={styles.orderCodeRow}>
                    <Text style={styles.orderCodeText}>{currentOrder?.orderNumber}</Text>
                    <PressableScale
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        notify.success('Código copiado al portapapeles');
                      }}
                      style={styles.copyButton}
                    >
                      <Ionicons name="copy-outline" size={14} color={colors.volt} />
                      <Text style={styles.copyButtonText}>Copiar</Text>
                    </PressableScale>
                  </View>
                  <Text style={styles.orderCodeHint}>
                    Pega este código exacto en el concepto de tu transferencia bancaria para que el gimnasio lo valide al instante.
                  </Text>
                </View>

                {/* QR Oficial del Gimnasio */}
                <View style={styles.qrCard}>
                  <Text style={styles.qrTitle}>Código QR de Pago</Text>
                  <Text style={styles.qrSubtitle}>Escanea desde tu app bancaria de preferencia</Text>

                  {currentPaymentConfig?.qrImageUrl ? (
                    <Image
                      source={{ uri: currentPaymentConfig.qrImageUrl }}
                      style={styles.qrImage}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Ionicons name="qr-code" size={64} color={colors.volt} />
                      <Text style={styles.qrPlaceholderText}>QR Bancario del Establecimiento</Text>
                    </View>
                  )}
                </View>

                {/* Datos Bancarios de la Cuenta */}
                <View style={styles.bankDataCard}>
                  <Text style={styles.bankDataTitle}>Datos de Transferencia Bancaria</Text>

                  <View style={styles.bankDetailRow}>
                    <Text style={styles.bankDetailLabel}>Banco:</Text>
                    <Text style={styles.bankDetailValue}>{currentPaymentConfig?.bankName ?? 'Banco Registrado'}</Text>
                  </View>

                  <View style={styles.bankDetailRow}>
                    <Text style={styles.bankDetailLabel}>Titular:</Text>
                    <Text style={styles.bankDetailValue}>
                      {currentPaymentConfig?.accountHolderName ?? entityDetail?.name}
                    </Text>
                  </View>

                  <View style={styles.bankDetailRow}>
                    <Text style={styles.bankDetailLabel}>Doc. Identidad / NIT / CI:</Text>
                    <Text style={styles.bankDetailValue}>{currentPaymentConfig?.taxId ?? 'N/D'}</Text>
                  </View>

                  <View style={styles.bankDetailRow}>
                    <Text style={styles.bankDetailLabel}>N° de Cuenta:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.bankDetailValueBold}>{currentPaymentConfig?.accountNumber ?? 'N/D'}</Text>
                      <PressableScale
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          notify.success('N° de cuenta copiado');
                        }}
                      >
                        <Ionicons name="copy-outline" size={14} color={colors.volt} />
                      </PressableScale>
                    </View>
                  </View>

                  {currentPaymentConfig?.instructions ? (
                    <View style={styles.bankInstructionsBox}>
                      <Text style={styles.bankInstructionsLabel}>Instrucciones del gym:</Text>
                      <Text style={styles.bankInstructionsText}>{currentPaymentConfig.instructions}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Formulario de Carga de Comprobante */}
                <View style={styles.submitReceiptCard}>
                  <Text style={styles.submitReceiptTitle}>Adjuntar Comprobante de Pago</Text>
                  <Text style={styles.submitReceiptSubtitle}>
                    Sube la captura de tu transferencia con el monto y número de operación
                  </Text>

                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.sm }}>
                    <PressableScale
                      disabled={uploadingReceipt}
                      onPress={handlePickReceiptImage}
                      style={styles.pickImageButton}
                    >
                      {uploadingReceipt ? (
                        <ActivityIndicator size="small" color={colors.volt} />
                      ) : (
                        <Ionicons name="image-outline" size={18} color={colors.text} />
                      )}
                      <Text style={styles.pickImageText}>
                        {uploadingReceipt ? 'Subiendo al servidor...' : 'Elegir de Galería'}
                      </Text>
                    </PressableScale>
                  </View>

                  {receiptUrl ? (
                    <View style={styles.receiptPreviewBox}>
                      <Image source={{ uri: receiptUrl }} style={styles.receiptPreviewImage} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.receiptAttachedText}>✓ Comprobante listo</Text>
                        <Text style={styles.receiptUrlText} numberOfLines={1}>
                          {receiptUrl}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  <TextInput
                    placeholder="Número o referencia de operación bancaria (ej. 839210)"
                    placeholderTextColor={colors.textMuted}
                    value={receiptReference}
                    onChangeText={setReceiptReference}
                    style={styles.composerInput}
                  />

                  <TextInput
                    placeholder="Nota adicional para el gimnasio (opcional)"
                    placeholderTextColor={colors.textMuted}
                    value={athleteNotes}
                    onChangeText={setAthleteNotes}
                    style={styles.composerInput}
                  />

                  <Button
                    label="Subir Comprobante y Enviar al Gym"
                    loading={submitReceiptMutation.isPending}
                    onPress={handleSubmitReceipt}
                    style={{ marginTop: spacing.sm }}
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de Preguntas y Comentarios del Plan (Mismo Sistema Community) */}
      <Modal
        visible={isPlanCommentsOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsPlanCommentsOpen(false)}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />

          {/* Barra superior modal */}
          <View style={styles.modalBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalBarTitle} numberOfLines={1}>
                Preguntas: {selectedPlanForComments?.name}
              </Text>
              <Text style={styles.modalBarSubtitle}>Sistema de comentarios de producto</Text>
            </View>
            <PressableScale onPress={() => setIsPlanCommentsOpen(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={22} color={colors.text} />
            </PressableScale>
          </View>

          <ScrollView contentContainerStyle={styles.planCommentsScroll}>
            {loadingPlanComments ? (
              <ActivityIndicator size="small" color={colors.volt} style={{ marginVertical: spacing.xl }} />
            ) : planCommentsData?.items && planCommentsData.items.length > 0 ? (
              <View style={{ gap: spacing.md }}>
                {planCommentsData.items.map((comment) => (
                  <View key={comment.id} style={styles.planCommentCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={styles.planCommentAuthor}>{comment.autor.nombre}</Text>
                      <Text style={styles.planCommentDate}>
                        {typeof comment.creadoEn === 'string' ? comment.creadoEn.slice(0, 10) : 'Hoy'}
                      </Text>
                    </View>
                    <Text style={styles.planCommentText}>{comment.texto}</Text>

                    {comment.respuestas && comment.respuestas.length > 0 && (
                      <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
                        {comment.respuestas.map((reply) => (
                          <View key={reply.id} style={styles.planCommentReply}>
                            <Text style={styles.planCommentReplyAuthor}>{reply.autor.nombre} (Respuesta):</Text>
                            <Text style={styles.planCommentReplyText}>{reply.texto}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyCommentsBox}>
                <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
                <Text style={styles.emptyCommentsText}>
                  Aún no hay preguntas sobre este plan. ¡Escribe la primera!
                </Text>
              </View>
            )}

            {/* Input para agregar pregunta al plan */}
            <View style={styles.addPlanCommentBox}>
              <TextInput
                placeholder="Escribe tu consulta sobre este plan..."
                placeholderTextColor={colors.textMuted}
                value={newPlanCommentText}
                onChangeText={setNewPlanCommentText}
                multiline
                numberOfLines={3}
                style={[styles.composerInput, { height: 80, textAlignVertical: 'top' }]}
              />
              <Button
                label="Enviar Pregunta"
                loading={planCommentMutation.isPending}
                onPress={handleSendPlanComment}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: semibold,
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.lg,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSizes.sm,
  },
  pillsWrapper: {
    marginVertical: spacing.sm,
  },
  pillsScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSelected: {
    backgroundColor: alpha(colors.volt, 0.16),
    borderColor: colors.volt,
    borderWidth: 1.5,
  },
  pillText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  pillTextSelected: {
    color: colors.text,
    fontWeight: '800',
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.xl,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  segmentButtonActive: {
    backgroundColor: colors.volt,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  segmentTextActive: {
    color: ink.black,
    fontWeight: '800',
  },
  gridContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  myGymSpotlightCard: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.volt,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  myGymCoverWrapper: {
    height: 110,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.surfaceLow,
  },
  myGymCover: {
    width: '100%',
    height: '100%',
  },
  myGymGradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: alpha(darkSurfaces.abyss, 0.55),
  },
  myGymTopBadges: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  myGymVoltBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.volt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  myGymVoltBadgeText: {
    color: ink.black,
    fontSize: fontSizes.micro,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  myGymActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: alpha(darkSurfaces.abyss, 0.75),
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: alpha(colors.volt, 0.4),
  },
  myGymActiveBadgeText: {
    color: colors.accentInk,
    fontSize: fontSizes.micro,
    fontWeight: semibold,
  },
  myGymBody: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  myGymInfoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  myGymLogo: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.border,
  },
  myGymName: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '800',
  },
  myGymHeadline: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: 1,
  },
  myGymRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  myGymRatingText: {
    color: colors.text,
    fontSize: fontSizes.micro,
    fontWeight: semibold,
  },
  myGymDot: {
    color: colors.textMuted,
    fontSize: fontSizes.micro,
  },
  myGymLocationText: {
    color: colors.textMuted,
    fontSize: fontSizes.micro,
  },
  myGymActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 4,
  },
  myGymCtaPrimary: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.volt,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  myGymCtaPrimaryText: {
    color: ink.black,
    fontSize: fontSizes.xs,
    fontWeight: '800',
  },
  myGymCtaSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLow,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  myGymCtaSecondaryText: {
    color: colors.text,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  marketCard: {
    flex: 1,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  marketCardImageWrapper: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceLow,
    position: 'relative',
  },
  marketCardImage: {
    width: '100%',
    height: '100%',
  },
  marketCardTypeTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: alpha(darkSurfaces.abyss, 0.75),
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: alpha(ink.white, 0.15),
  },
  marketCardTypeTagText: {
    color: colors.text,
    fontSize: fontSizes.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  marketCardMyGymTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.volt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  marketCardMyGymTagText: {
    color: ink.black,
    fontSize: fontSizes.micro,
    fontWeight: '800',
  },
  marketCardContent: {
    padding: spacing.sm,
    gap: 3,
  },
  marketCardPrice: {
    color: colors.accentInk,
    fontSize: fontSizes.md,
    fontWeight: '800',
  },
  marketCardTitle: {
    color: colors.text,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
    lineHeight: 16,
    minHeight: 32,
  },
  marketCardSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  marketCardSellerName: {
    color: colors.textMuted,
    fontSize: fontSizes.micro,
    fontWeight: semibold,
    flex: 1,
  },
  marketCardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  marketCardLocationText: {
    color: colors.textMuted,
    fontSize: fontSizes.micro,
  },
  marketCardBuyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: alpha(colors.volt, 0.16),
    borderWidth: 1,
    borderColor: alpha(colors.volt, 0.35),
    paddingVertical: 6,
    borderRadius: radii.md,
    marginTop: 4,
  },
  marketCardBuyBtnText: {
    color: colors.accentInk,
    fontSize: fontSizes.micro,
    fontWeight: '700',
  },
  entityMarketCard: {
    flex: 1,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  entityMarketCardMyGym: {
    borderColor: colors.volt,
    borderWidth: 1.5,
  },
  entityCardCoverWrapper: {
    width: '100%',
    height: 95,
    backgroundColor: colors.surfaceLow,
    position: 'relative',
  },
  entityCardCover: {
    width: '100%',
    height: '100%',
  },
  entityCardTypeBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: alpha(darkSurfaces.abyss, 0.75),
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: alpha(ink.white, 0.15),
  },
  entityCardTypeBadgeText: {
    color: colors.text,
    fontSize: fontSizes.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  entityCardLogoOverlap: {
    position: 'absolute',
    bottom: -16,
    left: 8,
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 2,
    borderColor: colors.surfaceHigh,
  },
  logoInitialsSmall: {
    color: colors.volt,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  entityCardBody: {
    padding: spacing.sm,
    paddingTop: 18,
    gap: 2,
  },
  entityCardName: {
    color: colors.text,
    fontSize: fontSizes.xs,
    fontWeight: '800',
  },
  entityCardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  entityCardRatingText: {
    color: colors.text,
    fontSize: fontSizes.micro,
    fontWeight: semibold,
  },
  entityCardLocationText: {
    color: colors.textMuted,
    fontSize: fontSizes.micro,
  },
  entityCardHeadline: {
    color: colors.textMuted,
    fontSize: fontSizes.micro,
    marginTop: 2,
    lineHeight: 14,
  },
  entityVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  entityVerifiedText: {
    color: colors.volt,
    fontSize: fontSizes.micro,
    fontWeight: semibold,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  entityCard: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardLogo: {
    width: 60,
    height: 60,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceLow,
  },
  cardLogoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoInitials: {
    color: colors.volt,
    fontSize: fontSizes.lg,
    fontWeight: semibold,
  },
  cardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 2,
  },
  categoryBadge: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textTransform: 'uppercase',
    fontWeight: semibold,
    flexShrink: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: alpha(accentHues.mint, 0.12),
    borderWidth: 1,
    borderColor: alpha(accentHues.mint, 0.35),
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  verifiedText: {
    color: colors.volt,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  cardName: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: semibold,
  },
  cardHeadline: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: colors.text,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  ratingCount: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalBarTitle: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: semibold,
    flex: 1,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalScroll: {
    paddingBottom: spacing['2xl'],
  },
  modalCover: {
    width: '100%',
    height: 180,
  },
  modalCoverPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: colors.surfaceHigh,
  },
  modalBody: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  detailName: {
    color: colors.text,
    fontSize: fontSizes['2xl'],
    fontWeight: semibold,
  },
  detailHeadline: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
  detailSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: semibold,
  },
  detailDescription: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    lineHeight: 22,
  },
  writeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.volt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  writeButtonText: {
    color: colors.background,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  scorecardContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreLeft: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingRight: spacing.sm,
  },
  scoreBig: {
    color: colors.text,
    fontSize: heroNumberFontSize,
    fontWeight: '900',
  },
  scoreTotal: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  scoreRight: {
    flex: 1.5,
    justifyContent: 'center',
    paddingLeft: spacing.md,
    gap: 4,
  },
  histogramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starNum: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    width: 22,
    textAlign: 'right',
  },
  histogramTrack: {
    flex: 1,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceLow,
    overflow: 'hidden',
  },
  histogramFill: {
    height: '100%',
    backgroundColor: accentHues.amber,
    borderRadius: radii.full,
  },
  reviewItem: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  reviewHeader: {
    marginBottom: spacing.xs,
  },
  reviewAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: alpha(colors.volt, 0.16),
    borderWidth: 1,
    borderColor: alpha(colors.volt, 0.35),
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarInitials: {
    color: colors.accentInk,
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  reviewAuthor: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: semibold,
  },
  verifiedAthletePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: alpha(colors.volt, 0.16),
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: alpha(colors.volt, 0.35),
  },
  verifiedAthleteText: {
    color: colors.accentInk,
    fontSize: fontSizes.micro,
    fontWeight: semibold,
  },
  reviewDate: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  reviewTitle: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: semibold,
  },
  reviewBody: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    lineHeight: 18,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpfulButtonActive: {
    borderColor: accentHues.amber,
    backgroundColor: alpha(accentHues.amber, 0.1),
  },
  helpfulText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  replyBox: {
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceLow,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.volt,
  },
  replyAuthor: {
    color: colors.volt,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  replyText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  noReviewsText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  composerOverlay: {
    flex: 1,
    backgroundColor: alpha(ink.black, 0.7),
    justifyContent: 'center',
    padding: spacing.lg,
  },
  composerCard: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  composerTitle: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: semibold,
    textAlign: 'center',
  },
  starPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  composerInput: {
    backgroundColor: colors.surfaceLow,
    borderRadius: radii.lg,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSizes.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  planCountBadge: {
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCountText: {
    color: colors.volt,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  emptyPlansBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  emptyPlansText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  planTypeBadge: {
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  planTypeText: {
    color: colors.textMuted,
    fontSize: fontSizes.micro,
    fontWeight: semibold,
    textTransform: 'uppercase',
  },
  planDurationText: {
    color: colors.volt,
    fontSize: fontSizes.micro,
    fontWeight: semibold,
  },
  planName: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: semibold,
  },
  planPriceBox: {
    backgroundColor: alpha(colors.volt, 0.14),
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: alpha(colors.volt, 0.3),
    alignItems: 'flex-end',
  },
  planPrice: {
    color: colors.accentInk,
    fontSize: fontSizes.md,
    fontWeight: '800',
  },
  planDescription: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    lineHeight: 18,
  },
  benefitsContainer: {
    gap: 4,
    paddingVertical: spacing.xs,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benefitText: {
    color: colors.text,
    fontSize: fontSizes.xs,
  },
  planActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  acquireButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.volt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  acquireButtonText: {
    color: colors.background,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  planCommentsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.surfaceLow,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCommentsButtonText: {
    color: colors.text,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  paymentModalScroll: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  successReceiptContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: alpha(colors.volt, 0.16),
    borderWidth: 2,
    borderColor: colors.volt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  successReceiptTitle: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: semibold,
    textAlign: 'center',
  },
  successReceiptSubtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  statusPillPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: alpha(accentHues.amber, 0.15),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: accentHues.amber,
  },
  statusPillPendingText: {
    color: accentHues.amber,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  successInfoCard: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  successInfoText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  paymentPlanSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  paymentSummaryLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  paymentSummaryPlanName: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: semibold,
    marginTop: 2,
  },
  paymentSummaryDuration: {
    color: colors.volt,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  paymentSummaryAmountBox: {
    backgroundColor: alpha(colors.volt, 0.14),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: alpha(colors.volt, 0.3),
  },
  paymentSummaryAmount: {
    color: colors.accentInk,
    fontSize: fontSizes.lg,
    fontWeight: '800',
  },
  orderCodeBox: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.volt,
    gap: spacing.xs,
  },
  orderCodeTitle: {
    color: colors.volt,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  orderCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceLow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginVertical: 4,
  },
  orderCodeText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  copyButtonText: {
    color: colors.volt,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  orderCodeHint: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    lineHeight: 16,
  },
  qrCard: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  qrTitle: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: semibold,
  },
  qrSubtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginBottom: spacing.xs,
  },
  qrImage: {
    width: 220,
    height: 220,
    borderRadius: radii.lg,
    backgroundColor: ink.white,
  },
  qrPlaceholder: {
    width: 220,
    height: 220,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrPlaceholderText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  bankDataCard: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  bankDataTitle: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: semibold,
    marginBottom: 4,
  },
  bankDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  bankDetailLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  bankDetailValue: {
    color: colors.text,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  bankDetailValueBold: {
    color: colors.volt,
    fontSize: fontSizes.sm,
    fontWeight: '800',
  },
  bankInstructionsBox: {
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceLow,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.volt,
  },
  bankInstructionsLabel: {
    color: colors.volt,
    fontSize: fontSizes.micro,
    fontWeight: semibold,
  },
  bankInstructionsText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  submitReceiptCard: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  submitReceiptTitle: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: semibold,
  },
  submitReceiptSubtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  pickImageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLow,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickImageText: {
    color: colors.text,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  receiptPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceLow,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.volt,
  },
  receiptPreviewImage: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceHigh,
  },
  receiptAttachedText: {
    color: colors.volt,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  receiptUrlText: {
    color: colors.textMuted,
    fontSize: fontSizes.micro,
  },
  modalBarSubtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  planCommentsScroll: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  planCommentCard: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  planCommentAuthor: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: semibold,
  },
  planCommentDate: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
  },
  planCommentText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    lineHeight: 18,
  },
  planCommentReply: {
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceLow,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.volt,
  },
  planCommentReplyAuthor: {
    color: colors.volt,
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  },
  planCommentReplyText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  emptyCommentsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyCommentsText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'center',
  },
  addPlanCommentBox: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
});
