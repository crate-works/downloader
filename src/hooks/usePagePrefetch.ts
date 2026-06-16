import { useQueryClient } from '@tanstack/react-query';
import pLimit from 'p-limit';
import { useEffect, useState } from 'react';
import { isCollection, isObject } from '#/shared/types/entity.ts';
import type { Entity, RoCrateFile } from '#/shared/types/index.ts';
import { useSelectionStore } from '#/store/selectionStore.ts';
import { filesQueryOptions, itemsQueryOptions } from './queries.ts';

const CONCURRENCY = 5;

// Safety ceiling: "current page" bounds entities (50), but each collection can
// transitively resolve to thousands of items/files. Stop and surface a notice
// rather than firing an unbounded number of requests.
const MAX_ITEMS = 20_000;

type PrefetchPhase = 'idle' | 'items' | 'files' | 'done';

export type PagePrefetchState = {
  phase: PrefetchPhase;
  loadedItems: number;
  totalItems: number;
  fileIds: Set<string>;
  failedCount: number;
  capped: boolean;
};

const INITIAL: PagePrefetchState = {
  phase: 'idle',
  loadedItems: 0,
  totalItems: 0,
  fileIds: new Set(),
  failedCount: 0,
  capped: false,
};

// Minimal shape needed to drive prefetching — satisfied by both the search
// result entities (SearchEntity) and the richer Entity returned by the API.
type PrefetchEntity = { id: string; entityType: string };

// Eagerly resolve every item + file for the current page of search results,
// warming the React Query cache (same keys the lazy hooks use) and the
// selection store. Returns the page-scoped set of file IDs so the filter bar
// can derive its mimetypes without reading the global, append-only metadata map.
export const usePagePrefetch = (entities: PrefetchEntity[] | undefined): PagePrefetchState => {
  const queryClient = useQueryClient();
  const { registerItemsForCollection, registerFilesForItem, addFileMetadata } = useSelectionStore();
  const [state, setState] = useState<PagePrefetchState>(INITIAL);

  // Re-run whenever the set of entities on the page changes.
  const signature = entities?.map((entity) => entity.id).join(',') ?? '';

  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the entity-id `signature` so the prefetch re-runs only when the page's entities change, not on every render (entities is a fresh array each render).
  useEffect(() => {
    if (!entities || entities.length === 0) {
      setState(INITIAL);
      return;
    }

    let cancelled = false;
    const limit = pLimit(CONCURRENCY);
    const fileIds = new Set<string>();
    let failedCount = 0;
    let capped = false;

    setState({ ...INITIAL, phase: 'items' });

    const resolveItems = async (): Promise<PrefetchEntity[]> => {
      const collections = entities.filter(isCollection);
      const directItems = entities.filter(isObject);

      const nested = await Promise.all(
        collections.map((collection) =>
          limit(async () => {
            if (cancelled) {
              return [] as Entity[];
            }

            try {
              const items = await queryClient.ensureQueryData(itemsQueryOptions(collection.id));

              if (cancelled) {
                return [] as Entity[];
              }

              registerItemsForCollection(collection.id, items);
              return items;
            } catch {
              failedCount += 1;
              return [] as Entity[];
            }
          }),
        ),
      );

      return [...directItems, ...nested.flat()];
    };

    const resolveFiles = async (items: PrefetchEntity[]) => {
      let scheduled = items;
      if (scheduled.length > MAX_ITEMS) {
        scheduled = scheduled.slice(0, MAX_ITEMS);
        capped = true;
      }

      if (cancelled) {
        return;
      }

      setState((prev) => ({ ...prev, phase: 'files', totalItems: scheduled.length, capped }));

      await Promise.all(
        scheduled.map((item) =>
          limit(async () => {
            if (cancelled) {
              return;
            }

            try {
              const files = await queryClient.ensureQueryData<RoCrateFile[]>(filesQueryOptions(item.id));

              if (cancelled) {
                return;
              }

              addFileMetadata(files);
              registerFilesForItem(item.id, files);
              for (const file of files) {
                fileIds.add(file.id);
              }
            } catch {
              failedCount += 1;
            } finally {
              if (!cancelled) {
                setState((prev) => ({
                  ...prev,
                  loadedItems: prev.loadedItems + 1,
                  fileIds: new Set(fileIds),
                  failedCount,
                }));
              }
            }
          }),
        ),
      );
    };

    (async () => {
      const items = await resolveItems();
      if (cancelled) {
        return;
      }
      await resolveFiles(items);
      if (!cancelled) {
        setState((prev) => ({ ...prev, phase: 'done', fileIds: new Set(fileIds), failedCount, capped }));
      }
    })();

    return () => {
      cancelled = true;
      limit.clearQueue();
    };
  }, [signature, queryClient, registerItemsForCollection, registerFilesForItem, addFileMetadata]);

  return state;
};
