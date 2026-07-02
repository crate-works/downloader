import { File, Lock, Music, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import { FileSize } from '#/components/common/FileSize.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import type { RangeCheckboxClick } from '#/hooks/useRangeSelect.ts';
import { cn } from '#/lib/utils.ts';
import { getFileType, getQualityTier } from '#/shared/types/file.ts';
import type { RoCrateFile } from '#/shared/types/index.ts';
import { useSelectionStore } from '#/store/selectionStore.ts';

type FileRowProps = {
  file: RoCrateFile;
  disabled?: boolean;
  onCheckboxClick?: RangeCheckboxClick | undefined;
  // Optional badge rendered next to the filename (e.g. an "Essence" marker when
  // the file was surfaced directly by search rather than by browsing its item).
  badge?: ReactNode | undefined;
};

export const FileRow = ({ file, disabled = false, onCheckboxClick, badge }: FileRowProps) => {
  const { selectedFiles, toggleFileSelection } = useSelectionStore();

  const isSelected = selectedFiles.has(file.id);
  const fileType = getFileType(file.mediaType);
  const qualityTier = getQualityTier(file.mediaType);
  const hasAccess = file.access?.content !== false;

  const isDisabled = disabled || !hasAccess;

  const handleCheckboxChange = () => {
    if (!isDisabled) {
      toggleFileSelection(file.id);
    }
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'audio':
        return <Music className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      default:
        return <File className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn('flex select-none items-center gap-2 p-1.5 rounded', isDisabled ? 'opacity-40' : 'hover:bg-muted/50')}>
      <Checkbox
        checked={isSelected && !isDisabled}
        onCheckedChange={handleCheckboxChange}
        onClick={(e) => onCheckboxClick?.(file.id, e, !isSelected)}
        disabled={isDisabled}
        aria-label={`Select ${file.filename}`}
      />

      <span className="text-muted-foreground">{getFileIcon()}</span>

      <div className="flex-1 min-w-0">
        <div className="text-sm truncate flex items-center gap-2">
          {file.filename}
          {badge}
        </div>
      </div>

      {!hasAccess && (
        <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Login required
        </span>
      )}

      {(fileType !== 'other' || qualityTier === 'archival') && (
        <span
          className={cn(
            'text-xs px-1.5 py-0.5 rounded',
            qualityTier === 'archival'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          )}
        >
          {qualityTier}
        </span>
      )}

      <span className="text-xs text-muted-foreground">
        <FileSize bytes={file.size} />
      </span>
    </div>
  );
};
