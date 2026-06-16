import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SearchSortField } from '#/lib/sort.ts';
import { searchEntities } from '#/server/functions/search.ts';
import type { FacetFilters } from '#/shared/types/search.ts';

type UseSearchOptions = {
  query: string;
  filters?: FacetFilters | undefined;
  limit?: number;
  offset?: number;
  sort?: SearchSortField | undefined;
  order?: 'asc' | 'desc' | undefined;
  enabled?: boolean;
};

export const useSearch = ({ query, filters, limit = 50, offset = 0, sort, order, enabled = true }: UseSearchOptions) => {
  return useQuery({
    queryKey: ['search', query, filters, limit, offset, sort, order],
    queryFn: () => searchEntities({ data: { query, filters, limit, offset, sort, order } }),
    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled,
  });
};
