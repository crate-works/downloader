import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useMemo } from 'react';
import { z } from 'zod';
import { SelectionSummary } from '#/components/browser/SelectionSummary.tsx';
import { SearchResults } from '#/components/search/SearchResults.tsx';
import { DEFAULT_SEARCH_SORT, SEARCH_SORT_OPTIONS, type SearchSortKey } from '#/lib/sort.ts';
import { getAuthStatus } from '#/server/functions/auth.ts';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '#/shared/constants.ts';
import type { FacetFilters } from '#/shared/types/search.ts';

const SEARCH_SORT_KEYS = SEARCH_SORT_OPTIONS.map((option) => option.value) as [SearchSortKey, ...SearchSortKey[]];

const FACET_KEYS = ['rootCollection', 'languages_with_code', 'countries', 'collector_name', 'entity_type'] as const;

const browserSearchSchema = z.object({
  q: z.string().min(1).optional(),
  page: z.number().int().positive().optional().default(1),
  // `.default` keeps the param optional and fills an absent value; `.catch`
  // handles an out-of-range one (e.g. a hand-edited ?pageSize=999) by falling
  // back to the default rather than throwing.
  pageSize: z.literal(PAGE_SIZE_OPTIONS).default(DEFAULT_PAGE_SIZE).catch(DEFAULT_PAGE_SIZE),
  // Single combined key (e.g. `name-asc`); SearchResults splits it into the
  // sort/order pair the search API wants. `.catch` guards a hand-edited value.
  sort: z.enum(SEARCH_SORT_KEYS).default(DEFAULT_SEARCH_SORT).catch(DEFAULT_SEARCH_SORT),
  rootCollection: z.array(z.string()).optional(),
  languages_with_code: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  collector_name: z.array(z.string()).optional(),
  entity_type: z.array(z.string()).optional(),
});

export const Route = createFileRoute('/browser')({
  validateSearch: browserSearchSchema,
  beforeLoad: async () => {
    const auth = await getAuthStatus();

    if (!auth.authenticated) {
      throw redirect({ to: '/' });
    }

    return { user: auth.user };
  },
  component: BrowserPage,
});

function BrowserPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { q = '', page, pageSize, sort } = search;

  const query = q;

  const filters = useMemo(() => {
    const result: FacetFilters = {};
    for (const key of FACET_KEYS) {
      const values = search[key];
      if (values && values.length > 0) {
        result[key] = values;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }, [search]);

  const buildSearchParams = (overrides: { page?: number; filters?: FacetFilters; q?: string; pageSize?: number; sort?: SearchSortKey }) => {
    const activeQuery = overrides.q ?? q;
    const activeFilters = overrides.filters ?? filters ?? {};
    const params: Record<string, string | number | string[] | undefined> = {
      q: activeQuery || undefined,
      page: overrides.page ?? page,
      pageSize: overrides.pageSize ?? pageSize,
      sort: overrides.sort ?? sort,
    };

    for (const key of FACET_KEYS) {
      const values = activeFilters[key];
      params[key] = values && values.length > 0 ? values : undefined;
    }

    return params;
  };

  const handlePageChange = (newPage: number) => {
    navigate({
      to: '/browser',
      search: buildSearchParams({ page: newPage }),
    });
  };

  const handleFiltersChange = (newFilters: FacetFilters) => {
    navigate({
      to: '/browser',
      search: buildSearchParams({ page: 1, filters: newFilters }),
    });
  };

  const handleSortChange = (newSort: SearchSortKey) => {
    // Reset to page 1: a new ordering makes the current page number meaningless.
    navigate({
      to: '/browser',
      search: buildSearchParams({ page: 1, sort: newSort }),
    });
  };

  const handlePageSizeChange = (newSize: number) => {
    // Reset to page 1: the old page number rarely maps to a valid page under a
    // new size, and the larger size means fewer pages overall.
    navigate({
      to: '/browser',
      search: buildSearchParams({ page: 1, pageSize: newSize }),
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{q ? 'Search Results' : 'Browse Collections'}</h1>
      </div>

      <SearchResults
        query={query}
        page={page}
        pageSize={pageSize}
        sort={sort}
        filters={filters}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSortChange={handleSortChange}
        onFiltersChange={handleFiltersChange}
      />

      <SelectionSummary userEmail={user?.email} />
    </div>
  );
}
