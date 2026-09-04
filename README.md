# Fakeboot

**The social graph of fake shoe-repair storefronts**

A Paul Romeo third-party investigation microsite documenting an impersonation ecommerce network. Public recon only — victim shop owners are not operators.

## Stack

- Vite + TypeScript (vanilla)
- vis-network / vis-data for the interactive graph
- Cloudflare Workers static assets via Wrangler

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (default port 5173).

## Build

```bash
npm run build
```

Output goes to `dist/`.

## Deploy

```bash
npm run deploy
```

This runs `npm run build` then `wrangler deploy`.

> **Note:** CoS (Cloudflare) will deploy via the CF API in production workflows. For a custom domain, attach **fakeboot.paulromeo.net** to the Worker in the Cloudflare dashboard (Workers & Pages → fakeboot → Settings → Domains & Routes).

## Deep links

Shop detail panels support hash routes:

```
https://fakeboot.paulromeo.net/#shop=veronaleathershoe.com
```

## Project structure

```
├── index.html
├── public/favicon.svg
├── src/
│   ├── data.ts      # Canonical investigation data
│   ├── graph.ts     # vis-network graph
│   ├── main.ts      # App bootstrap & UI
│   └── style.css
├── vite.config.ts
├── wrangler.jsonc
└── package.json
```

## License

Investigation documentation — all shop and payment host data from public recon.
