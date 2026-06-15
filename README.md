# dicom-forge-web

The web UI for **DICOM Forge** — a React single-page app for forging mutated/synthetic DICOM
test datasets. It drives the [`dicom-forge-api`](../dicom-forge-api) backend: scan folders,
pick a scenario, configure and submit jobs, watch live progress, and manage saved templates.

Built with React 19, Vite 8, TypeScript (strict), and Tailwind v4. It ships as a static SPA
served by nginx in Docker.

## Quick start (Docker)

The combined stack (Postgres + API + UI) starts with one command:

```powershell
cd deployment
docker compose up -d --build
```

Then open **http://localhost:8080**. The header shows the backend environment and connection
status; the API runs on http://localhost:8472.

To run just this UI against an already-running API, use the compose file in the project root:

```powershell
docker compose up -d --build
```

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173. The app talks to the API at `http://localhost:8472` by default —
start the backend separately, or change the endpoint in **Settings** (top-right gear).

Useful scripts:

| Script | Action |
|--------|--------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Type-check then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` (strict) |

## Configuration

- **`VITE_API_URL`** — the backend base URL baked into the bundle at build time (defaults to
  `http://localhost:8472`). In Docker it's set via the `VITE_API_URL` build arg.
- **Settings panel** — overrides the API base URL and API key at runtime; saved to
  `localStorage`, so it survives reloads without rebuilding.

## What you can do

- Browse the shared storage and scan a study (file counts, series, modalities).
- Run scenarios: **De-identify, Cohort multiply, Longitudinal, Multi-series, PACS stress,
  Malformed**, or run a **raw YAML config**.
- Name a job (the title becomes the output folder slug) and give it a description.
- Watch per-file progress live, then **Run again**, **Duplicate**, **Save as template**, or
  **Delete** a job (optionally removing its output folder).

## Project layout

See [CLAUDE.md](CLAUDE.md) for the component/module map and conventions.
