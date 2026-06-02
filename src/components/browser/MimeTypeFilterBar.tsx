import { Check, Loader2, Minus } from 'lucide-react';
import { useMemo } from 'react';
import type { PagePrefetchState } from '#/hooks/usePagePrefetch.ts';
import { cn } from '#/lib/utils.ts';
import { useSelectionStore } from '#/store/selectionStore.ts';

type MimeTypeGroup = {
  mediaType: string;
  fileIds: string[];
};

type MimeTypeFilterBarProps = {
  prefetch: PagePrefetchState;
};

export const MimeTypeFilterBar = ({ prefetch }: MimeTypeFilterBarProps) => {
  const { fileMetadata, selectedFiles, isFileIncluded, setFilesSelected } = useSelectionStore();
  const { phase, loadedItems, totalItems, fileIds, failedCount, capped } = prefetch;

  // Page structure: which mimetypes exist and which files belong to each.
  // Rebuilds only as files stream in, not when the selection changes.
  const groups = useMemo<MimeTypeGroup[]>(() => {
    const byType = new Map<string, MimeTypeGroup>();

    for (const fileId of fileIds) {
      const file = fileMetadata.get(fileId);
      if (!file || !isFileIncluded(file)) {
        continue;
      }

      let group = byType.get(file.mediaType);
      if (!group) {
        group = { mediaType: file.mediaType, fileIds: [] };
        byType.set(file.mediaType, group);
      }

      group.fileIds.push(file.id);
    }

    return [...byType.values()].sort((a, b) => a.mediaType.localeCompare(b.mediaType));
  }, [fileIds, fileMetadata, isFileIncluded]);

  // Selection-derived counts: recomputed on every selection toggle, but only
  // the cheap count layer — no map rebuild or re-sort.
  const groupsWithSelection = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        selectedCount: group.fileIds.reduce((count, id) => (selectedFiles.has(id) ? count + 1 : count), 0),
      })),
    [groups, selectedFiles],
  );

  if (phase === 'idle') {
    return null;
  }

  const isIndexing = phase === 'items' || phase === 'files';

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <span>Filter by file type</span>
        {isIndexing && (
          <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {phase === 'items' ? 'Indexing items…' : `Indexing files… ${loadedItems}/${totalItems}`}
          </span>
        )}
      </div>

      {phase === 'done' && groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">No downloadable files on this page.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {groupsWithSelection.map((group) => {
            const allSelected = group.selectedCount === group.fileIds.length;
            const someSelected = group.selectedCount > 0 && !allSelected;

            return (
              <button
                key={group.mediaType}
                type="button"
                aria-pressed={allSelected}
                onClick={() => setFilesSelected(group.fileIds, !allSelected)}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors hover:bg-muted',
                  (allSelected || someSelected) && 'border-primary bg-primary/10',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                    allSelected || someSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50',
                  )}
                >
                  {allSelected && <Check className="h-3 w-3" />}
                  {someSelected && <Minus className="h-3 w-3" />}
                </span>
                <span className="font-mono">{group.mediaType}</span>
                <span className="text-muted-foreground">({group.fileIds.length})</span>
              </button>
            );
          })}
        </div>
      )}

      {(failedCount > 0 || capped) && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          {capped && 'Too many items to index fully — showing a partial list. '}
          {failedCount > 0 && `${failedCount} item${failedCount === 1 ? '' : 's'} failed to load.`}
        </p>
      )}
    </div>
  );
};
