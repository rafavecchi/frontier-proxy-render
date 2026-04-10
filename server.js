/**
 * Render Web Service — Frontier API proxy
 * Routes:
 *   GET  /predictive?address=...
 *   POST /serviceability  body: {addressKey, env, controlNumber, rawUserString, writeKey}
 */
const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "1mb" }));

// Rotate User-Agent per request to avoid WAF fingerprinting on a single UA.
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

function buildHeaders() {
  return {
    "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://frontier.com/buy",
    "Origin": "https://frontier.com",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
  };
}

app.get("/", (req, res) => res.json({ status: "ok" }));
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/predictive", async (req, res) => {
  const address = req.query.address;
  if (!address) return res.status(400).json({ error: "Missing address" });
  try {
    const url = `https://frontier.com/ol/api/v2/serviceability/predictive?address=${encodeURIComponent(address)}`;
    const r = await fetch(url, { headers: buildHeaders() });
    const text = await r.text();
    res.set("Content-Type", "application/json");
    res.set("Access-Control-Allow-Origin", "*");
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

app.post("/serviceability", async (req, res) => {
  const { addressKey, env, controlNumber, rawUserString, writeKey } = req.body || {};
  if (!addressKey || !writeKey) {
    return res.status(400).json({ error: "Missing addressKey or writeKey" });
  }
  try {
    const r = await fetch("https://frontier.com/ol/api/v3/serviceability", {
      method: "POST",
      headers: {
        ...buildHeaders(),
        "Content-Type": "application/json",
        "x-write-key": writeKey,
        "x-client-session-id": crypto.randomUUID(),
      },
      body: JSON.stringify({
        address: { addressKey, env, controlNumber },
        rawUserString: rawUserString || "",
      }),
    });
    const text = await r.text();
    res.set("Content-Type", "application/json");
    res.set("Access-Control-Allow-Origin", "*");
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`frontier-proxy listening on ${PORT}`));
