// Vendored from lib/typescript/src/client.ts — see ./README.md for why.

import type {
  ByCoordinatesParams,
  CityDto,
  CityTranslationDto,
  CountryDto,
  CountryExtendedDto,
  CountryTranslationDto,
  DistanceDto,
  LanguageDto,
  ListCountriesParams,
  ListLanguagesParams,
  ListRegionsParams,
  OneshotCityDto,
  RegionDto,
  RegionExtendedDto,
  RegionTranslationDto,
  SearchCitiesParams,
  SettlementTypeDto,
  TranslationsParams,
} from './types';
import { GeomelonError } from './errors';
import { VERSION } from './version';

export interface GeomelonClientConfig {
  /**
   * RapidAPI key. Optional: without it only the free keyless oneshot
   * autocomplete is available — every other endpoint throws GeomelonError.
   */
  apiKey?: string;
  host?: string;
  /**
   * Route oneshot requests to the free keyless host
   * (oneshot.geomelon.dev) even when an apiKey is configured, so they
   * don't count toward your RapidAPI plan.
   */
  freeOneshot?: boolean;
  /**
   * Number of retries on 429/5xx responses, timeouts, and network errors,
   * with exponential backoff. Default 0 (no retries).
   */
  retries?: number;
  /** Default per-request timeout in milliseconds. Default: no timeout. */
  timeoutMs?: number;
}

/** Per-request overrides accepted by every client method. */
export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

const DEFAULT_HOST = 'geomelon.p.rapidapi.com';
const ONESHOT_FREE_HOST = 'oneshot.geomelon.dev';

const MISSING_KEY_MESSAGE =
  'This endpoint requires an API key: new GeomelonClient({ apiKey }). ' +
  'Get one at https://rapidapi.com/hom3chuk/api/geomelon. ' +
  'The oneshot autocomplete works without a key: client.oneshot.search(...)';

// Cloudflare on the free oneshot host rejects some default library
// user agents, so Node requests identify themselves explicitly.
// Browsers forbid setting User-Agent and would fail the whole request.
declare const process: { versions?: { node?: string } } | undefined;
const IS_NODE = typeof process !== 'undefined' && !!process?.versions?.node;

type Params = Record<string, string | number | boolean | undefined>;

