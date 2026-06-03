import { Readable } from 'node:stream';
import { config } from '#/server/services/config.ts';
import type { Entity } from '#/shared/types/index.ts';

const baseUrl = config.ROCRATE_API_BASE_URL;

const buildUrl = (endpoint: string): URL => {
  const base = new URL(baseUrl);
  const basePath = base.pathname.endsWith('/') ? base.pathname.slice(0, -1) : base.pathname;
  const endpointPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  return new URL(`${basePath}${endpointPath}`, base.origin);
};

const buildHeaders = (token?: string, accept = 'application/json'): Record<string, string> => {
  const headers: Record<string, string> = { Accept: accept };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export const fetchFileStream = async (fileId: string, token?: string, signal?: AbortSignal): Promise<Readable> => {
  const url = buildUrl(`/file/${encodeURIComponent(fileId)}`);

  const response = await fetch(url.toString(), {
    headers: buildHeaders(token, '*/*'),
    signal: signal ?? null,
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  // @ts-expect-error - Type mismatch between global ReadableStream and Node's stream/web ReadableStream
  return Readable.fromWeb(response.body);
};

export const getEntityMetadata = async (entityId: string, token?: string, signal?: AbortSignal): Promise<Entity> => {
  const url = buildUrl(`/entity/${encodeURIComponent(entityId)}`);

  const response = await fetch(url.toString(), {
    headers: buildHeaders(token, 'application/json'),
    signal: signal ?? null,
  });

  if (!response.ok) {
    throw new Error(`Failed to get entity metadata: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<Entity>;
};

const getEntityRoCrate = async (entityId: string, token?: string, signal?: AbortSignal): Promise<unknown> => {
  const url = buildUrl(`/entity/${encodeURIComponent(entityId)}/rocrate`);

  const response = await fetch(url.toString(), {
    headers: buildHeaders(token, 'application/ld+json'),
    signal: signal ?? null,
  });

  if (!response.ok) {
    throw new Error(`Failed to get RO-Crate metadata: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

export const fetchRoCrateMetadata = async (entityId: string, token?: string, signal?: AbortSignal): Promise<Buffer> => {
  const rocrate = await getEntityRoCrate(entityId, token, signal);

  return Buffer.from(JSON.stringify(rocrate, null, 2));
};
