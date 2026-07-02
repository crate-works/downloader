import { X } from 'lucide-react';

import type { FacetFilters } from '#/shared/types/search.ts';

const FACET_LABEL_MAP: Record<string, string> = {
  rootCollection: 'Collection',
  languages_with_code: 'Language',
  countries: 'Country',
  collector_name: 'Collector',
  entity_type: 'Type',
};

type ActiveFilterBadgesProps = {
  filters: FacetFilters;
  onFiltersChange: (filters: FacetFilters) => void;
};

export const ActiveFilterBadges = ({ filters, onFiltersChange }: ActiveFilterBadgesProps) => {
  const entries = Object.entries(filters).flatMap(([key, values]) => values.map((value) => ({ key, value, label: FACET_LABEL_MAP[key] ?? key })));

  if (entries.length === 0) {
    return null;
  }

  const handleRemove = (key: string, value: string) => {
    const current = filters[key] ?? [];
    const updated = current.filter((v) => v !== value);
    const newFilters = { ...filters };

    if (updated.length === 0) {
      delete newFilters[key];
    } else {
      newFilters[key] = updated;
    }

    onFiltersChange(newFilters);
  };

  const handleClearAll = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {entries.map(({ key, value, label }) => (
        <span key={`${key}:${value}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
          {label}: {value}
          <button type="button" className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20" onClick={() => handleRemove(key, value)}>
            <X className="size-3" />
          </button>
        </span>
      ))}

      <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={handleClearAll}>
        Clear all
      </button>
    </div>
  );
};
