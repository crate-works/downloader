import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '#/components/ui/button.tsx';
import { cn } from '#/lib/utils.ts';
import type { FacetFilters, Facets } from '#/shared/types/search.ts';

import { FacetCategorySection } from './FacetCategorySection.tsx';

const FACET_LABEL_MAP: Record<string, string> = {
  rootCollection: 'Collection',
  languages_with_code: 'Language',
  countries: 'Country',
  collector_name: 'Collector',
  entity_type: 'Type',
};

const FACET_ORDER = ['entity_type', 'rootCollection', 'languages_with_code', 'countries', 'collector_name'];

const filtersEqual = (a: FacetFilters, b: FacetFilters): boolean => {
  const aKeys = Object.keys(a).filter((k) => (a[k]?.length ?? 0) > 0);
  const bKeys = Object.keys(b).filter((k) => (b[k]?.length ?? 0) > 0);

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  return aKeys.every((key) => {
    const aVals = a[key] ?? [];
    const bVals = b[key] ?? [];
    if (aVals.length !== bVals.length) {
      return false;
    }

    return aVals.every((v) => bVals.includes(v));
  });
};

type FacetPanelProps = {
  facets?: Facets | undefined;
  filters: FacetFilters;
  isFetching: boolean;
  onFiltersChange: (filters: FacetFilters) => void;
};

export const FacetPanel = ({ facets, filters, isFetching, onFiltersChange }: FacetPanelProps) => {
  const [pendingFilters, setPendingFilters] = useState<FacetFilters>(filters);

  // Sync pending state when the applied filters change externally
  // (e.g. badge removal, navigation)
  useEffect(() => {
    setPendingFilters(filters);
  }, [filters]);

  const hasActiveFilters = Object.values(filters).some((values) => values.length > 0);
  const hasPendingChanges = useMemo(() => !filtersEqual(pendingFilters, filters), [pendingFilters, filters]);

  const handleToggle = useCallback((key: string, value: string) => {
    setPendingFilters((prev) => {
      const current = prev[key] ?? [];
      const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];

      const next = { ...prev, [key]: updated };

      if (updated.length === 0) {
        delete next[key];
      }

      return next;
    });
  }, []);

  const handleApply = () => {
    onFiltersChange(pendingFilters);
  };

  const handleReset = () => {
    setPendingFilters(filters);
  };

  const handleClearAll = () => {
    setPendingFilters({});
    onFiltersChange({});
  };

  const orderedKeys = FACET_ORDER.filter((key) => (facets?.[key] && facets[key].length > 0) || (filters[key] && filters[key].length > 0));

  if (!facets && !hasActiveFilters) {
    return null;
  }

  const applyResetButtons = hasPendingChanges && (
    <div className="flex gap-2 pt-2">
      <Button size="sm" className="flex-1" onClick={handleApply}>
        Apply
      </Button>
      <Button size="sm" variant="outline" className="flex-1" onClick={handleReset}>
        Reset
      </Button>
    </div>
  );

  return (
    <div className={cn('space-y-1', isFetching && 'opacity-60 transition-opacity')}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>
        {hasActiveFilters && (
          <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={handleClearAll}>
            Clear all
          </button>
        )}
      </div>

      {applyResetButtons}

      {orderedKeys.map((key) => (
        <FacetCategorySection
          key={key}
          label={FACET_LABEL_MAP[key] ?? key}
          buckets={facets?.[key] ?? []}
          selectedValues={pendingFilters[key] ?? []}
          onToggle={(value) => handleToggle(key, value)}
        />
      ))}

      {applyResetButtons}
    </div>
  );
};
