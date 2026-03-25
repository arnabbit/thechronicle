# Backend API Plan

Base URL: `https://fayz-news-backend.onrender.com`

Two endpoints used.

---

## GET `/api/categories`

Response (11 categories live):

```json
{
  "categories": [
    { "name": "Home", "slug": "home" },
    { "name": "Politics", "slug": "politics" },
    { "name": "World", "slug": "world" },
    { "name": "Sports", "slug": "sports" },
    { "name": "Economy", "slug": "economy" },
    { "name": "Technology", "slug": "technology" },
    { "name": "Entertainment", "slug": "entertainment" },
    { "name": "Science", "slug": "science" },
    { "name": "Health", "slug": "health" },
    { "name": "Legal", "slug": "legal" },
    { "name": "Environment", "slug": "environment" }
  ]
}
```

---

## GET `/api/articles?page=1&per_page=10&category=politics`

Query params:
- `page` — int, default 1
- `per_page` — int, default 10
- `category` — string (slug), optional. Omit or `home` for all categories.

Response:

```json
{
  "articles": [
    {
      "id": "a1b2c3",
      "headline": "Global Summit Ends in Unprecedented Consensus",
      "published_date": "October 14, 1984",
      "category": "Politics",
      "body": [
        "First paragraph text...",
        "Second paragraph text...",
        "Third paragraph text..."
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 47,
    "has_next": true,
    "next_page": 2
  }
}
```

### Field notes

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique article ID |
| `headline` | string | Article title |
| `published_date` | string | Human-readable date |
| `category` | string | Display name (capitalized) |
| `body` | string[] | Each element = one paragraph |
| `pagination.has_next` | bool | Controls infinite scroll |
| `pagination.next_page` | int/null | Null when no more pages |

---

## Unresolved questions

- Auth needed? Token/API key?
- Rate limit on articles endpoint?
- `published_date` — human string or ISO 8601 (frontend formats)?
- `body` — support HTML/markdown or plain text only?
- Sort order — newest first? Configurable?
- Category list static or dynamic?
- Article detail page needed or full body always in list?
