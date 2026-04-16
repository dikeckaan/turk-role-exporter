# Scraper Notes

## Skyvector (Airband) — Not feasible via HTML scraping

**Status:** `parseAirbandHtml` in `scrapers.js` stays as a stub that throws `"not-implemented"`. The `handleProtectedDataset` orchestrator in `worker/index.js` catches the throw and serves `AIRBAND_FALLBACK` from `worker/fallback-data.js`.

**Investigation (2026-04-16):**
- Fetched `https://skyvector.com/airport/LTFM/Istanbul-Airport` with a realistic browser User-Agent, following redirects.
- Response was 51 KB of HTML but contained **zero airband frequencies** (VHF 108-137 MHz range), no `ATIS` / `Tower` / `Ground` strings, and no three-digit decimal numbers.
- Page does contain an `ajax` reference — frequency data is rendered **client-side** via JavaScript after an XHR fetch to an internal endpoint not discoverable from static HTML.

**Consequences:**
- We cannot parse airband frequencies from skyvector using Cloudflare Workers (which have no DOM/JS execution).
- The airband feature ships with the embedded `AIRBAND_FALLBACK` snapshot as the sole data source. This is functionally correct today — users see the full UI cascade, selections persist, and CSV export works.
- When the snapshot goes stale (airports change frequencies), the fallback must be refreshed manually. Options for the future:

**Alternatives considered:**

1. **OurAirports.com free CSV dataset** (https://ourairports.com/data/) — provides `airport-frequencies.csv` covering ~60k+ airports worldwide. Licence: CC0. A worker could fetch `airport-frequencies.csv` (~10 MB) filter by ICAO prefix `LT` for Turkey, and parse it. **Recommended** if live data becomes required.
2. **AIP Turkey extract** (eAIP published by DHMI) — authoritative but complex, PDF-based.
3. **Headless-browser scraping of skyvector** — not feasible from CF Worker runtime.

**Decision:** Keep static fallback. If and when live data is needed, Task 7 should be re-opened as an OurAirports CSV parser (different fetcher + parser implementation; schema target and state UI remain unchanged).

## ta1dx (Marine) — See Task 8

`parseMarineHtml` is implemented in `scrapers.js` via Task 8. ta1dx.qsl.net serves static HTML, so the scraper works.
