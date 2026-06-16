import { useCallback, useMemo } from 'react';
import { CollectionItem } from '#/components/browser/CollectionItem.tsx';
import { ItemRow } from '#/components/browser/ItemRow.tsx';
import { MimeTypeFilterBar } from '#/components/browser/MimeTypeFilterBar.tsx';
import { LoadingSpinner } from '#/components/common/LoadingSpinner.tsx';
import { SortPicker } from '#/components/common/SortPicker.tsx';
import { ActiveFilterBadges } from '#/components/search/ActiveFilterBadges.tsx';
import { FacetPanel } from '#/components/search/FacetPanel.tsx';
import { PageSizePicker } from '#/components/search/PageSizePicker.tsx';
import { Pagination } from '#/components/ui/pagination.tsx';
import { usePagePrefetch } from '#/hooks/usePagePrefetch.ts';
import { useRangeSelect } from '#/hooks/useRangeSelect.ts';
import { useSearch } from '#/hooks/useSearch.ts';
import { parseSearchSort, SEARCH_SORT_OPTIONS, type SearchSortKey } from '#/lib/sort.ts';
import { type Entity, isCollection, isObject } from '#/shared/types/entity.ts';
import type { FacetFilters } from '#/shared/types/search.ts';
import { useSelectionStore } from '#/store/selectionStore.ts';

type SearchResultsProps = {
  query: string;
  page: number;
  pageSize: number;
  sort: SearchSortKey;
  filters?: FacetFilters | undefined;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSortChange: (sort: SearchSortKey) => void;
  onFiltersChange: (filters: FacetFilters) => void;
};

export const SearchResults = ({ query, page, pageSize, sort, filters, onPageChange, onPageSizeChange, onSortChange, onFiltersChange }: SearchResultsProps) => {
  const offset = (page - 1) * pageSize;

  const { data, isLoading, isFetching, isError, error } = useSearch({
    query,
    filters,
    limit: pageSize,
    offset,
    ...parseSearchSort(sort),
  });

  const activeFilters = filters ?? {};
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  const prefetch = usePagePrefetch(data?.entities);

  const { selectCollection, deselectCollection, selectItem, deselectItem } = useSelectionStore();

  // Map each selectable result to its kind so a shift-click range can dispatch
  // the right select/deselect action per row (results may mix collections and
  // items). Other entity kinds are not selectable and stay out of the range.
  const entityKindById = useMemo(() => {
    const kinds = new Map<string, 'collection' | 'item'>();
    for (const entity of data?.entities ?? []) {
      if (isCollection(entity)) {
        kinds.set(entity.id, 'collection');
      } else if (isObject(entity)) {
        kinds.set(entity.id, 'item');
      }
    }
    return kinds;
  }, [data?.entities]);

  const orderedResultIds = useMemo(
    () => (data?.entities ?? []).filter((entity) => entityKindById.has(entity.id)).map((entity) => entity.id),
    [data?.entities, entityKindById],
  );

  const handleCheckboxClick = useRangeSelect(
    orderedResultIds,
    useCallback(
      (ids: string[], shouldSelect: boolean) => {
        for (const id of ids) {
          const isCollectionId = entityKindById.get(id) === 'collection';
          const select = isCollectionId ? selectCollection : selectItem;
          const deselect = isCollectionId ? deselectCollection : deselectItem;
          (shouldSelect ? select : deselect)(id);
        }
      },
      [entityKindById, selectCollection, deselectCollection, selectItem, deselectItem],
    ),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
        <p className="font-medium">Failed to search</p>
        <p className="text-sm">{error instanceof Error ? error.message : 'An error occurred'}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <aside className="hidden w-64 shrink-0 lg:block">
        <FacetPanel facets={data?.facets} filters={activeFilters} isFetching={isFetching} onFiltersChange={onFiltersChange} />
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <ActiveFilterBadges filters={activeFilters} onFiltersChange={onFiltersChange} />

        {data && data.entities.length > 0 && <MimeTypeFilterBar prefetch={prefetch} />}

        {!data || data.entities.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm">Try a different search term or remove some filters</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Found {data.total} result{data.total !== 1 ? 's' : ''} in {data.searchTime}ms
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <SortPicker value={sort} options={SEARCH_SORT_OPTIONS} onChange={onSortChange} />
                <PageSizePicker value={pageSize} onChange={onPageSizeChange} />
              </div>
            </div>

            <div className="space-y-2">
              {data.entities.map((entity) => {
                if (isCollection(entity)) {
                  return <CollectionItem key={entity.id} collectionId={entity.id} onCheckboxClick={handleCheckboxClick} />;
                }

                if (isObject(entity)) {
                  return <ItemRow key={entity.id} item={entity as unknown as Entity} onCheckboxClick={handleCheckboxClick} />;
                }

                return (
                  <div key={entity.id} className="rounded-lg border p-3">
                    <div className="font-medium">{entity.name}</div>
                    <div className="text-sm italic text-muted-foreground">{entity.id}</div>
                    {entity.description && <div className="mt-1 text-sm text-muted-foreground">{entity.description}</div>}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="pt-4">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
