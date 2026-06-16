import { useMemo, useState } from 'react';
import { LoadingSpinner } from '#/components/common/LoadingSpinner.tsx';
import { SortPicker } from '#/components/common/SortPicker.tsx';
import { useItems } from '#/hooks/useItems.ts';
import { DEFAULT_ITEM_SORT, ITEM_SORT_OPTIONS, type ItemSortKey, sortItems } from '#/lib/sort.ts';
import { ItemRow } from './ItemRow.tsx';

type ItemListProps = {
  collectionId: string;
};

export const ItemList = ({ collectionId }: ItemListProps) => {
  const { data, isLoading, error } = useItems(collectionId, true);
  const [sort, setSort] = useState<ItemSortKey>(DEFAULT_ITEM_SORT);
  const sortedItems = useMemo(() => sortItems(data ?? [], sort), [data, sort]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-sm text-muted-foreground">Loading items...</span>
      </div>
    );
  }

  if (error) {
    return <div className="py-4 text-sm text-destructive">Error loading items: {error.message}</div>;
  }

  if (!data?.length) {
    return <div className="py-4 text-sm text-muted-foreground">No items found in this collection.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-sm text-muted-foreground">
          {data.length} item{data.length !== 1 ? 's' : ''}
        </span>
        {data.length > 1 && <SortPicker value={sort} options={ITEM_SORT_OPTIONS} onChange={setSort} />}
      </div>
      {sortedItems.map((item) => (
        <ItemRow key={item.id} item={item} />
      ))}
    </div>
  );
};
