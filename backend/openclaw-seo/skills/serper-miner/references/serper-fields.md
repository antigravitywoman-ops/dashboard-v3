# Serper.dev API — Response Schema Reference

Used by `serper-miner` skill.

## Endpoint

```
POST https://google.serper.dev/search
Content-Type: application/json
X-API-KEY: <SERPER_API_KEY>
```

## Request Body

```json
{
  "q": "<target keyword>",
  "gl": "us",
  "hl": "en",
  "num": 10,
  "type": "search"
}
```

| Field | Description |
|---|---|
| `q` | Target keyword string |
| `gl` | Country code (`us`, `gb`, `au`, `ca`, `in`) |
| `hl` | Language code (`en`, `fr`, `de`) |
| `num` | Number of results (max 100) |

## Response Fields

### `organic` Array (Core)

| Field | Type | Description |
|---|---|---|
| `position` | integer | SERP rank (1–10) |
| `title` | string | Page title |
| `link` | string | Full URL |
| `snippet` | string | Meta description shown in SERP |
| `domain` | string | Root domain |
| `sitelinks` | object | Sub-links shown under result (optional) |
| `date` | string | Published/updated date if shown |

### `peopleAlsoAsk` Array

| Field | Type | Description |
|---|---|---|
| `question` | string | The PAA question text |
| `snippet` | string | Short answer text |
| `title` | string | Source page title |
| `link` | string | Source URL |

### `relatedSearches` Array

| Field | Type | Description |
|---|---|---|
| `query` | string | Related search suggestion |

### `knowledgeGraph` Object (if present)

| Field | Type | Description |
|---|---|---|
| `title` | string | Entity name |
| `type` | string | Entity type (e.g. "City") |
| `description` | string | Short description |

## DA (Domain Authority) Note

Serper.dev does **not** return DA. If DA is needed, call Moz or Ahrefs API separately.
The legacy `estimatedDA` field in stub data must be removed in the real implementation.

## Required .env Variable

| Variable | Description |
|---|---|
| `SERPER_API_KEY` | API key from https://serper.dev/dashboard |
