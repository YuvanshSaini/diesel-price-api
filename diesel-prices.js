require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

let cache = { data: null, lastUpdated: null };

async function fetchDieselPrices() {
  const { data: html } = await axios.get(
    "https://www.goodreturns.in/diesel-price-in-india.html",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
      },
      timeout: 15000,
    }
  );

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
    res.status(500).json({ success: false, error: err.message });
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
    if (!match)
      return res.status(404).json({ success: false, error: "State not found" });
    res.json({ success: true, source: "Goodreturns.in", lastUpdated: cache.lastUpdated, data: match });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
