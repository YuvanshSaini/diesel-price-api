# Diesel Price API

Fetches live diesel prices for all 28 states and 8 UTs in India.  
Source: Goodreturns.in

## Setup
npm install
node diesel-prices.js

## Dependencies
- express
- axios
- cheerio
- dotenv

## Endpoints
GET  /api/diesel           → all 36 states & UTs
GET  /api/diesel/:state    → single state (e.g. /api/diesel/haryana)
POST /api/refresh          → force refresh cache

## Notes
- Prices update daily at 6:00 AM IST as per government regulation
- Data is cached in memory after first request for fast responses
- Use POST /api/refresh to fetch latest prices without restarting the server
