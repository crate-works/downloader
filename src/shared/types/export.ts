import type { RoCrateFile } from './file.ts';

export type ExportFileInfo = Pick<RoCrateFile, 'id' | 'filename' | 'size' | 'memberOf'>;

export type ExportItemInfo = { id: string };

export type JobPhase = 'grouping' | 'downloading' | 'emailing' | 'complete' | 'failed' | 'cancelled';

// Phases a job can no longer leave. A terminal phase is never overwritten, and the
// UI stops polling once a job reaches one.
export const TERMINAL_PHASES: ReadonlySet<JobPhase> = new Set<JobPhase>(['complete', 'failed', 'cancelled']);

export type JobStatus = {
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
  memory: { heapUsedMB: number; heapTotalMB: number; rssMB: number };
};

export type ExportJobMessage = {
  jobId: string;
  files: ExportFileInfo[];
  items: ExportItemInfo[];
  email: string;
  accessToken: string;
  requestedAt: string;
};
