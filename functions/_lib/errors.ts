export type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 500 | 502;

export type ApiError = { error: { code: string; message: string } };

export class HttpError extends Error {
  constructor(
    public readonly status: ErrorStatus,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  toBody(): ApiError {
    return { error: { code: this.code, message: this.message } };
  }
}

/** A GitHub or Cloudflare call that did not succeed. Upstream 404 stays 404; everything else is 502. */
export class UpstreamError extends HttpError {
  constructor(
    public readonly service: 'github' | 'cloudflare',
    public readonly upstreamStatus: number | null,
    message: string,
  ) {
    super(
      upstreamStatus === 404 ? 404 : 502,
      upstreamStatus === 404 ? 'not_found' : 'upstream_error',
      `${service}: ${message}`,
    );
    this.name = 'UpstreamError';
  }

  static from(service: 'github' | 'cloudflare', err: unknown): UpstreamError {
    if (err instanceof UpstreamError) return err;
    const status = readStatus(err);
    const message = err instanceof Error ? err.message : String(err);
    return new UpstreamError(service, status, message);
  }
}

function readStatus(err: unknown): number | null {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = (err as { status: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return null;
}
