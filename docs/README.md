# Atlas AI Docs

This folder is organized by module. Read the overview first, then drill down into the module you’re working in.

## Start here

- `00-PROJECT-OVERVIEW.md` — What the project is, how the desktop + mobile pieces fit together.
- `01-MONOREPO-SETUP.md` — Dev prerequisites and how to run each app.

## Desktop modules (`atlas-desktop/`)

- `02-ELECTRON-DESKTOP.md` — Electron main/preload/sidecar responsibilities.
- `03-FASTIFY-API-SERVER.md` — API surface used by desktop UI + mobile desktop provider.
- `04-DATABASE.md` — Desktop SQLite schema and persistence model.
- `06-DESKTOP-UI.md` — Next.js renderer, state, and streaming UX.
- `DESKTOP.md` — Desktop summary + links.

## Mobile modules (`atlas-mobile/`)

- `07-MOBILE-APP.md` — App structure, provider split, and UI shell.
- `08-MODEL-MANAGEMENT.md` — Desktop (Ollama) vs mobile (GGUF) model management.
- `10-SETTINGS.md` — Provider-aware settings and persistence.
- `MOBILE.md` — Mobile summary + links.

## Cross-cutting

- `05-SHARED-TYPES.md` — Where “shared” types live today (and how to keep them aligned).
- `09-BUILD-DISTRIBUTION.md` — Dev builds vs release builds; Android APK/AAB notes.
- `11-BUILD-PLAN.md` — Current status + next milestones.
- `12-AI-IDE-RULES.md` — Project rules and guardrails.
- `13-TROUBLESHOOTING.md` — Common build/runtime problems and fixes.
- `14-MEMORY-RAG.md` — Memory system: keyword-based RAG for personalized conversations.

