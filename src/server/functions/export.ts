import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getCookie } from '#/server/services/cookies.ts';
import type { ExportJobMessage, JobStatus } from '#/shared/types/index.ts';
import { cancelJob, failJob, getJobStatus as getJobStatusFromStore, initJob } from '#/worker/jobStore.ts';
import { processJob } from '#/worker/processor.ts';

const exportFileSchema = z.object({
  id: z.string(),
  filename: z.string(),
  size: z.number(),
  memberOf: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

const exportItemSchema = z.object({
  id: z.string(),
});

const exportRequestSchema = z
  .object({
    files: z.array(exportFileSchema).default([]),
    items: z.array(exportItemSchema).default([]),
    email: z.email('Valid email required'),
  })
  .refine((data) => data.files.length + data.items.length >= 1, {
    message: 'At least one file or item must be selected',
  });

type ExportResponse = {
  success: boolean;
  jobId?: string;
  message: string;
  error?: string;
};

export const submitExport = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => exportRequestSchema.parse(data))
  .handler(async ({ data }): Promise<ExportResponse> => {
    const accessToken = getCookie('access_token');

    if (!accessToken) {
      return {
        success: false,
        message: 'Authentication required',
        error: 'No access token available',
      };
    }

    const jobId = crypto.randomUUID();
    const totalSize = data.files.reduce((sum, f) => sum + f.size, 0);
    initJob(jobId, data.files.length, totalSize);

    const job: ExportJobMessage = {
      jobId,
      files: data.files,
      items: data.items,
      email: data.email,
      accessToken,
      requestedAt: new Date().toISOString(),
    };

    // Run in background - don't await
    processJob(job).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Export job ${jobId} failed:`, error);
      failJob(jobId, message);
    });

    return {
      success: true,
      jobId,
      message: `Export request submitted. You will receive an email at ${data.email} when your download is ready.`,
    };
  });

export const getJobStatus = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<JobStatus | null> => {
    return getJobStatusFromStore(data.jobId);
  });

// Cooperatively cancel a running export. Authorised by knowledge of the job UUID
// alone (consistent with getJobStatus), but note this is a destructive capability.
export const cancelExport = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    return { success: cancelJob(data.jobId) };
  });
