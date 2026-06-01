import type { EntityRef } from './file.ts';

type EntityType = 'http://pcdm.org/models#Collection' | 'http://pcdm.org/models#Object' | 'http://schema.org/MediaObject';

export type Entity = {
  id: string;
  name: string;
  description?: string | undefined;
  entityType: EntityType;
  memberOf?: EntityRef | undefined;
  rootCollection?: string | undefined;
  licenses?: string[] | undefined;
};
