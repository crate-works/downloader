import { TERMINAL_PHASES } from '#/shared/types/export.ts';
import type { JobPhase, JobStatus } from '#/shared/types/index.ts';

type MutableJobState = {
  jobId: string;
  phase: JobPhase;
  totalItems: number;
  groupedItems: number;
  totalFiles: number;
  downloadedFiles: number;
  failedFiles: Array<{ filename: string; error: string }>;
  totalSize: number;
  streamedBytes: number;
  downloadUrl?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
};

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const JOB_TTL_MS = 60 * 60 * 1000; // 1 hour

// Use globalThis to survive SSR module duplication
const getStore = (): Map<string, MutableJobState> => {
  const g = globalThis as unknown as { __jobStore?: Map<string, MutableJobState> };
  if (!g.__jobStore) {
    g.__jobStore = new Map();
    startCleanup(g.__jobStore);
  }

  return g.__jobStore;
};

// AbortControllers are live objects, so they live in a parallel registry rather
// than on the serialisable MutableJobState data record.
const getAbortRegistry = (): Map<string, AbortController> => {
  const g = globalThis as unknown as { __jobAbortRegistry?: Map<string, AbortController> };
  if (!g.__jobAbortRegistry) {
    g.__jobAbortRegistry = new Map();
  }

  return g.__jobAbortRegistry;
};

const startCleanup = (store: Map<string, MutableJobState>): void => {
  setInterval(() => {
    const now = Date.now();
    for (const [id, job] of store) {
      if (job.completedAt && now - new Date(job.completedAt).getTime() > JOB_TTL_MS) {
        store.delete(id);
      }
    }
  }, CLEANUP_INTERVAL_MS).unref();
};

export const initJob = (jobId: string, totalFiles: number, totalSize: number): void => {
  getStore().set(jobId, {
    jobId,
    phase: 'grouping',
    totalItems: 0,
    groupedItems: 0,
    totalFiles,
    downloadedFiles: 0,
    failedFiles: [],
    totalSize,
    streamedBytes: 0,
    startedAt: new Date().toISOString(),
  });
};

export const updateJobPhase = (jobId: string, phase: JobPhase): void => {
  const job = getStore().get(jobId);
  if (job) {
    job.phase = phase;
  }
};

export const updateJobGroupProgress = (jobId: string, groupedItems: number, totalItems: number): void => {
  const job = getStore().get(jobId);
  if (job) {
    job.groupedItems = groupedItems;
    job.totalItems = totalItems;
  }
};

export const updateJobDownloadProgress = (jobId: string, downloadedFiles: number): void => {
  const job = getStore().get(jobId);
  if (job) {
    job.downloadedFiles = downloadedFiles;
  }
};

export const updateJobTotalSize = (jobId: string, totalSize: number): void => {
  const job = getStore().get(jobId);
  if (job) {
    job.totalSize = totalSize;
  }
};

export const updateJobStreamedBytes = (jobId: string, streamedBytes: number): void => {
  const job = getStore().get(jobId);
  if (job) {
    job.streamedBytes = streamedBytes;
  }
};

// Register the AbortController for a running job so cancelJob can tear it down.
export const registerJobAbort = (jobId: string, controller: AbortController): void => {
  getAbortRegistry().set(jobId, controller);
};

// Latch a job into a terminal phase. A terminal phase is never overwritten — this
// is what stops a late upload from resurrecting a cancelled job, or an AbortError
// from turning a deliberate 'cancelled' into a 'failed'. The abort registry is torn
// down regardless, since the job is finished either way. Returns whether it transitioned.
const reachTerminal = (jobId: string, phase: JobPhase, patch?: Partial<MutableJobState>): boolean => {
  const job = getStore().get(jobId);
  getAbortRegistry().delete(jobId);
  if (!job || TERMINAL_PHASES.has(job.phase)) {
    return false;
  }

  Object.assign(job, patch, { phase, completedAt: new Date().toISOString() });

  return true;
};

export const completeJob = (jobId: string, downloadUrl: string): void => {
  reachTerminal(jobId, 'complete', { downloadUrl });
};

export const failJob = (jobId: string, errorMessage: string): void => {
  reachTerminal(jobId, 'failed', { errorMessage });
};

// Cooperatively cancel a running job: flag it cancelled and abort its pipeline.
// No-op if the job is unknown or already in a terminal state.
export const cancelJob = (jobId: string): boolean => {
  const controller = getAbortRegistry().get(jobId);
  const cancelled = reachTerminal(jobId, 'cancelled');
  if (cancelled) {
    controller?.abort();
  }

  return cancelled;
};

export const getJobStatus = (jobId: string): JobStatus | null => {
  const job = getStore().get(jobId);
  if (!job) {
    return null;
  }

  const mem = process.memoryUsage();

  const result: JobStatus = {
    jobId: job.jobId,
    phase: job.phase,
    totalItems: job.totalItems,
    groupedItems: job.groupedItems,
    totalFiles: job.totalFiles,
    downloadedFiles: job.downloadedFiles,
    failedFiles: job.failedFiles,
    totalSize: job.totalSize,
    streamedBytes: job.streamedBytes,
    startedAt: job.startedAt,
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
    },
  };

  if (job.downloadUrl) result.downloadUrl = job.downloadUrl;
  if (job.errorMessage) result.errorMessage = job.errorMessage;
  if (job.completedAt) result.completedAt = job.completedAt;

  return result;
};
