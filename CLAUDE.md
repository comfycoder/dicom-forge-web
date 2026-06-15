# CLAUDE.md — dicom-forge-web

## Project Overview

**dicom-forge-web** is the DICOM Forge UI — a React single-page app that drives the
[`dicom-forge-api`](../dicom-forge-api) backend (scan folders, configure scenarios, submit
jobs, stream progress, manage saved templates).

> Despite the folder's history (it began as an Electron prototype and was renamed from
> `dicom-forge-electron`), there is **no Electron** here anymore — it's a plain Vite SPA
> served as static files (by nginx in Docker). Treat it as a web app.

## Stack

React 19 · Vite 8 · TypeScript (strict) · Tailwind v4 (`@tailwindcss/vite`) · Radix Dialog ·
shadcn-style UI primitives · `lucide-react` · `class-variance-authority` + `clsx` + `tailwind-merge`.

## Repository Layout

```
index.html               # SPA entry
vite.config.ts           # react() + tailwindcss() plugins
src/
  main.tsx               # React root
  App.tsx                # Top-level view router (nav state, openJob/editJob/useTemplate)
  index.css              # Tailwind v4 theme (@theme tokens: success/warning/danger/…)
  components/
    AppShell.tsx         # Header (env badge from /api/health + storage) + side nav
    Dashboard.tsx
    ScenarioPicker.tsx   # Cards from lib/scenarios.ts
    Wizard.tsx           # Details → Source → Configure|Tags → Output → Review
    ScenarioConfig.tsx   # Per-scenario param inputs (spec scenarios)
    TagEditor.tsx        # Inline tag-mutation rows
    JobsList.tsx         # Jobs table (+ row delete)
    JobDetail.tsx        # Live SSE progress, Run again / Duplicate / Save as template / Delete
    TemplatesView.tsx    # Built-in + saved templates
    Settings.tsx         # API base URL / key (persisted to localStorage)
    FolderField.tsx, StorageFolderBrowser.tsx, ScanSummaryCard.tsx, ValidationPanel.tsx
    ui/                  # shadcn-style primitives: button, badge, card, dialog, input,
                         #   textarea, select, progress, clearable-input
  lib/
    api.ts               # Typed fetch client + SSE (via fetch streaming) + DTOs
    config.ts            # getApiConfig/setApiConfig (localStorage) + STORAGE_ROOT
    scenarios.ts         # SCENARIOS catalogue for the picker
    mutations.ts         # rows ⇄ MutationSet helpers, template resolution
    utils.ts             # cn() classname helper
Dockerfile               # node:24-slim build → nginx:alpine serve (static SPA)
nginx.conf               # SPA fallback + asset caching
docker-compose.yml       # Standalone UI service (port 8080)
deployment/              # Combined one-command stack (db + api + ui) + .env
```

## Development Setup

```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173
npm run typecheck  # tsc --noEmit (strict)
npm run build      # tsc --noEmit && vite build → dist/
```

The dev server expects the API at `http://localhost:8472` (start the backend separately, or
point Settings at a running instance).

## Architecture & Conventions

- **No router library.** `App.tsx` holds the active view in state and passes callbacks
  (`openJob`, `editJob`, `useTemplate`). Navigating back to the list remounts it (auto-refresh).
- **All backend access goes through `lib/api.ts`.** It's a typed `fetch` wrapper that injects
  `X-API-Key` when configured and surfaces `{status} {detail}` errors. Progress uses **SSE over
  `fetch` streaming** (`streamJob`), not native `EventSource` (so the API key header can be sent).
  Keep the DTOs in `api.ts` in sync with the FastAPI `schemas.py` wire contract.
- **API endpoint is runtime-configurable.** Default comes from `VITE_API_URL` (baked at build
  time, see Dockerfile `ARG`), overridable at runtime via **Settings** (stored in `localStorage`).
- **Storage paths are relative** to the backend storage root (`STORAGE_ROOT = /mnt/storage`);
  the backend rejects absolute/`..` paths. The folder pickers browse via `/api/browse`.
- **Wizard title → output folder.** The Details step's title is slugified (lowercase,
  underscores) to default the output folder (`outputs/<slug>`); editing the Output step pins it.
- **UI primitives** live in `components/ui` (CVA variants). Reuse them; theme colors are CSS
  variables registered in `index.css` (`text-success`, `bg-danger/10`, etc.). When adding a
  color utility, confirm the `--color-*` token exists there first.
- **TypeScript is strict** — keep `npm run typecheck` clean (the Docker build runs `tsc` and
  fails on type errors).

## Scenarios

The picker (`lib/scenarios.ts`) offers: `deidentify`, `cohort`, `longitudinal`, `multi_series`,
`pacs_stress`, `malformed` (each routed to the API as a `scenario_spec`), plus `raw_config`
(runs an existing YAML config). The Wizard renders a scenario-specific Configure step for spec
scenarios and a Tags step for raw/inline mutations.

## Docker

Multi-stage build: `node:24-slim` builds the bundle, `nginx:alpine` serves `dist/` on port 80
(`nginx.conf` provides SPA fallback). Image tag `dicom-forge-ui:local`, published on `8080`.
Prefer the combined stack at `deployment/docker-compose.yml` (builds the API from `../../dicom-forge-api`
and this app from `..`).
