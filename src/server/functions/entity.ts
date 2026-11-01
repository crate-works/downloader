import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getCookie } from '#/server/services/cookies.ts';
import * as rocrate from '#/server/services/rocrate.ts';
import type { Entity } from '#/shared/types/index.ts';

const entitySchema = z.object({
  id: z.string().min(1),
});

export const getEntity = createServerFn({ method: 'GET' })
  .validator(entitySchema)
  .handler(async ({ data }): Promise<Entity> => {
    const token = getCookie('access_token');

    return rocrate.getEntity(data.id, token);
  });
