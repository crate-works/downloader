import { getItemsInCollection } from '#/server/functions/collections.ts';
import { getFilesInItem } from '#/server/functions/items.ts';

// Shared query descriptors so the lazy hooks (useItems/useFiles) and the eager
// prefetch (usePagePrefetch) read and write the *same* React Query cache entries.
// Keeping the keys and staleTime in one place is what lets a prefetched page
// satisfy the later lazy reads without a refetch.
const STALE_TIME = 5 * 60 * 1000;

export const itemsQueryOptions = (collectionId: string) => ({
  queryKey: ['items', collectionId] as const,
  queryFn: () => getItemsInCollection({ data: { collectionId } }),
  staleTime: STALE_TIME,
});

export const filesQueryOptions = (itemId: string) => ({
  queryKey: ['files', itemId] as const,
  queryFn: () => getFilesInItem({ data: { itemId } }),
  staleTime: STALE_TIME,
});
