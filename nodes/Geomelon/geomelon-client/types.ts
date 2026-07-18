// Vendored from lib/typescript/src/types.ts — see ./README.md for why.

export interface CityTranslation {
  language: string;
  name: string;
}

export interface CityDto {
  id: string;
  wikidataId: string;
  name: string;
  localizedName: string;
  normalizedName: string;
  population?: number;
  latitude?: number;
  longitude?: number;
  elevation?: number;
  area?: number;
  postalCode?: string;
  officialWebsite?: string;
  timeZone?: string;
  flagImage?: string;
  dialingCode?: string;
  translations: CityTranslation[];
  distanceKm?: number;
  countryId: string;
  countryName: string;
  countryCode: string;
  countryEmoji: string;
  countryTelephoneCode?: string;
  regionName: string;
  regionCode: string;
  regionId: string;
}

export interface DistanceDto {
  distanceKm: number;
}

export interface CityTranslationDto {
  id: string;
  cityId: string;
  language: string;
  name: string;
  nameNormalized: string;
}

export interface SettlementTypeDto {
  id: string;
  wikidataId: string;
  name: string;
  nameNormalized: string;
  description: string;
}

export interface CountryDto {
  id: string;
  wikidataId: string;
  name: string;
  localizedName?: string;
  emoji: string;
  headOfState?: string;
  headOfGovernment?: string;
  isoCode: string;
  telephoneCode?: string;
  trunkPrefix?: string;
  licencePlateCode?: string;
  drivingSide?: string;
  preferredLanguageId?: string;
}

export interface CountryTranslationDto {
  id: string;
  countryId: string;
  language: string;
  name: string;
  nameNormalized: string;
}

export interface RegionDto {
  id: string;
  wikidataId: string;
  name: string;
  countryId: string;
  population?: number;
  code: string;
  latitude?: number;
  longitude?: number;
}

export interface CountryExtendedDto extends CountryDto {
  translations: CountryTranslationDto[];
  regions: RegionDto[];
}

export interface RegionExtendedDto extends RegionDto {
  country: CountryDto;
}

export interface RegionTranslationDto {
  id: string;
  regionId: string;
  language: string;
  name: string;
  nameNormalized: string;
}

export interface LanguageDto {
  id: string;
  wikidataId: string;
  name: string;
  isoCode: string;
  citiesCount: number;
}

export interface SearchCitiesParams {
  name?: string;
  countryCode?: string;
  regionId?: string;
  minPopulation?: number;
  maxPopulation?: number;
  sort?: 'population_desc' | 'population_asc' | 'name_asc' | 'name_desc';
  preferredLanguages?: string;
  limit?: number;
  offset?: number;
}

export interface ByCoordinatesParams {
  lat: number;
  lon: number;
  preferredLanguages?: string;
}

export interface ListCountriesParams {
  limit?: number;
  offset?: number;
  telephoneCode?: string;
  name?: string;
  preferredLanguages?: string;
}

export interface TranslationsParams {
  preferredLanguages?: string;
}

export interface ListLanguagesParams {
  limit?: number;
  offset?: number;
}

export interface ListRegionsParams {
  countryId?: string;
}

export interface OneshotCityDto {
  id: string;
  name: string;
  population: number | null;
  emoji: string | null;
  en?: string;
}
