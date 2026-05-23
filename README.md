# n8n-nodes-geomelon

[n8n](https://n8n.io) community node for the **[Geomelon](https://geomelon.dev) geographic API** — search cities, look up countries and regions, compute distances, and resolve coordinates, all with multilingual name support.

## Installation

In your n8n instance: **Settings → Community Nodes → Install** → enter `n8n-nodes-geomelon`.

Requires n8n v1.0+ and Node.js 18+.

## Credentials

The node uses a **Geomelon API (RapidAPI)** credential. You need a RapidAPI key subscribed to the [Geomelon API](https://rapidapi.com/hom3chuk/api/geomelon).

1. Create a credential of type **Geomelon API (RapidAPI)**
2. Paste your RapidAPI key into the **RapidAPI Key** field

## Resources and Operations

### City

| Operation | Description |
|---|---|
| **Search** | Search cities by name prefix, country code, region, population range, with sort and pagination |
| **Get** | Get full details for a city by UUID |
| **Get Translations** | Get all available name translations for a city |
| **Get Settlement Types** | Get settlement-type classifications (city, town, village, …) |
| **Distance** | Calculate the distance in kilometres between two cities |
| **By Coordinates (Closest)** | Find cities nearest to a lat/lon point, ordered by distance |
| **By Coordinates (Largest)** | Find the largest cities near a lat/lon point, ordered by population |

### Country

| Operation | Description |
|---|---|
| **List** | List countries with optional name, telephone code, and language filters |
| **Get** | Get full details (including regions and translations) for a country by UUID |
| **Get Translations** | Get name translations for a country |
| **Get Regions** | Get all administrative regions belonging to a country |

### Region

| Operation | Description |
|---|---|
| **List** | List regions, optionally filtered by country UUID |
| **Get** | Get full details for a region by UUID |
| **Get Translations** | Get name translations for a region |

### Language

| Operation | Description |
|---|---|
| **List** | List languages available in the Geomelon database |
| **Get** | Get details for a language by UUID |

## Output

- **List / Search** operations output one item per result, so downstream nodes can iterate naturally.
- **Get** and single-result operations output one item.
- The **Distance** operation outputs `{ distanceKm: number }`.

## Example Workflows

**Find the 10 largest cities in France with French names**
1. Geomelon → City: Search → `countryCode = FR`, `preferredLanguages = fr`, `sort = population_desc`, `limit = 10`

**Look up a city by coordinates**
1. Geomelon → City: By Coordinates (Closest) → `lat = 48.8566`, `lon = 2.3522`

**Get all regions of Germany**
1. Geomelon → Country: List → `name = Germany`, `limit = 1`
2. Geomelon → Country: Get Regions → `countryId = {{ $json.id }}`

## License

MIT
