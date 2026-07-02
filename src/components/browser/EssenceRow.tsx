import { EntityBadge } from '#/components/common/EntityBadge.tsx';
import { LoadingSpinner } from '#/components/common/LoadingSpinner.tsx';
import { useFiles } from '#/hooks/useFiles.ts';
import type { RangeCheckboxClick } from '#/hooks/useRangeSelect.ts';
import type { SearchEntity } from '#/shared/types/index.ts';
import { useSelectionStore } from '#/store/selectionStore.ts';
import { FileRow } from './FileRow.tsx';

type EssenceRowProps = {
  essence: SearchEntity;
  onCheckboxClick?: RangeCheckboxClick;
};

// A search result that is a MediaObject (essence) — i.e. a single media file
// surfaced directly by search rather than by browsing into its item. The search
// entity carries no file details (filename/size/mediaType), so we resolve the
// full RoCrateFile from its parent item's file list (shared, cached fetch) and
// then render it with the same selection/quality/access behaviour as any file.
export const EssenceRow = ({ essence, onCheckboxClick }: EssenceRowProps) => {
  const itemId = essence.memberOf?.id;
  const { isLoading } = useFiles(itemId ?? '', !!itemId);
  const { fileMetadata, isFileIncluded } = useSelectionStore();

  const file = fileMetadata.get(essence.id);

  // Resolved: render the real file row with an Essence badge. Quality-tier
  // filtering is applied by the parent (as FileList does), so archival essences
  // are shown-but-disabled, exactly like a file browsed inside its item.
  if (file) {
    return (
      <div className="rounded-lg border bg-background px-2 py-1">
        <FileRow file={file} disabled={!isFileIncluded(file)} onCheckboxClick={onCheckboxClick} badge={<EntityBadge kind="essence" />} />
      </div>
    );
  }

  // Still resolving the parent item's files.
  if (itemId && isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-background p-3 text-sm text-muted-foreground">
        <LoadingSpinner size="sm" />
        <span className="truncate">{essence.name}</span>
        <EntityBadge kind="essence" />
      </div>
    );
  }

  // Unresolvable (no parent item, fetch failed, or no matching file): show a
  // non-selectable row rather than silently dropping a real search result.
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="truncate">{essence.name}</span>
        <EntityBadge kind="essence" />
      </div>
      <div className="text-sm italic text-muted-foreground">{essence.id}</div>
      {essence.description && <div className="mt-1 text-xs text-muted-foreground">{essence.description}</div>}
    </div>
  );
};
