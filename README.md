# CVE Signal

An arcade-inspired web app for browsing CVE disclosures from the [cve.now RSS feed](https://cve.now/feed). Search the feed, filter entries by publication date, and sort by newest, oldest, or title.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Run the checks:

```sh
npm test
npm run lint
npm run build
```

## Architecture

This is a small client-side React + TypeScript app built with Vite:

- `src/lib/cveFeed.ts` owns feed transport and RSS parsing. It maps RSS entries to a typed `CveItem` model and reports invalid responses explicitly.
- `src/lib/cveList.ts` contains the pure search, date filtering, and sorting logic, separate from rendering.
- `src/App.tsx` owns feed lifecycle and UI state; the visual system lives in `src/App.css` and `src/index.css`.
- Vitest tests cover feed normalization and list filtering/sorting.

The browser currently fetches `https://cve.now/feed` directly; the feed allows cross-origin requests, so no backend is needed for the current experience. If that changes, or the app needs shared caching, rate limiting, or secrets, add a small same-origin API proxy between the browser and the upstream feed. Keep XML parsing and normalization behind the feed-client boundary so that this change does not affect the UI.

The source feed currently supplies identifiers, titles, links, publication dates, and descriptions. The UI intentionally does not invent severity scores or other fields that the feed does not provide.
