import type { HttpEnv, HttpHandler, HttpMethod, HttpMiddleware, HttpResponseData, Logger } from '../types';
import { ClowkError } from '../errors';
import { ClowkResponse } from './response';
import { createTimeoutMiddleware } from './middleware/timeout';
import { createRetryMiddleware } from './middleware/retry';
import { createLoggerMiddleware } from './middleware/logger';

export interface HttpClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  logger?: Logger | null;
  openTimeout?: number;
  readTimeout?: number;
  writeTimeout?: number;
  retryAttempts?: number;
  retryInterval?: number;
}

const MAX_BODY_SIZE = 1_048_576; // 1 MB

function buildUrl(baseUrl: string, path: string): URL {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return new URL(cleanPath, base);
}

async function performFetch(env: HttpEnv): Promise<HttpResponseData> {
  const init: RequestInit = {
    method: env.method,
    headers: env.headers,
    signal: env.signal,
  };

  if (env.body != null && !['GET', 'HEAD'].includes(env.method)) {
    init.body = JSON.stringify(env.body);
  }

  const raw = await fetch(env.url.toString(), init);
  const body = await raw.text();

  if (body.length > MAX_BODY_SIZE) {
    throw new ClowkError(`response body too large (${body.length} bytes, max ${MAX_BODY_SIZE})`);
  }

  let bodyParsed: unknown = null;
  try {
    bodyParsed = JSON.parse(body);
  } catch {
    // not JSON, keep bodyParsed as null
  }

  const headers: Record<string, string> = {};
  raw.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    status: raw.status,
    body,
    bodyParsed,
    headers,
    success: raw.ok,
  };
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly stack: HttpHandler;

  constructor(opts: HttpClientOptions) {
    this.baseUrl = opts.baseUrl;

    this.defaultHeaders = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...opts.headers,
    };

    const middlewares: HttpMiddleware[] = [
      createTimeoutMiddleware({
        openTimeout: opts.openTimeout ?? 5,
        readTimeout: opts.readTimeout ?? 10,
        writeTimeout: opts.writeTimeout ?? 10,
      }),
      createRetryMiddleware(),
      createLoggerMiddleware({ logger: opts.logger ?? null }),
    ];

    this.stack = middlewares.reduceRight<HttpHandler>((next, mw) => mw(next), performFetch);
  }

  async get(path: string, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.request('GET', path, undefined, headers);
  }

  async post(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.request('POST', path, body, headers);
  }

  async put(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.request('PUT', path, body, headers);
  }

  async patch(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.request('PATCH', path, body, headers);
  }

  async delete(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.request('DELETE', path, body, headers);
  }

  async head(path: string, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.request('HEAD', path, undefined, headers);
  }

  async options(path: string, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.request('OPTIONS', path, undefined, headers);
  }

  private async request(
    method: HttpMethod,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<ClowkResponse> {
    const env: HttpEnv = {
      method,
      url: buildUrl(this.baseUrl, path),
      body,
      headers: { ...this.defaultHeaders, ...headers },
      timeouts: { open: 5, read: 10, write: 10 },
      retryAttempts: 2,
      retryInterval: 0.05,
      attempt: 1,
    };

    const data = await this.stack(env);
    return new ClowkResponse(data);
  }
}
