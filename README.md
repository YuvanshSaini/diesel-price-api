# Diesel Price API

Fetches live diesel prices for all 28 states and 8 Union Territories in India.

**Source:** Goodreturns.in

## Setup

```bash
npm install
node diesel-prices.js
```

## Dependencies

- express
- axios
- cheerio
- dotenv

## Endpoints

### Get all states & UTs

```http
GET /api/diesel
```

Returns diesel prices for all 36 States and Union Territories.

### Get a single state

```http
GET /api/diesel/:state
```

Example:

```http
GET /api/diesel/haryana
```

### Refresh cached data

```http
POST /api/refresh
```

Forces a refresh of the cached diesel price data.

## Notes

- Prices update daily at **6:00 AM IST** as per government regulations.
- Data is cached in memory after the first request for faster responses.
- Use `POST /api/refresh` to fetch the latest prices without restarting the server.
