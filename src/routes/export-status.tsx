import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { AlertTriangle, CheckCircle, Download, Info, Loader2, MemoryStick, Octagon, XCircle } from 'lucide-react';
import { z } from 'zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog.tsx';
import { Button, buttonVariants } from '#/components/ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card.tsx';
import { cancelExport, getJobStatus } from '#/server/functions/export.ts';
import { formatFileSize } from '#/shared/formatters.ts';
import { TERMINAL_PHASES } from '#/shared/types/export.ts';
import type { JobPhase, JobStatus } from '#/shared/types/index.ts';

const searchSchema = z.object({
  jobId: z.string().uuid(),
});

export const Route = createFileRoute('/export-status')({
  validateSearch: (search) => searchSchema.parse(search),
  component: ExportStatusPage,
});

const PHASE_LABELS: Record<JobPhase, string> = {
  grouping: 'Organising files',
  downloading: 'Processing files',
  emailing: 'Sending email',
  complete: 'Complete',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const PHASE_ORDER: JobPhase[] = ['grouping', 'downloading', 'emailing', 'complete'];

const PhaseStepperItem = ({ phase, currentPhase }: { phase: JobPhase; currentPhase: JobPhase }) => {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);
  const phaseIdx = PHASE_ORDER.indexOf(phase);
  const isActive = phase === currentPhase;
  const isComplete = currentIdx > phaseIdx;

  return (
    <div className="flex items-center gap-2">
      {isComplete ? (
        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
      ) : isActive ? (
        <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />
      )}
      <span className={isComplete ? 'text-sm text-muted-foreground' : isActive ? 'text-sm font-medium' : 'text-sm text-muted-foreground/60'}>
        {PHASE_LABELS[phase]}
      </span>
    </div>
  );
};

type ProgressBarProps = {
  loaded: number;
  total: number;
  label: string;
  showBytes?: boolean;
};

const ProgressBar = ({ loaded, total, label, showBytes = false }: ProgressBarProps) => {
  const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
      {showBytes && total > 0 && (
        <div className="text-xs text-muted-foreground">
          {formatFileSize(loaded)} / {formatFileSize(total)}
        </div>
      )}
    </div>
  );
};

const FailedFilesList = ({ files }: { files: Array<{ filename: string; error: string }> }) => {
  if (files.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-1">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
        <AlertTriangle className="h-4 w-4" />
        {files.length} file{files.length !== 1 ? 's' : ''} failed to download
      </div>
      <ul className="text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
        {files.map((f) => (
          <li key={f.filename} className="truncate">
            {f.filename}: {f.error}
          </li>
        ))}
      </ul>
    </div>
  );
};

const ResourceStats = ({ status }: { status: JobStatus }) => (
  <div className="text-xs text-muted-foreground">
    <div className="space-y-1">
      <div className="flex items-center gap-1 font-medium">
        <MemoryStick className="h-3 w-3" />
        Memory
      </div>
      <div>
        Heap: {status.memory.heapUsedMB} / {status.memory.heapTotalMB} MB
      </div>
      <div>RSS: {status.memory.rssMB} MB</div>
    </div>
  </div>
);

const StopExportButton = ({ jobId }: { jobId: string }) => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () => cancelExport({ data: { jobId } }),
    // Polling has its own cadence; force an immediate refetch so the UI flips to
    // the 'cancelled' state right away (and before polling stops on that phase).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobStatus', jobId] }),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="destructive" size="lg" className="w-full" disabled={isPending}>
            <Octagon className="mr-2 h-4 w-4" />
            Stop Export
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogTitle>Stop this export?</AlertDialogTitle>
        <AlertDialogDescription>
          The export will be cancelled and all progress so far discarded. This cannot be undone — you'll need to start again.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep going</AlertDialogCancel>
          <AlertDialogAction onClick={() => mutate()}>Yes, stop</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

function ExportStatusPage() {
  const { jobId } = Route.useSearch();

  const { data: status, isLoading } = useQuery({
    queryKey: ['jobStatus', jobId],
    queryFn: () => getJobStatus({ data: { jobId } }),
    refetchInterval: (query) => {
      const phase = query.state.data?.phase;
      if (phase && TERMINAL_PHASES.has(phase)) return false;

      return 2000;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Job Not Found</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">This export job may have expired or the link is invalid. Completed jobs are removed after 1 hour.</p>
            <Link to="/browser" className={buttonVariants()}>
              Back to Browser
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status.phase === 'complete') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Export Complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FailedFilesList files={status.failedFiles} />
            {status.downloadUrl && (
              <div className="text-center">
                <a href={status.downloadUrl} className={buttonVariants({ size: 'lg' })}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Zip
                </a>
                <p className="text-xs text-muted-foreground mt-2">This link expires in 24 hours. A copy has also been sent to your email.</p>
              </div>
            )}
            <div className="text-center">
              <Link to="/browser" className={buttonVariants({ variant: 'outline' })}>
                Browse More Collections
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status.phase === 'failed') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Export Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status.errorMessage && <p className="text-sm text-destructive">{status.errorMessage}</p>}
            <FailedFilesList files={status.failedFiles} />
            <Link to="/browser" className={buttonVariants()}>
              Back to Browser
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status.phase === 'cancelled') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Octagon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Export Stopped</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">You stopped this export. No download file was created. You can start a new export at any time.</p>
            <Link to="/browser" className={buttonVariants()}>
              Back to Browser
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // In-progress states
  const canStop = status.phase === 'grouping' || status.phase === 'downloading';

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle>Exporting Files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>You can safely close this page. An email will be sent when your download is ready.</span>
          </div>

          <div className="space-y-2">
            {PHASE_ORDER.filter((p) => p !== 'complete').map((phase) => (
              <PhaseStepperItem key={phase} phase={phase} currentPhase={status.phase} />
            ))}
          </div>

          {status.phase === 'grouping' && (
            <ProgressBar loaded={status.groupedItems} total={status.totalItems} label={`${status.groupedItems} / ${status.totalItems} items`} />
          )}

          {status.phase === 'downloading' && (
            <div className="space-y-3">
              <ProgressBar loaded={status.downloadedFiles} total={status.totalFiles} label={`${status.downloadedFiles} / ${status.totalFiles} files`} />
              <ProgressBar loaded={status.streamedBytes} total={status.totalSize} label="Streamed" showBytes />
            </div>
          )}

          <FailedFilesList files={status.failedFiles} />

          <ResourceStats status={status} />

          {canStop && <StopExportButton jobId={jobId} />}
        </CardContent>
      </Card>
    </div>
  );
}
