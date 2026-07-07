# sma-smaziphub

Front end for the StepMania AMX SMZIP download hub.

SMAMX Vault is a static prototype for browsing StepMania AMX simfile metadata and preparing QR-ready SMZIP downloads.

## Sections

- Summary: pack statistics, popular charts, rating placeholders, download placeholders, and difficulty spread.
- Database: searchable and filterable song catalog backed by `data/sample-database.json`.
- FAQ: deployment and QR format notes.

## Development

```powershell
npm install
npm run build
```

## GitHub Pages

This repo includes `.github/workflows/deploy-pages.yml`, which builds the Vite app and publishes `docs` through GitHub Actions.

In GitHub, open **Settings > Pages** and set **Build and deployment > Source** to **GitHub Actions**.

Alternatively, run `npm run build`, commit the generated `docs` folder, and set **Source** to **Deploy from a branch**, then choose `main` and `/docs`.

The root `index.html` is a Vite source file. Opening it directly from the repo or from `file://` will not run the app because the browser cannot execute `src/main.tsx` without the Vite build step.
