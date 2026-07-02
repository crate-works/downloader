import type { EntityRef } from './file.ts';

// The three entity types the RO-Crate API returns. These are fixed, well-known
// URIs, so predicates match them exactly rather than by substring — a substring
// test misfires because "MediaObject" contains "Object".
export const ENTITY_TYPE = {
  collection: 'http://pcdm.org/models#Collection',
  object: 'http://pcdm.org/models#Object',
  mediaObject: 'http://schema.org/MediaObject',
} as const;

type EntityType = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE];

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
export const isCollection = (entity: { entityType: string }): boolean => entity.entityType === ENTITY_TYPE.collection;
export const isObject = (entity: { entityType: string }): boolean => entity.entityType === ENTITY_TYPE.object;
// An essence is a MediaObject (a media file). Search can return these at the top
// level alongside collections and items.
export const isEssence = (entity: { entityType: string }): boolean => entity.entityType === ENTITY_TYPE.mediaObject;
