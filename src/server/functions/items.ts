import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getCookie } from '#/server/services/cookies.ts';
import * as rocrate from '#/server/services/rocrate.ts';
import type { RoCrateFile } from '#/shared/types/index.ts';

const itemFilesSchema = z.object({
  itemId: z.string().min(1),
});

export const getFilesInItem = createServerFn({ method: 'GET' })
  .validator(itemFilesSchema)
  .handler(async ({ data }): Promise<RoCrateFile[]> => {
    const token = getCookie('access_token');

    return rocrate.getFilesInItem(data.itemId, token);
  });
