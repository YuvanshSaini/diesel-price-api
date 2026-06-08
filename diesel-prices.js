require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

function sendSuccess(res, data) {
  res.json({
    success: true,
    source: "Goodreturns.in",
    fetchedAt: new Date().toISOString(),
    count: data.length,
    data,
  });
}

function sendError(res, statusCode, message) {
  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

async function fetchDieselPrices() {
  // Case 1: Goodreturns is down or unreachable
  let html;
  try {
    const response = await axios.get(
      "https://www.goodreturns.in/diesel-price-in-india.html",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        },
        timeout: 15000,
      },
    );
    html = response.data;
  } catch (err) {
    throw new Error("Unable to reach Goodreturns.in. Please try again later.");
  }

  // Parse the last table (state-wise), ignore first table (cities)
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
        $(cols[1])
          .text()
          .replace(/[^0-9.]/g, ""),
      );

      if (state && !isNaN(price) && price > 50 && price < 200) {
        results.push({ state, dieselPrice: price, unit: "INR/Litre" });
      }
    });

  // Case 2: Page loaded but table structure changed / no data parsed
  if (results.length === 0) {
    throw new Error(
      "Data unavailable. Goodreturns.in page structure may have changed.",
    );
  }

  const seen = new Set();
  return results.filter((s) => (seen.has(s.state) ? false : seen.add(s.state)));
}

app.get("/api/diesel", async (req, res) => {
  try {
    const data = await fetchDieselPrices();
    sendSuccess(res, data);
  } catch (err) {
    sendError(res, 503, err.message);
  }
});

app.get("/api/diesel/:state", async (req, res) => {
  try {
    const data = await fetchDieselPrices();
    const matches = data.filter((s) =>
      s.state.toLowerCase().includes(req.params.state.toLowerCase()),
    );
    // Case 3: State name not found
    if (matches.length === 0)
      return sendError(
        res,
        404,
        `"${req.params.state}" not found. Check the state name and try again.`,
      );

    res.json({
      success: true,
      source: "Goodreturns.in",
      fetchedAt: new Date().toISOString(),
      count: matches.length,
      data: matches,
    });
  } catch (err) {
    sendError(res, 503, err.message);
  }
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
