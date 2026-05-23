import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class GeomelonApi implements ICredentialType {
  name = 'geomelonApi';
  displayName = 'Geomelon API (RapidAPI)';
  documentationUrl = 'https://rapidapi.com/hom3chuk/api/geomelon';
  properties: INodeProperties[] = [
    {
      displayName: 'RapidAPI Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
      description: 'Your RapidAPI key for the Geomelon API',
    },
  ];

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://geomelon.p.rapidapi.com',
      url: '/countries',
      qs: { limit: 1 },
      headers: {
        'x-rapidapi-key': '={{$credentials.apiKey}}',
        'x-rapidapi-host': 'geomelon.p.rapidapi.com',
      },
    },
  };
}
