export type FacetBucket = { name: string; count: number };

export type Facets = Record<string, FacetBucket[]>;

export type FacetFilters = Record<string, string[]>;

export type SearchRequest = {
  searchType: 'basic' | 'advanced';
  query: string;
  filters?: FacetFilters | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
  sort?: 'id' | 'name' | 'createdAt' | 'updatedAt' | undefined;
  order?: 'asc' | 'desc' | undefined;
};

type SearchEntity = {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  memberOf?: string;
  rootCollection?: string;
  access: { metadata: boolean; content: boolean };
  searchExtra: { score: number; highlight: Record<string, string[]> };
};

export type SearchResponse = {
  total: number;
  searchTime: number;
  entities: SearchEntity[];
  facets?: Facets | undefined;
};
