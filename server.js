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

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Referer": "https://frontier.com/buy",
  "Origin": "https://frontier.com",
};

app.get("/", (req, res) => res.json({ status: "ok" }));
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/predictive", async (req, res) => {
  const address = req.query.address;
  if (!address) return res.status(400).json({ error: "Missing address" });
  try {
    const url = `https://frontier.com/ol/api/v2/serviceability/predictive?address=${encodeURIComponent(address)}`;
    const r = await fetch(url, { headers: COMMON_HEADERS });
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
        ...COMMON_HEADERS,
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
