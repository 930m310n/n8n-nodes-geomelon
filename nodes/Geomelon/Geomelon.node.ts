import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { GeomelonClient } from 'geomelon';

export class Geomelon implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Geomelon',
    name: 'geomelon',
    icon: 'file:geomelon.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
    description: 'Geographic data — cities, countries, regions, and languages via the Geomelon API',
    defaults: { name: 'Geomelon' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'geomelonApi', required: true }],
    properties: [
      // ── Resource ──────────────────────────────────────────────────────────
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'City', value: 'city' },
          { name: 'Country', value: 'country' },
          { name: 'Language', value: 'language' },
          { name: 'Region', value: 'region' },
        ],
        default: 'city',
      },

      // ── City operations ───────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['city'] } },
        options: [
          {
            name: 'Search',
            value: 'search',
            description: 'Search cities by name, country, population range, and more',
            action: 'Search cities',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get full details for a city by UUID',
            action: 'Get a city',
          },
          {
            name: 'Get Translations',
            value: 'getTranslations',
            description: 'Get all name translations for a city',
            action: 'Get city translations',
          },
          {
            name: 'Get Settlement Types',
            value: 'getSettlementTypes',
            description: 'Get settlement-type classifications for a city',
            action: 'Get city settlement types',
          },
          {
            name: 'Distance',
            value: 'distance',
            description: 'Calculate the distance in kilometres between two cities',
            action: 'Get distance between two cities',
          },
          {
            name: 'By Coordinates (Closest)',
            value: 'byCoordinatesClosest',
            description: 'Find cities nearest to given coordinates, ordered by distance',
            action: 'Find closest cities by coordinates',
          },
          {
            name: 'By Coordinates (Largest)',
            value: 'byCoordinatesLargest',
            description: 'Find the largest cities near given coordinates, ordered by population',
            action: 'Find largest cities by coordinates',
          },
        ],
        default: 'search',
      },

      // ── Country operations ────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['country'] } },
        options: [
          {
            name: 'List',
            value: 'list',
            description: 'List countries with optional filtering',
            action: 'List countries',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get full details for a country by UUID',
            action: 'Get a country',
          },
          {
            name: 'Get Translations',
            value: 'getTranslations',
            description: 'Get name translations for a country',
            action: 'Get country translations',
          },
          {
            name: 'Get Regions',
            value: 'getRegions',
            description: 'Get all administrative regions belonging to a country',
            action: 'Get country regions',
          },
        ],
        default: 'list',
      },

      // ── Region operations ─────────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['region'] } },
        options: [
          {
            name: 'List',
            value: 'list',
            description: 'List administrative regions, optionally filtered by country',
            action: 'List regions',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get full details for a region by UUID',
            action: 'Get a region',
          },
          {
            name: 'Get Translations',
            value: 'getTranslations',
            description: 'Get name translations for a region',
            action: 'Get region translations',
          },
        ],
        default: 'list',
      },

      // ── Language operations ───────────────────────────────────────────────
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['language'] } },
        options: [
          {
            name: 'List',
            value: 'list',
            description: 'List languages available in Geomelon',
            action: 'List languages',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get details for a language by UUID',
            action: 'Get a language',
          },
        ],
        default: 'list',
      },

      // ══════════════════════════════════════════════════════════════════════
      // Fields — City
      // ══════════════════════════════════════════════════════════════════════

      // City: Search
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        description: 'City name prefix to search for',
        displayOptions: { show: { resource: ['city'], operation: ['search'] } },
      },
      {
        displayName: 'Country Code',
        name: 'countryCode',
        type: 'string',
        default: '',
        placeholder: 'US',
        description: 'ISO 3166-1 alpha-2 country code',
        displayOptions: { show: { resource: ['city'], operation: ['search'] } },
      },
      {
        displayName: 'Region ID',
        name: 'regionId',
        type: 'string',
        default: '',
        description: 'Filter by region UUID',
        displayOptions: { show: { resource: ['city'], operation: ['search'] } },
      },
      {
        displayName: 'Min Population',
        name: 'minPopulation',
        type: 'number',
        default: '',
        description: 'Minimum population filter',
        displayOptions: { show: { resource: ['city'], operation: ['search'] } },
      },
      {
        displayName: 'Max Population',
        name: 'maxPopulation',
        type: 'number',
        default: '',
        description: 'Maximum population filter',
        displayOptions: { show: { resource: ['city'], operation: ['search'] } },
      },
      {
        displayName: 'Sort',
        name: 'sort',
        type: 'options',
        options: [
          { name: 'Population Descending', value: 'population_desc' },
          { name: 'Population Ascending', value: 'population_asc' },
          { name: 'Name A → Z', value: 'name_asc' },
          { name: 'Name Z → A', value: 'name_desc' },
        ],
        default: 'population_desc',
        displayOptions: { show: { resource: ['city'], operation: ['search'] } },
      },
      {
        displayName: 'Preferred Languages',
        name: 'preferredLanguages',
        type: 'string',
        default: '',
        placeholder: 'fr,en',
        description: 'Comma-separated BCP 47 language tags for localized names',
        displayOptions: {
          show: {
            resource: ['city'],
            operation: ['search', 'byCoordinatesClosest', 'byCoordinatesLargest'],
          },
        },
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 100 },
        default: 20,
        description: 'Max number of results to return',
        displayOptions: { show: { resource: ['city'], operation: ['search'] } },
      },
      {
        displayName: 'Offset',
        name: 'offset',
        type: 'number',
        typeOptions: { minValue: 0 },
        default: 0,
        description: 'Pagination offset',
        displayOptions: { show: { resource: ['city'], operation: ['search'] } },
      },

      // City: Get / Get Translations / Get Settlement Types
      {
        displayName: 'City ID',
        name: 'cityId',
        type: 'string',
        default: '',
        required: true,
        description: 'UUID of the city',
        displayOptions: {
          show: {
            resource: ['city'],
            operation: ['get', 'getTranslations', 'getSettlementTypes'],
          },
        },
      },

      // City: Distance
      {
        displayName: 'City 1 ID',
        name: 'city1',
        type: 'string',
        default: '',
        required: true,
        description: 'UUID of the first city',
        displayOptions: { show: { resource: ['city'], operation: ['distance'] } },
      },
      {
        displayName: 'City 2 ID',
        name: 'city2',
        type: 'string',
        default: '',
        required: true,
        description: 'UUID of the second city',
        displayOptions: { show: { resource: ['city'], operation: ['distance'] } },
      },

      // City: By Coordinates
      {
        displayName: 'Latitude',
        name: 'lat',
        type: 'number',
        default: 0,
        required: true,
        description: 'Latitude of the reference point',
        displayOptions: {
          show: {
            resource: ['city'],
            operation: ['byCoordinatesClosest', 'byCoordinatesLargest'],
          },
        },
      },
      {
        displayName: 'Longitude',
        name: 'lon',
        type: 'number',
        default: 0,
        required: true,
        description: 'Longitude of the reference point',
        displayOptions: {
          show: {
            resource: ['city'],
            operation: ['byCoordinatesClosest', 'byCoordinatesLargest'],
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════════
      // Fields — Country
      // ══════════════════════════════════════════════════════════════════════

      // Country: List
      {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        description: 'Country name prefix to filter by',
        displayOptions: { show: { resource: ['country'], operation: ['list'] } },
      },
      {
        displayName: 'Telephone Code',
        name: 'telephoneCode',
        type: 'string',
        default: '',
        placeholder: '+1',
        description: 'Filter by dialing code',
        displayOptions: { show: { resource: ['country'], operation: ['list'] } },
      },
      {
        displayName: 'Preferred Languages',
        name: 'preferredLanguages',
        type: 'string',
        default: '',
        placeholder: 'fr,es,en',
        description: 'Comma-separated BCP 47 language tags for localized names',
        displayOptions: {
          show: {
            resource: ['country'],
            operation: ['list', 'getTranslations'],
          },
        },
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 500 },
        default: 50,
        description: 'Max number of results to return',
        displayOptions: { show: { resource: ['country'], operation: ['list'] } },
      },
      {
        displayName: 'Offset',
        name: 'offset',
        type: 'number',
        typeOptions: { minValue: 0 },
        default: 0,
        description: 'Pagination offset',
        displayOptions: { show: { resource: ['country'], operation: ['list'] } },
      },

      // Country: Get / Get Translations / Get Regions
      {
        displayName: 'Country ID',
        name: 'countryId',
        type: 'string',
        default: '',
        required: true,
        description: 'UUID of the country',
        displayOptions: {
          show: {
            resource: ['country'],
            operation: ['get', 'getTranslations', 'getRegions'],
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════════
      // Fields — Region
      // ══════════════════════════════════════════════════════════════════════

      // Region: List
      {
        displayName: 'Country ID',
        name: 'countryId',
        type: 'string',
        default: '',
        description: 'Filter regions by country UUID',
        displayOptions: { show: { resource: ['region'], operation: ['list'] } },
      },

      // Region: Get / Get Translations
      {
        displayName: 'Region ID',
        name: 'regionId',
        type: 'string',
        default: '',
        required: true,
        description: 'UUID of the region',
        displayOptions: {
          show: {
            resource: ['region'],
            operation: ['get', 'getTranslations'],
          },
        },
      },
      {
        displayName: 'Preferred Languages',
        name: 'preferredLanguages',
        type: 'string',
        default: '',
        placeholder: 'fr,es,en',
        description: 'Comma-separated BCP 47 language tags',
        displayOptions: {
          show: {
            resource: ['region'],
            operation: ['getTranslations'],
          },
        },
      },

      // ══════════════════════════════════════════════════════════════════════
      // Fields — Language
      // ══════════════════════════════════════════════════════════════════════

      // Language: List
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 500 },
        default: 50,
        description: 'Max number of results to return',
        displayOptions: { show: { resource: ['language'], operation: ['list'] } },
      },
      {
        displayName: 'Offset',
        name: 'offset',
        type: 'number',
        typeOptions: { minValue: 0 },
        default: 0,
        description: 'Pagination offset',
        displayOptions: { show: { resource: ['language'], operation: ['list'] } },
      },

      // Language: Get
      {
        displayName: 'Language ID',
        name: 'languageId',
        type: 'string',
        default: '',
        required: true,
        description: 'UUID of the language',
        displayOptions: { show: { resource: ['language'], operation: ['get'] } },
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const credentials = await this.getCredentials('geomelonApi');
    const client = new GeomelonClient({ apiKey: credentials.apiKey as string });

    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    for (let i = 0; i < items.length; i++) {
      const resource = this.getNodeParameter('resource', i) as string;
      const operation = this.getNodeParameter('operation', i) as string;

      try {
        let result: unknown;

        if (resource === 'city') {
          if (operation === 'search') {
            const params: Record<string, unknown> = {};
            const name = this.getNodeParameter('name', i, '') as string;
            const countryCode = this.getNodeParameter('countryCode', i, '') as string;
            const regionId = this.getNodeParameter('regionId', i, '') as string;
            const minPopulation = this.getNodeParameter('minPopulation', i, '') as number | string;
            const maxPopulation = this.getNodeParameter('maxPopulation', i, '') as number | string;
            const sort = this.getNodeParameter('sort', i) as string;
            const preferredLanguages = this.getNodeParameter('preferredLanguages', i, '') as string;
            const limit = this.getNodeParameter('limit', i) as number;
            const offset = this.getNodeParameter('offset', i) as number;
            if (name) params.name = name;
            if (countryCode) params.countryCode = countryCode;
            if (regionId) params.regionId = regionId;
            if (minPopulation !== '' && minPopulation !== undefined) params.minPopulation = Number(minPopulation);
            if (maxPopulation !== '' && maxPopulation !== undefined) params.maxPopulation = Number(maxPopulation);
            if (sort) params.sort = sort;
            if (preferredLanguages) params.preferredLanguages = preferredLanguages;
            params.limit = limit;
            params.offset = offset;
            result = await client.cities.search(params as Parameters<typeof client.cities.search>[0]);
          } else if (operation === 'get') {
            const id = this.getNodeParameter('cityId', i) as string;
            result = await client.cities.get(id);
          } else if (operation === 'getTranslations') {
            const id = this.getNodeParameter('cityId', i) as string;
            result = await client.cities.translations(id);
          } else if (operation === 'getSettlementTypes') {
            const id = this.getNodeParameter('cityId', i) as string;
            result = await client.cities.settlementTypes(id);
          } else if (operation === 'distance') {
            const city1 = this.getNodeParameter('city1', i) as string;
            const city2 = this.getNodeParameter('city2', i) as string;
            result = await client.cities.distance(city1, city2);
          } else if (operation === 'byCoordinatesClosest') {
            const lat = this.getNodeParameter('lat', i) as number;
            const lon = this.getNodeParameter('lon', i) as number;
            const preferredLanguages = this.getNodeParameter('preferredLanguages', i, '') as string;
            const params = { lat, lon, ...(preferredLanguages ? { preferredLanguages } : {}) };
            result = await client.cities.byCoordinatesClosest(params);
          } else if (operation === 'byCoordinatesLargest') {
            const lat = this.getNodeParameter('lat', i) as number;
            const lon = this.getNodeParameter('lon', i) as number;
            const preferredLanguages = this.getNodeParameter('preferredLanguages', i, '') as string;
            const params = { lat, lon, ...(preferredLanguages ? { preferredLanguages } : {}) };
            result = await client.cities.byCoordinatesLargest(params);
          }
        } else if (resource === 'country') {
          if (operation === 'list') {
            const params: Record<string, unknown> = {};
            const name = this.getNodeParameter('name', i, '') as string;
            const telephoneCode = this.getNodeParameter('telephoneCode', i, '') as string;
            const preferredLanguages = this.getNodeParameter('preferredLanguages', i, '') as string;
            const limit = this.getNodeParameter('limit', i) as number;
            const offset = this.getNodeParameter('offset', i) as number;
            if (name) params.name = name;
            if (telephoneCode) params.telephoneCode = telephoneCode;
            if (preferredLanguages) params.preferredLanguages = preferredLanguages;
            params.limit = limit;
            params.offset = offset;
            result = await client.countries.list(params as Parameters<typeof client.countries.list>[0]);
          } else if (operation === 'get') {
            const id = this.getNodeParameter('countryId', i) as string;
            result = await client.countries.get(id);
          } else if (operation === 'getTranslations') {
            const id = this.getNodeParameter('countryId', i) as string;
            const preferredLanguages = this.getNodeParameter('preferredLanguages', i, '') as string;
            result = await client.countries.translations(
              id,
              preferredLanguages ? { preferredLanguages } : undefined,
            );
          } else if (operation === 'getRegions') {
            const id = this.getNodeParameter('countryId', i) as string;
            result = await client.countries.regions(id);
          }
        } else if (resource === 'region') {
          if (operation === 'list') {
            const countryId = this.getNodeParameter('countryId', i, '') as string;
            result = await client.regions.list(countryId ? { countryId } : undefined);
          } else if (operation === 'get') {
            const id = this.getNodeParameter('regionId', i) as string;
            result = await client.regions.get(id);
          } else if (operation === 'getTranslations') {
            const id = this.getNodeParameter('regionId', i) as string;
            const preferredLanguages = this.getNodeParameter('preferredLanguages', i, '') as string;
            result = await client.regions.translations(
              id,
              preferredLanguages ? { preferredLanguages } : undefined,
            );
          }
        } else if (resource === 'language') {
          if (operation === 'list') {
            const limit = this.getNodeParameter('limit', i) as number;
            const offset = this.getNodeParameter('offset', i) as number;
            result = await client.languages.list({ limit, offset });
          } else if (operation === 'get') {
            const id = this.getNodeParameter('languageId', i) as string;
            result = await client.languages.get(id);
          }
        }

        if (result === undefined) {
          throw new NodeOperationError(
            this.getNode(),
            `Unknown operation "${operation}" for resource "${resource}"`,
            { itemIndex: i },
          );
        }

        const items = Array.isArray(result) ? result : [result];
        for (const item of items) {
          returnData.push({ json: item as IDataObject, pairedItem: { item: i } });
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: (error as Error).message },
            pairedItem: { item: i },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
