import { formatFileSize } from '#/shared/formatters.ts';
import type { ExportFileInfo, ExportItemInfo, ExportJobMessage } from '#/shared/types/index.ts';
import {
  completeJob,
  failJob,
  updateJobDownloadProgress,
  updateJobGroupProgress,
  updateJobPhase,
  updateJobStreamedBytes,
  updateJobTotalSize,
} from './jobStore.ts';
import { sendDownloadEmail } from './services/email.ts';
import { fetchFileStream, fetchRoCrateMetadata, getEntityMetadata } from './services/rocrate.ts';
import { generatePresignedUrl, uploadStreamToS3 } from './services/s3.ts';
import { createStreamingZip } from './services/zipper.ts';

type FilesByItem = Map<string, { itemId: string; collectionId: string; files: ExportFileInfo[] }>;

// Extract a clean directory path from an entity ID (URL)
// e.g. "https://admin-catalog.nabu-stage.paradisec.org.au/repository/JFTEST/001"
// becomes "admin-catalog.nabu-stage.paradisec.org.au/JFTEST/001"
const extractPathFromId = (entityId: string): string => {
  try {
    const url = new URL(entityId);
    // Remove /repository/ prefix from path if present
    const cleanPath = url.pathname.replace(/^\/repository\//, '/');

    return `${url.hostname}${cleanPath}`;
  } catch {
    // If not a valid URL, return as-is but sanitise for filesystem
    return entityId.replace(/[<>:"|?*]/g, '_');
  }
};

const groupFilesByItem = async (
  jobId: string,
  items: ExportItemInfo[],
  files: ExportFileInfo[],
  accessToken?: string,
): Promise<{ filesByItem: FilesByItem; totalSize: number }> => {
  const filesByItem: FilesByItem = new Map();
  const itemCache = new Map<string, string>(); // itemId -> collectionId
  let totalSize = 0;

  // Grouping resolves the parent collection of every unique item via a network
  // call each. Report progress against that set so the UI can show a bar.
  const uniqueItemIds = new Set<string>([...items.map(({ id }) => id), ...files.map((file) => file.memberOf.id)]);
  const totalItems = uniqueItemIds.size;
  updateJobGroupProgress(jobId, 0, totalItems);

  const resolveCollectionId = async (itemId: string): Promise<string> => {
    const cached = itemCache.get(itemId);
    if (cached) return cached;

    console.log(`Fetching metadata for item: ${itemId}`);
    const itemMetadata = await getEntityMetadata(itemId, accessToken);
    const collectionId = itemMetadata.memberOf?.id || 'unknown-collection';
    itemCache.set(itemId, collectionId);
    updateJobGroupProgress(jobId, itemCache.size, totalItems);

    return collectionId;
  };

  // Seed with every explicitly selected item so empty items still get a directory
  for (const { id: itemId } of items) {
    const collectionId = await resolveCollectionId(itemId);
    const key = `${collectionId}/${itemId}`;
    if (!filesByItem.has(key)) {
      filesByItem.set(key, { itemId, collectionId, files: [] });
    }
  }

  for (const file of files) {
    totalSize += file.size;
    const itemId = file.memberOf.id;
    const collectionId = await resolveCollectionId(itemId);

    const key = `${collectionId}/${itemId}`;
    const existing = filesByItem.get(key);
    if (existing) {
      existing.files.push(file);
    } else {
      filesByItem.set(key, { itemId, collectionId, files: [file] });
    }
  }

  return { filesByItem, totalSize };
};

export const processJob = async (job: ExportJobMessage): Promise<void> => {
  const { jobId, files, items, email, accessToken } = job;

  console.log(`Processing job ${jobId}: ${files.length} files, ${items.length} items for ${email}`);

  // Group files by collection/item hierarchy
  console.log('Grouping files by collection and item...');
  updateJobPhase(jobId, 'grouping');
  const { filesByItem, totalSize } = await groupFilesByItem(jobId, items, files, accessToken);
  updateJobTotalSize(jobId, totalSize);

  // Streaming phase: fetch → zip → S3 in one pipeline
  updateJobPhase(jobId, 'downloading');
  const zip = createStreamingZip();

  const s3Key = `exports/${jobId}.zip`;
  const uploadPromise = uploadStreamToS3(zip.outputStream, s3Key);

  // Prevent unhandled errors on yazl's outputStream (the error also propagates via uploadPromise)
  zip.outputStream.on('error', (error) => {
    console.error('Zip output stream error:', error);
  });

  // Add RO-Crate metadata for each collection
  const collectionIds = new Set([...filesByItem.values()].map(({ collectionId }) => collectionId).filter((id) => id !== 'unknown-collection'));

  for (const collectionId of collectionIds) {
    const collectionPath = extractPathFromId(collectionId);
    console.log(`Adding RO-Crate metadata for collection: ${collectionId}`);
    const metadataBuffer = await fetchRoCrateMetadata(collectionId, accessToken);
    zip.addBuffer(metadataBuffer, `${collectionPath}/ro-crate-metadata.json`);
  }

  // Register each file lazily — the fetch only happens when yazl is ready to read,
  // preventing idle connections from being closed by the upstream server.
  let downloadedCount = 0;
  let streamedBytes = 0;

  for (const [, { itemId, files: itemFiles }] of filesByItem) {
    const itemPath = extractPathFromId(itemId);

    // Add RO-Crate metadata for the item
    console.log(`Adding RO-Crate metadata for item: ${itemId}`);
    const itemMetadataBuffer = await fetchRoCrateMetadata(itemId, accessToken);
    zip.addBuffer(itemMetadataBuffer, `${itemPath}/ro-crate-metadata.json`);

    for (const file of itemFiles) {
      const fileIndex = ++downloadedCount;

      zip.addStreamLazy(
        async () => {
          console.log(`Streaming file ${fileIndex}/${files.length}: ${file.filename}`);
          updateJobDownloadProgress(jobId, fileIndex);

          const fileStream = await fetchFileStream(file.id, accessToken);
          fileStream.on('end', () => {
            streamedBytes += file.size;
            updateJobStreamedBytes(jobId, streamedBytes);
          });

          return fileStream;
        },
        `${itemPath}/${file.filename}`,
        file.size,
      );
    }
  }

  // Finalize zip and wait for S3 upload to complete.
  // Any error (failed fetch, mid-stream socket close, upload failure) rejects uploadPromise.
  zip.finalize();

  try {
    await uploadPromise;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Export pipeline failed: ${message}`, error);
    failJob(jobId, `Export failed: ${message}`);
    await sendDownloadEmail({
      to: email,
      fileCount: files.length,
      totalSize: formatFileSize(totalSize),
    });

    return;
  }

  console.log('Generating presigned URL');
  const downloadUrl = await generatePresignedUrl(s3Key);

  console.log(`Sending email to ${email}`);
  updateJobPhase(jobId, 'emailing');
  await sendDownloadEmail({
    to: email,
    downloadUrl,
    fileCount: files.length,
    totalSize: formatFileSize(totalSize),
  });

  completeJob(jobId, downloadUrl);
  console.log(`Job ${jobId} completed successfully`);
};
