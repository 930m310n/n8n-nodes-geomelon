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
import type { INode, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { VERSION } from './version';

/**
 * A single HTTP call, shaped to match n8n's `this.helpers.httpRequest`
 * closely enough to pass straight through — see the adapter built in
 * `Geomelon.node.ts`. n8n's helper owns timeout/abort handling internally,
 * which is why this client no longer touches timers itself (see README).
 */
export interface HttpRequestOptions {
  url: string;
  headers: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
}
export type HttpRequestFn = (options: HttpRequestOptions) => Promise<unknown>;

export interface GeomelonClientConfig {
  /**
   * RapidAPI key. Optional: without it only the free keyless oneshot
   * autocomplete is available — every other endpoint throws NodeApiError.
   */
  apiKey?: string;
  host?: string;
  /**
   * Route oneshot requests to the free keyless host
   * (oneshot.geomelon.dev) even when an apiKey is configured, so they
   * don't count toward your RapidAPI plan.
   */
  freeOneshot?: boolean;
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
  'This endpoint requires an API key: new GeomelonClient(httpRequest, { apiKey }). ' +
  'Get one at https://rapidapi.com/hom3chuk/api/geomelon. ' +
  'The oneshot autocomplete works without a key: client.oneshot.search(...)';

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

function errorStatus(err: unknown): number | undefined {
  const e = err as { response?: { status?: number }; statusCode?: number; httpCode?: string | number };
  if (typeof e?.response?.status === 'number') return e.response.status;
  if (typeof e?.statusCode === 'number') return e.statusCode;
  if (e?.httpCode !== undefined) return Number(e.httpCode);
  return undefined;
}

function errorBody(err: unknown): string | undefined {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data === undefined) return undefined;
  return typeof data === 'string' ? data : JSON.stringify(data);
}

interface TransportConfig {
  host: string;
  apiKey?: string;
  timeoutMs?: number;
  /** When set, requests without an apiKey fail with this message. */
  missingKeyMessage?: string;
}

class Transport {
  constructor(
    private readonly node: INode,
    private readonly httpRequest: HttpRequestFn,
    private readonly config: TransportConfig,
  ) {}

  async request<T>(path: string, params?: Params, options?: RequestOptions): Promise<T> {
    const { host, apiKey, missingKeyMessage } = this.config;
    if (!apiKey && missingKeyMessage) {
      throw new NodeApiError(this.node, { message: missingKeyMessage } as JsonObject, {
        message: missingKeyMessage,
      });
    }
    const url = buildUrl(host, path, params);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': `geomelon-n8n/${VERSION}`,
    };
    if (apiKey) {
      headers['x-rapidapi-host'] = host;
      headers['x-rapidapi-key'] = apiKey;
    }

    try {
      return (await this.httpRequest({
        url,
        headers,
        timeout: options?.timeoutMs ?? this.config.timeoutMs,
        signal: options?.signal,
      })) as T;
    } catch (err) {
      const status = errorStatus(err);
      const body = errorBody(err);
      const reason = err instanceof Error ? err.message : String(err);
      throw new NodeApiError(this.node, { message: reason, body: body ?? null, url } as JsonObject, {
        message:
          status !== undefined ? `Geomelon API error ${status}` : 'Geomelon API request failed',
        description: body ?? reason,
        httpCode: status !== undefined ? String(status) : undefined,
      });
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
 * Entry point for the Geomelon API. Unlike the standalone `geomelon` npm
 * client this is forked from, requests are not made directly — the caller
 * supplies an `httpRequest` function (in this package, an adapter over
 * n8n's `this.helpers.httpRequest`, see `Geomelon.node.ts`).
 *
 * ```ts
 * const client = new GeomelonClient(this.getNode(), httpRequest, { apiKey: 'YOUR_RAPIDAPI_KEY' });
 * await client.cities.search({ name: 'barc', countryCode: 'ES' });
 * ```
 *
 * Without an API key only the free oneshot autocomplete is available:
 *
 * ```ts
 * const client = new GeomelonClient(this.getNode(), httpRequest);
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

  constructor(node: INode, httpRequest: HttpRequestFn, config: GeomelonClientConfig = {}) {
    const host = config.host ?? DEFAULT_HOST;
    const timeoutMs = config.timeoutMs;
    const transport = new Transport(node, httpRequest, {
      host,
      apiKey: config.apiKey,
      timeoutMs,
      missingKeyMessage: MISSING_KEY_MESSAGE,
    });
    this.cities = new CitiesClient(transport);
    this.countries = new CountriesClient(transport);
    this.regions = new RegionsClient(transport);
    this.languages = new LanguagesClient(transport);
    if (!config.apiKey || config.freeOneshot) {
      const freeTransport = new Transport(node, httpRequest, { host: ONESHOT_FREE_HOST, timeoutMs });
      this.oneshot = new OneshotClient(freeTransport);
    } else {
      this.oneshot = new OneshotClient(transport, '/cities/oneshot');
    }
  }
}
