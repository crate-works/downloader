import type { Entity } from '#/shared/types/entity.ts';
import type { RoCrateFile } from '#/shared/types/file.ts';

export type SortOption<T extends string> = { value: T; label: string };

// Sequence-numbered identifiers and filenames (e.g. NT1-001-002, …-010, …-100)
// are pervasive in the catalogue, so client-side name sorting uses numeric
// collation: `2 < 10 < 100` rather than lexicographic `100 < 2`.
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

// --- Search results (server-side) -------------------------------------------
// The browser route stores a single combined key in the URL; we translate it
// into the `sort`/`order` pair the search API expects. `relevance` means "let
// the backend decide" (OpenSearch `_score`), i.e. send neither param. The only
// fields the cross-index /search endpoint sorts on are `name`, `originatedOn`
// (origination date), `createdAt` and `updatedAt` — see nabu
// OniController::SEARCH_SORT_FIELDS.
export type SearchSortField = 'id' | 'name' | 'originatedOn' | 'createdAt' | 'updatedAt';

export type SearchSortKey =
  | 'relevance'
  | 'name-asc'
  | 'name-desc'
  | 'id-asc'
  | 'id-desc'
  | 'originatedOn-desc'
  | 'originatedOn-asc'
  | 'createdAt-desc'
  | 'createdAt-asc'
  | 'updatedAt-desc'
  | 'updatedAt-asc';

// Each option carries the API `sort`/`order` it maps to, so the translation is
// data-driven (no string parsing). `relevance` omits both → `_score`.
type SearchSortOption = SortOption<SearchSortKey> & ({ sort: SearchSortField; order: 'asc' | 'desc' } | { sort?: undefined; order?: undefined });

export const SEARCH_SORT_OPTIONS: SearchSortOption[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'name-asc', label: 'Name (A–Z)', sort: 'name', order: 'asc' },
  { value: 'name-desc', label: 'Name (Z–A)', sort: 'name', order: 'desc' },
  { value: 'id-asc', label: 'Identifier (A–Z)', sort: 'id', order: 'asc' },
  { value: 'id-desc', label: 'Identifier (Z–A)', sort: 'id', order: 'desc' },
  { value: 'originatedOn-desc', label: 'Origination date (newest)', sort: 'originatedOn', order: 'desc' },
  { value: 'originatedOn-asc', label: 'Origination date (oldest)', sort: 'originatedOn', order: 'asc' },
  { value: 'createdAt-desc', label: 'Date created (newest)', sort: 'createdAt', order: 'desc' },
  { value: 'createdAt-asc', label: 'Date created (oldest)', sort: 'createdAt', order: 'asc' },
  { value: 'updatedAt-desc', label: 'Date updated (newest)', sort: 'updatedAt', order: 'desc' },
  { value: 'updatedAt-asc', label: 'Date updated (oldest)', sort: 'updatedAt', order: 'asc' },
];

export const DEFAULT_SEARCH_SORT: SearchSortKey = 'relevance';

export const parseSearchSort = (key: SearchSortKey): { sort?: SearchSortField; order?: 'asc' | 'desc' } => {
  const option = SEARCH_SORT_OPTIONS.find((o) => o.value === key);

  return option?.sort ? { sort: option.sort, order: option.order } : {};
};

// --- Items within a collection (client-side) --------------------------------
export type ItemSortKey = 'name-asc' | 'name-desc';

export const ITEM_SORT_OPTIONS: SortOption<ItemSortKey>[] = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
];

export const DEFAULT_ITEM_SORT: ItemSortKey = 'name-asc';

export const sortItems = (items: Entity[], key: ItemSortKey): Entity[] => {
  return [...items].sort((a, b) => (key === 'name-desc' ? collator.compare(b.name, a.name) : collator.compare(a.name, b.name)));
};

// --- Files within an item (client-side) -------------------------------------
export type FileSortKey = 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc' | 'type-asc';

export const FILE_SORT_OPTIONS: SortOption<FileSortKey>[] = [
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'size-desc', label: 'Size (largest)' },
  { value: 'size-asc', label: 'Size (smallest)' },
  { value: 'type-asc', label: 'Media type' },
];

export const DEFAULT_FILE_SORT: FileSortKey = 'name-asc';

export const sortFiles = (files: RoCrateFile[], key: FileSortKey): RoCrateFile[] => {
  const sorted = [...files];

  switch (key) {
    case 'name-asc':
      return sorted.sort((a, b) => collator.compare(a.name, b.name));
    case 'name-desc':
      return sorted.sort((a, b) => collator.compare(b.name, a.name));
    case 'size-desc':
      return sorted.sort((a, b) => b.size - a.size);
    case 'size-asc':
      return sorted.sort((a, b) => a.size - b.size);
    case 'type-asc':
      // Group by media type, then keep names ordered within each group.
      return sorted.sort((a, b) => collator.compare(a.mediaType, b.mediaType) || collator.compare(a.name, b.name));
  }
};
