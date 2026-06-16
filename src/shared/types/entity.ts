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

// Entity-kind predicates. Accept any shape carrying `entityType` so they work
// for both the API `Entity` and the lighter search-result entity.
export const isCollection = (entity: { entityType: string }): boolean => entity.entityType.includes('Collection');
export const isObject = (entity: { entityType: string }): boolean => entity.entityType.includes('Object');
