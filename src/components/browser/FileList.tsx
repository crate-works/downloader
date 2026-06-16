import { Lock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FileSize } from '#/components/common/FileSize.tsx';
import { LoadingSpinner } from '#/components/common/LoadingSpinner.tsx';
import { SortPicker } from '#/components/common/SortPicker.tsx';
import { useFiles } from '#/hooks/useFiles.ts';
import { DEFAULT_FILE_SORT, FILE_SORT_OPTIONS, type FileSortKey, sortFiles } from '#/lib/sort.ts';
import type { RoCrateFile } from '#/shared/types/index.ts';
import { useSelectionStore } from '#/store/selectionStore.ts';
import { FileRow } from './FileRow.tsx';

type FileListProps = {
  itemId: string;
};

export const FileList = ({ itemId }: FileListProps) => {
  const { data, isLoading, error } = useFiles(itemId, true);
  const { isFileIncluded, selectedFiles } = useSelectionStore();
  const [sort, setSort] = useState<FileSortKey>(DEFAULT_FILE_SORT);

  const { allFiles, includedCount, totalSize, selectedSize, restrictedCount } = useMemo(() => {
    if (!data) {
      return { allFiles: [], includedCount: 0, totalSize: 0, selectedSize: 0, restrictedCount: 0 };
    }

    const included = data.filter((file) => isFileIncluded(file) && file.access?.content !== false);
    const restricted = data.filter((file) => file.access?.content === false);
    const total = included.reduce((sum: number, file: RoCrateFile) => sum + file.size, 0);
    const selected = included.filter((file) => selectedFiles.has(file.id)).reduce((sum: number, file: RoCrateFile) => sum + file.size, 0);

    return {
      allFiles: data,
      includedCount: included.length,
      totalSize: total,
      selectedSize: selected,
      restrictedCount: restricted.length,
    };
  }, [data, isFileIncluded, selectedFiles]);

  // Sort from `data` (not `allFiles`, which is the same array but re-wrapped by
  // the memo above whenever the selection changes) so re-sorting only happens
  // when the files or chosen order actually change.
  const sortedFiles = useMemo(() => sortFiles(data ?? [], sort), [data, sort]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <LoadingSpinner size="sm" />
        <span className="ml-2 text-xs text-muted-foreground">Loading files...</span>
      </div>
    );
  }

  if (error) {
    return <div className="py-3 text-xs text-destructive">Error loading files: {error.message}</div>;
  }

  if (!allFiles.length) {
    return <div className="py-3 text-xs text-muted-foreground">No files in this item.</div>;
  }

  return (
    <div className="space-y-1">
      {restrictedCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-300 px-2 py-1.5 rounded mb-2">
          <Lock className="h-3 w-3" />
          <span>
            {restrictedCount} file{restrictedCount !== 1 ? 's require' : ' requires'} login to download
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground mb-2">
        <span>
          {includedCount} of {allFiles.length} file{allFiles.length !== 1 ? 's' : ''} available
        </span>
        <span>
          Total: <FileSize bytes={totalSize} />
          {selectedSize > 0 && (
            <span className="ml-2">
              (Selected: <FileSize bytes={selectedSize} />)
            </span>
          )}
        </span>
      </div>
      {allFiles.length > 1 && (
        <div className="flex justify-end mb-2">
          <SortPicker value={sort} options={FILE_SORT_OPTIONS} onChange={setSort} />
        </div>
      )}
      {sortedFiles.map((file) => (
        <FileRow key={file.id} file={file} disabled={!isFileIncluded(file)} />
      ))}
    </div>
  );
};
