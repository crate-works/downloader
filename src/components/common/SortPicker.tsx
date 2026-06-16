import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import type { SortOption } from '#/lib/sort.ts';

type SortPickerProps<T extends string> = {
  value: T;
  options: SortOption<T>[];
  onChange: (value: T) => void;
  label?: string;
};

export const SortPicker = <T extends string>({ value, options, onChange, label = 'Sort by' }: SortPickerProps<T>) => {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="whitespace-nowrap">{label}</span>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next !== null) {
            onChange(next as T);
          }
        }}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue>{(selected) => options.find((option) => option.value === selected)?.label ?? selected}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
