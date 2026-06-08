require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

let cache = { data: null, lastUpdated: null };

async function fetchDieselPrices() {
  let html;

  // Case 1: Goodreturns is down or unreachable
  try {
    const response = await axios.get(
      "https://www.goodreturns.in/diesel-price-in-india.html",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        },
        timeout: 15000,
      }
    );
    html = response.data;
  } catch (err) {
    throw new Error("Unable to reach Goodreturns.in. Please try again later.");
  }

  const $ = cheerio.load(html);
  const results = [];

  $("table")
    .last()
    .find("tbody tr")
    .each((_, row) => {
      const cols = $(row).find("td");
      if (cols.length < 2) return;

      const state = $(cols[0]).text().trim();
      const price = parseFloat(
        $(cols[1]).text().replace(/[^0-9.]/g, "")
      );

      if (state && !isNaN(price) && price > 50 && price < 200) {
        results.push({ state, dieselPrice: price, unit: "INR/Litre" });
      }
    });

  // Case 2: Page loaded but table structure changed / no data parsed
  if (results.length === 0) {
    throw new Error("Data unavailable. Goodreturns.in page structure may have changed.");
  }

  const seen = new Set();
  return results.filter((s) => (seen.has(s.state) ? false : seen.add(s.state)));
}

app.get("/api/diesel", async (req, res) => {
  try {
    if (!cache.data) {
      cache.data = await fetchDieselPrices();
      cache.lastUpdated = new Date().toISOString();
    }
    res.json({
      success: true,
      source: "Goodreturns.in",
      lastUpdated: cache.lastUpdated,
      count: cache.data.length,
      data: cache.data,
    });
  } catch (err) {
    // Case 3: Cache is empty and fetch failed — nothing to serve
    res.status(503).json({
      success: false,
      error: err.message,
      message: "Service temporarily unavailable. Try again shortly.",
    });
  }
});

app.get("/api/diesel/:state", async (req, res) => {
  try {
    if (!cache.data) {
      cache.data = await fetchDieselPrices();
      cache.lastUpdated = new Date().toISOString();
    }
    const match = cache.data.find((s) =>
      s.state.toLowerCase().includes(req.params.state.toLowerCase())
    );
    // Case 4: State name not found
    if (!match)
      return res.status(404).json({
        success: false,
        error: `"${req.params.state}" not found. Check the state name and try again.`,
      });
    res.json({
      success: true,
      source: "Goodreturns.in",
      lastUpdated: cache.lastUpdated,
      data: match,
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: err.message,
      message: "Service temporarily unavailable. Try again shortly.",
    });
  }
});

app.post("/api/refresh", async (req, res) => {
  try {
    cache.data = await fetchDieselPrices();
    cache.lastUpdated = new Date().toISOString();
    res.json({
      success: true,
      message: "Cache refreshed",
      lastUpdated: cache.lastUpdated,
    });
  } catch (err) {
    // Case 5: Refresh failed — keep serving stale cache if available
    if (cache.data) {
      return res.status(200).json({
        success: false,
        error: err.message,
        message: "Refresh failed. Serving cached data from last successful fetch.",
        lastUpdated: cache.lastUpdated,
      });
    }
    res.status(503).json({
      success: false,
      error: err.message,
      message: "Refresh failed and no cached data available.",
    });
  }
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
