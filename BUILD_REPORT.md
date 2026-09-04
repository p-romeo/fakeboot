# BUILD_REPORT.md

Generated: 2026-09-04

## Build command

```bash
npm install && npm run build
```

**Result:** Success (exit code 0)

**Node:** v20 (compatible)

## Output directory

`/workspace/dist`

## File list

```
dist/
├── index.html
├── favicon.svg
└── assets/
    ├── index--Ydndz93.css
    └── index-oVrFZd_F.js
```

| File | Size (bytes) |
|------|-------------|
| `index.html` | 7,070 |
| `favicon.svg` | (public asset) |
| `assets/index--Ydndz93.css` | 232,140 |
| `assets/index-oVrFZd_F.js` | 516,210 |

Hashed asset filenames are produced by Vite at build time; re-run `npm run build` to regenerate.

## Build warnings

1. **Chunk size (>500 kB):** The bundled JS chunk (`index-oVrFZd_F.js`, ~516 kB) exceeds Vite's default warning threshold. This is expected — `vis-network` and `vis-data` are bundled from npm (no CDN). Acceptable for this investigation microsite; code-splitting is optional if size becomes a concern.

2. **npm notice:** npm reported a newer major version available (informational only; not a build failure).

## TypeScript

One type fix applied during build: vis-network edge `smooth` option requires `enabled: true` in current type definitions.

## Deploy

Not executed per requirements. To deploy manually:

```bash
npm run deploy
```

Custom domain: **fakeboot.paulromeo.net** (attach in Cloudflare Workers dashboard).
