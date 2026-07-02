import { describe, expect, it } from 'vitest';
import { ENTITY_TYPE, isCollection, isEssence, isObject } from './entity.ts';

describe('entity predicates', () => {
  it('classifies a Collection', () => {
    const entity = { entityType: ENTITY_TYPE.collection };
    expect(isCollection(entity)).toBe(true);
    expect(isObject(entity)).toBe(false);
    expect(isEssence(entity)).toBe(false);
  });

  it('classifies an Object (item)', () => {
    const entity = { entityType: ENTITY_TYPE.object };
    expect(isObject(entity)).toBe(true);
    expect(isCollection(entity)).toBe(false);
    expect(isEssence(entity)).toBe(false);
  });

  it('classifies a MediaObject (essence) and does not treat it as an item', () => {
    const entity = { entityType: ENTITY_TYPE.mediaObject };
    expect(isEssence(entity)).toBe(true);
    // Regression guard: "MediaObject" contains the substring "Object", which is
    // why the predicates match the exact URI rather than using `includes`.
    expect(isObject(entity)).toBe(false);
    expect(isCollection(entity)).toBe(false);
  });
});
