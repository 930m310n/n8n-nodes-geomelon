// Vendored from lib/typescript/src/errors.ts — see ./README.md for why.

export interface GeomelonErrorOptions {
  status?: number;
  body?: string;
  url?: string;
  cause?: unknown;
}

/**
 * Thrown when a Geomelon API request fails.
 *
 * `status` is the HTTP status code (undefined for network-level failures
 * and misconfiguration errors), `body` the raw response body, `url` the
 * request URL.
 */
export class GeomelonError extends Error {
  readonly status?: number;
  readonly body?: string;
  readonly url?: string;
  readonly cause?: unknown;

  constructor(message: string, options: GeomelonErrorOptions = {}) {
    super(message);
    this.name = 'GeomelonError';
    this.status = options.status;
    this.body = options.body;
    this.url = options.url;
    this.cause = options.cause;
    // Restore the prototype chain for ES5/ES2017 targets.
    Object.setPrototypeOf(this, GeomelonError.prototype);
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}
