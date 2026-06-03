import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { PAGE_SIZE_OPTIONS } from '#/shared/constants.ts';

type PageSizePickerProps = {
  value: number;
  onChange: (size: number) => void;
};

export const PageSizePicker = ({ value, onChange }: PageSizePickerProps) => {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="whitespace-nowrap">Results per page</span>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next !== null) {
            onChange(next);
          }
        }}
      >
        <SelectTrigger aria-label="Results per page">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((size) => (
            <SelectItem key={size} value={size}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