function buildUrl(host: string, path: string, params?: Params): string {
  const url = new URL(`https://${host}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function seg(value: string): string {
  return encodeURIComponent(value);
}

function backoffMs(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 8000);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('The operation was aborted'));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error('The operation was aborted'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

interface TransportConfig {
  host: string;
  apiKey?: string;
  retries: number;
  timeoutMs?: number;
  /** When set, requests without an apiKey fail with this message. */
  missingKeyMessage?: string;
}

class Transport {
  constructor(private readonly config: TransportConfig) {}

  async request<T>(path: string, params?: Params, options?: RequestOptions): Promise<T> {
    const { host, apiKey, retries, missingKeyMessage } = this.config;
    if (!apiKey && missingKeyMessage) {
      throw new GeomelonError(missingKeyMessage);
    }
    const url = buildUrl(host, path, params);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (IS_NODE) {
      headers['User-Agent'] = `geomelon-ts/${VERSION}`;
    }
    if (apiKey) {
      headers['x-rapidapi-host'] = host;
      headers['x-rapidapi-key'] = apiKey;
    }

    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await this.fetchWithTimeout(url, headers, options);
      } catch (err) {
        // A caller-initiated abort is not retried and not wrapped.
        if (options?.signal?.aborted) throw err;
        if (attempt < retries) {
          await sleep(backoffMs(attempt), options?.signal);
          continue;
        }
        if (err instanceof GeomelonError) throw err;
        const reason = err instanceof Error ? err.message : String(err);
        throw new GeomelonError(`Geomelon API request failed: ${reason}`, { url, cause: err });
      }
      if (res.ok) {
        return res.json() as Promise<T>;
      }
      const body = await res.text().catch(() => '');
      if (attempt < retries && (res.status === 429 || res.status >= 500)) {
        await sleep(backoffMs(attempt), options?.signal);
        continue;
      }
      throw new GeomelonError(`Geomelon API error ${res.status}: ${body}`, {
        status: res.status,
        body,
        url,
      });
    }
  }

  private async fetchWithTimeout(
    url: string,
    headers: Record<string, string>,
    options?: RequestOptions,
  ): Promise<Response> {
    const timeoutMs = options?.timeoutMs ?? this.config.timeoutMs;
    const signal = options?.signal;
    if (timeoutMs === undefined) {
      return fetch(url, { headers, signal });
    }
    const controller = new AbortController();
    const onAbort = () => controller.abort(signal?.reason);
    if (signal) {
      if (signal.aborted) controller.abort(signal.reason);
      else signal.addEventListener('abort', onAbort, { once: true });
    }
    const timer = setTimeout(
      () =>
        controller.abort(
          new GeomelonError(`Geomelon API request timed out after ${timeoutMs} ms`, { url }),
        ),
      timeoutMs,
    );
    try {
      return await fetch(url, { headers, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }
}

class CitiesClient {
  constructor(private readonly transport: Transport) {}

  search(params?: SearchCitiesParams, options?: RequestOptions): Promise<CityDto[]> {
    return this.transport.request('/cities/search', params as unknown as Params, options);
  }

  get(id: string, options?: RequestOptions): Promise<CityDto> {
    return this.transport.request(`/cities/${seg(id)}`, undefined, options);
  }

  translations(id: string, options?: RequestOptions): Promise<CityTranslationDto[]> {
    return this.transport.request(`/cities/${seg(id)}/translations`, undefined, options);
  }

  settlementTypes(id: string, options?: RequestOptions): Promise<SettlementTypeDto[]> {
    return this.transport.request(`/cities/${seg(id)}/settlement-types`, undefined, options);
  }

  distance(city1: string, city2: string, options?: RequestOptions): Promise<DistanceDto> {
    return this.transport.request('/cities/distance', { city1, city2 }, options);
  }

  byCoordinatesClosest(params: ByCoordinatesParams, options?: RequestOptions): Promise<CityDto[]> {
    return this.transport.request(
      '/cities/byCoordinates/closest',
      params as unknown as Params,
      options,
    );
  }

  byCoordinatesLargest(params: ByCoordinatesParams, options?: RequestOptions): Promise<CityDto[]> {
    return this.transport.request(
      '/cities/byCoordinates/largest',
      params as unknown as Params,
      options,
    );
  }
}

class CountriesClient {
  constructor(private readonly transport: Transport) {}

  list(params?: ListCountriesParams, options?: RequestOptions): Promise<CountryDto[]> {
    return this.transport.request('/countries', params as unknown as Params, options);
  }

  get(id: string, options?: RequestOptions): Promise<CountryExtendedDto> {
    return this.transport.request(`/countries/${seg(id)}`, undefined, options);
  }

  translations(
    id: string,
    params?: TranslationsParams,
    options?: RequestOptions,
  ): Promise<CountryTranslationDto[]> {
    return this.transport.request(
      `/countries/${seg(id)}/translations`,
      params as unknown as Params,
      options,
    );
  }

  regions(id: string, options?: RequestOptions): Promise<RegionDto[]> {
    return this.transport.request(`/countries/${seg(id)}/regions`, undefined, options);
  }
}

class RegionsClient {
  constructor(private readonly transport: Transport) {}

  list(params?: ListRegionsParams, options?: RequestOptions): Promise<RegionDto[]> {
    return this.transport.request('/regions', params as unknown as Params, options);
  }

  get(id: string, options?: RequestOptions): Promise<RegionExtendedDto> {
    return this.transport.request(`/regions/${seg(id)}`, undefined, options);
  }

  translations(
    id: string,
    params?: TranslationsParams,
    options?: RequestOptions,
  ): Promise<RegionTranslationDto[]> {
    return this.transport.request(
      `/regions/${seg(id)}/translations`,
      params as unknown as Params,
      options,
    );
  }
}

class LanguagesClient {
  constructor(private readonly transport: Transport) {}

  list(params?: ListLanguagesParams, options?: RequestOptions): Promise<LanguageDto[]> {
    return this.transport.request('/languages', params as unknown as Params, options);
  }

  get(id: string, options?: RequestOptions): Promise<LanguageDto> {
    return this.transport.request(`/languages/${seg(id)}`, undefined, options);
  }
}

class OneshotClient {
  constructor(
    private readonly transport: Transport,
    private readonly basePath: string = '',
  ) {}

  /**
   * Prefix search against the pre-built oneshot files. `iso` is an
   * ISO 3166-1 alpha-2 country code, `lang` a BCP 47 language code (both
   * lowercased automatically), `prefix` the city-name prefix as the user
   * typed it — the server normalizes case, punctuation, and diacritics.
   */
  search(
    iso: string,
    lang: string,
    prefix: string,
    options?: RequestOptions,
  ): Promise<OneshotCityDto[]> {
    return this.transport.request(
      `${this.basePath}/${seg(iso.toLowerCase())}/${seg(lang.toLowerCase())}/${seg(prefix)}`,
      undefined,
      options,
    );
  }
}

/**
 * Entry point for the Geomelon API.
 *
 * ```ts
 * const client = new GeomelonClient({ apiKey: 'YOUR_RAPIDAPI_KEY' });
 * await client.cities.search({ name: 'barc', countryCode: 'ES' });
 * ```
 *
 * Without an API key only the free oneshot autocomplete is available:
 *
 * ```ts
 * const client = new GeomelonClient();
 * await client.oneshot.search('es', 'es', 'barc');
 * ```
 *
 * With a key, oneshot requests go through the RapidAPI gateway (and count
 * toward your plan); pass `freeOneshot: true` to route them to the free
 * keyless host instead.
 */
export class GeomelonClient {
  readonly cities: CitiesClient;
  readonly countries: CountriesClient;
  readonly regions: RegionsClient;
  readonly languages: LanguagesClient;
  readonly oneshot: OneshotClient;

  constructor(config: GeomelonClientConfig = {}) {
    const host = config.host ?? DEFAULT_HOST;
    const retries = config.retries ?? 0;
    const timeoutMs = config.timeoutMs;
    const transport = new Transport({
      host,
      apiKey: config.apiKey,
      retries,
      timeoutMs,
      missingKeyMessage: MISSING_KEY_MESSAGE,
    });
    this.cities = new CitiesClient(transport);
    this.countries = new CountriesClient(transport);
    this.regions = new RegionsClient(transport);
    this.languages = new LanguagesClient(transport);
    if (!config.apiKey || config.freeOneshot) {
      const freeTransport = new Transport({ host: ONESHOT_FREE_HOST, retries, timeoutMs });
      this.oneshot = new OneshotClient(freeTransport);
    } else {
      this.oneshot = new OneshotClient(transport, '/cities/oneshot');
    }
  }
}
