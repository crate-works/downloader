import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '#/components/ui/button.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import type { RangeCheckboxClick } from '#/hooks/useRangeSelect.ts';
import type { Entity } from '#/shared/types/index.ts';
import { useSelectionStore } from '#/store/selectionStore.ts';
import { FileList } from './FileList.tsx';

type ItemRowProps = {
  item: Entity;
  onCheckboxClick?: RangeCheckboxClick;
};

export const ItemRow = ({ item, onCheckboxClick }: ItemRowProps) => {
  const { expandedItems, pendingItems, selectItem, deselectItem, toggleItemExpand, getItemSelectionState } = useSelectionStore();

  const selectionState = getItemSelectionState(item.id);
  const isExpanded = expandedItems.has(item.id);
  const isPending = pendingItems.has(item.id);

  const handleCheckboxChange = () => {
    if (selectionState === 'none') {
      selectItem(item.id);
    } else {
      deselectItem(item.id);
    }
  };

  const handleExpandClick = () => {
    toggleItemExpand(item.id);
  };

  return (
    <div className="border rounded-lg bg-background">
      <div className="flex select-none items-center gap-3 p-2 hover:bg-muted/50">
        <Checkbox
          checked={selectionState === 'full'}
          indeterminate={selectionState === 'partial'}
          onCheckedChange={handleCheckboxChange}
          onClick={(e) => onCheckboxClick?.(item.id, e, selectionState === 'none')}
          aria-label={`Select ${item.name}`}
        />

        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleExpandClick} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate flex items-center gap-2">
            {item.name}
            <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">Item</span>
            {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="text-sm italic">{item.id}</div>
          {item.description && <div className="text-xs text-muted-foreground truncate">{item.description}</div>}
        </div>
      </div>

      {isExpanded && (
        <div className="pl-12 pr-2 pb-2">
          <FileList itemId={item.id} />
        </div>
      )}
    </div>
  );
};
