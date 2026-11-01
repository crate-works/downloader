import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getCookie } from '#/server/services/cookies.ts';
import * as rocrate from '#/server/services/rocrate.ts';
import type { Entity } from '#/shared/types/index.ts';

const collectionItemsSchema = z.object({
  collectionId: z.string().min(1),
});

export const getItemsInCollection = createServerFn({ method: 'GET' })
  .validator(collectionItemsSchema)
  .handler(async ({ data }): Promise<Entity[]> => {
    const token = getCookie('access_token');

    return rocrate.getItemsInCollection(data.collectionId, token);
  });
