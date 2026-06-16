import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { LoadingSpinner } from '#/components/common/LoadingSpinner.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { useEntity } from '#/hooks/useEntity.ts';
import type { RangeCheckboxClick } from '#/hooks/useRangeSelect.ts';
import type { Entity } from '#/shared/types/index.ts';
import { useSelectionStore } from '#/store/selectionStore.ts';
import { ItemList } from './ItemList.tsx';

type CollectionItemProps = {
  collectionId: string;
  collection?: Entity | undefined;
  onCheckboxClick?: RangeCheckboxClick;
};

export const CollectionItem = ({ collectionId, collection, onCheckboxClick }: CollectionItemProps) => {
  const { expandedCollections, pendingCollections, selectCollection, deselectCollection, toggleCollectionExpand, getCollectionSelectionState } =
    useSelectionStore();

  const { data: fetchedEntity, isLoading: isEntityLoading } = useEntity(collection ? undefined : collectionId);

  const entity = collection ?? fetchedEntity;
  const collectionName = entity?.name ?? collectionId;
  const collectionDescription = entity?.description;

  const selectionState = getCollectionSelectionState(collectionId);
  const isExpanded = expandedCollections.has(collectionId);
  const isPending = pendingCollections.has(collectionId);

  const handleCheckboxChange = () => {
    if (selectionState === 'none') {
      selectCollection(collectionId);
    } else {
      deselectCollection(collectionId);
    }
  };

  const handleExpandClick = () => {
    toggleCollectionExpand(collectionId);
  };

  return (
    <div className="border rounded-lg">
      <div className="flex select-none items-center gap-3 p-3 hover:bg-muted/50">
        <Checkbox
          checked={selectionState === 'full'}
          indeterminate={selectionState === 'partial'}
          onCheckedChange={handleCheckboxChange}
          onClick={(e) => onCheckboxClick?.(collectionId, e, selectionState === 'none')}
          aria-label={`Select ${collectionName}`}
        />

        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExpandClick} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-2">
            {isEntityLoading ? <LoadingSpinner size="sm" /> : collectionName}
            <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">Collection</span>
            {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="italic">{collectionId}</div>
          {collectionDescription && <div className="text-sm text-muted-foreground truncate">{collectionDescription}</div>}
        </div>
      </div>

      {isExpanded && (
        <div className="pl-12 pr-3 pb-3">
          <ItemList collectionId={collectionId} />
        </div>
      )}
    </div>
  );
};
