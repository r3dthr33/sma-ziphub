# SMAMX Vault

Static prototype for browsing StepMania AMX simfile metadata and preparing QR-ready SMZIP downloads.

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

This repo includes `.github/workflows/deploy-pages.yml`, which builds the Vite app and publishes `dist` through GitHub Actions.

In GitHub, open **Settings > Pages** and set **Build and deployment > Source** to **GitHub Actions**.
