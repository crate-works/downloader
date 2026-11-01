import type { Readable } from 'node:stream';
import { DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '#/server/services/config.ts';
import { PRESIGNED_URL_EXPIRY_SECONDS } from '#/shared/constants.ts';

const s3Client = new S3Client({ region: config.AWS_REGION });

// S3 caps multipart uploads at 10,000 parts; the 5 MiB default limits zips to ~48.8 GiB.
// 64 MiB parts allow ~625 GiB, at the cost of ~(queueSize + 1) × 64 MiB buffered per upload.
const UPLOAD_PART_SIZE = 64 * 1024 * 1024;

export const uploadStreamToS3 = async (stream: Readable, key: string, signal?: AbortSignal): Promise<void> => {
  const upload = new Upload({
    client: s3Client,
    partSize: UPLOAD_PART_SIZE,
    params: {
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: stream,
      ContentType: 'application/zip',
    },
  });

  // Aborting the upload aborts the underlying (multipart) request and rejects done().
  signal?.addEventListener('abort', () => {
    upload.abort();
  });

  await upload.done();
};

export const deleteFromS3 = async (key: string): Promise<void> => {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
    }),
  );
};

export const generatePresignedUrl = async (key: string): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
  });
};
