/**
 * Shared query layer.
 *
 * `queryKeys` is the single source of truth for TanStack Query cache keys so the
 * web and mobile clients read and invalidate the *same* cache entries — a shared
 * contract, not per-app strings.
 *
 * NOTE: framework-coupled hooks (useQuery/useMutation wrappers) are intentionally
 * NOT exported here. The mobile app is `nohoist`ed, so a React/react-query
 * instance imported from this hoisted package would differ from the app's own
 * instance and trigger "invalid hook call". Framework hooks therefore live inside
 * each app until React/react-query are deduped at the bundler level (Metro
 * `resolver.extraNodeModules`). See docs/mobile/registro-de-decisiones.md (ADR-008).
 */
export * from './query-keys';
